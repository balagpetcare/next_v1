"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicPatchServicePricing,
  staffClinicListServiceMedia,
  staffClinicPutServiceMedia,
  staffClinicGetServiceById,
} from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace, PageHeader, SectionCard, LoadingState } from "@/src/components/dashboard";
import { Button, Form } from "react-bootstrap";
import { staffServicePricingCatalogPath } from "@/src/lib/staffServicePricingRoutes";
import ServicesPricingNav from "./ServicesPricingNav";

const PERMS = [
  "clinic.services.manage",
  "clinic.appointments.manage",
  "clinic.appointments.read",
  "manager.pricing.view",
];

export default function StaffServiceContentClient() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const serviceId = useMemo(() => Number(params?.serviceId), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = PERMS.some((p) => permissions.includes(p));
  const canEdit = permissions.includes("clinic.services.manage") || permissions.includes("clinic.appointments.manage");

  const [prep, setPrep] = useState("");
  const [after, setAfter] = useState("");
  const [faqText, setFaqText] = useState("[]");
  const [mediaIds, setMediaIds] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [serviceMissing, setServiceMissing] = useState(false);

  const catalogHref = staffServicePricingCatalogPath(branchId);

  const load = useCallback(async () => {
    if (!branchId || !hasAccess || !Number.isFinite(serviceId)) return;
    setLoading(true);
    setError("");
    setServiceMissing(false);
    try {
      const [svc, items] = await Promise.all([
        staffClinicGetServiceById(branchId, serviceId),
        staffClinicListServiceMedia(branchId, serviceId),
      ]);
      setMediaList(items);
      if (svc) {
        setServiceMissing(false);
        setPrep(svc.preparationNotes ?? "");
        setAfter(svc.aftercareNotes ?? "");
        setFaqText(svc.faqJson != null ? JSON.stringify(svc.faqJson, null, 2) : "[]");
      } else {
        setServiceMissing(true);
        setPrep("");
        setAfter("");
        setFaqText("[]");
      }
      setMediaIds(items.map((m: any) => m.mediaId).filter(Boolean).join(" "));
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [branchId, hasAccess, serviceId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveContent = async () => {
    if (!canEdit || !Number.isFinite(serviceId)) return;
    setSaving(true);
    setError("");
    try {
      let faqJson: unknown = null;
      try {
        faqJson = JSON.parse(faqText || "[]");
      } catch {
        throw new Error("FAQ must be valid JSON array");
      }
      await staffClinicPatchServicePricing(branchId, serviceId, {
        preparationNotes: prep || null,
        aftercareNotes: after || null,
        faqJson,
        reason: "Service content update",
      });
      const ids = mediaIds
        .split(/[\s,]+/)
        .map((s) => parseInt(s, 10))
        .filter((n) => Number.isFinite(n));
      const items = ids.map((mediaId, i) => ({ mediaId, kind: "GALLERY", sortOrder: i }));
      await staffClinicPutServiceMedia(branchId, serviceId, items);
      await load();
    } catch (e) {
      setError((e as Error)?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (ctxLoading) {
    return (
      <PageWorkspace>
        <LoadingState message="Loading..." />
      </PageWorkspace>
    );
  }

  if (!branch || !Number.isFinite(serviceId)) {
    return (
      <PageWorkspace>
        <LoadingState message="Loading…" />
      </PageWorkspace>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        title="Service content"
        message="You need at least one of: clinic.services.manage, clinic.appointments.manage, clinic.appointments.read, or manager.pricing.view."
        missingPerm="Services & Pricing (content)"
        onBack={() => router.push(catalogHref)}
      />
    );
  }

  return (
    <PageWorkspace>
      <div className="px-1">
        <ServicesPricingNav />
      </div>
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <PageHeader
        title={`Service #${serviceId} — content & media`}
        subtitle="Preparation, aftercare, FAQ JSON, and ordered media IDs"
      />
      <div className="mb-3">
        <Link href={catalogHref} className="btn btn-outline-secondary btn-sm radius-8">
          ← Catalog
        </Link>
      </div>

      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}
      {!loading && serviceMissing && !error && (
        <div className="alert alert-warning radius-12 mb-3" role="status">
          This service ID is not on the branch list (removed or wrong link). You can still edit media if the API allows; otherwise return to the catalog.
        </div>
      )}

      <SectionCard title="Content">
        {loading ? (
          <LoadingState message="Loading service content…" />
        ) : (
          <div className="d-flex flex-column gap-3">
            <Form.Group>
              <Form.Label>Preparation notes</Form.Label>
              <Form.Control as="textarea" rows={3} value={prep} onChange={(e) => setPrep(e.target.value)} disabled={!canEdit} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Aftercare notes</Form.Label>
              <Form.Control as="textarea" rows={3} value={after} onChange={(e) => setAfter(e.target.value)} disabled={!canEdit} />
            </Form.Group>
            <Form.Group>
              <Form.Label>FAQ JSON (array)</Form.Label>
              <Form.Control as="textarea" rows={4} value={faqText} onChange={(e) => setFaqText(e.target.value)} disabled={!canEdit} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Media IDs (space or comma separated)</Form.Label>
              <Form.Control
                value={mediaIds}
                onChange={(e) => setMediaIds(e.target.value)}
                disabled={!canEdit}
                placeholder="e.g. 12 34 56"
              />
              <div className="form-text">
                Uses existing uploaded <code>Media</code> IDs; order = display order.
              </div>
            </Form.Group>
            {canEdit && (
              <Button variant="primary" className="align-self-start radius-8" onClick={saveContent} disabled={saving}>
                {saving ? "Saving…" : "Save content & media order"}
              </Button>
            )}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Current media links" className="mt-3">
        {mediaList.length === 0 ? (
          <div className="text-muted small">No media attached.</div>
        ) : (
          <ul className="mb-0 small">
            {mediaList.map((m: any) => (
              <li key={m.id}>
                #{m.mediaId} — {m.kind} — {m.media?.url ?? "—"}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </PageWorkspace>
  );
}
