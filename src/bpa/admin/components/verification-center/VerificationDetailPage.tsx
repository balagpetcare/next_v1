"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";
import AdminPageShell from "@/src/bpa/admin/components/AdminPageShell";
import SectionCard from "@/src/bpa/admin/components/SectionCard";
import StatusChip from "@/src/bpa/admin/components/StatusChip";
import DocGrid from "@/src/bpa/admin/components/DocGrid";
import TimelineView from "@/src/bpa/admin/components/TimelineView";
import CommentThread from "@/src/bpa/admin/components/CommentThread";
import DecisionPanel from "@/src/bpa/admin/components/DecisionPanel";
import {
  VERIFICATION_ENTITY_CONFIG,
  VerificationEntityKey,
  getVerificationListHref,
} from "./config";

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="d-flex justify-content-between gap-3 py-1">
      <span className="text-secondary small">{label}</span>
      <span className="fw-semibold text-end">{String(value ?? "—")}</span>
    </div>
  );
}

function toDateText(value: unknown) {
  if (!value) return "—";
  try {
    return new Date(String(value)).toLocaleString();
  } catch {
    return String(value);
  }
}

function getEndpoints(entityKey: VerificationEntityKey, id: number) {
  if (entityKey === "owners") {
    const base = `/api/v1/admin/verifications/owners/${id}`;
    return { detail: base, base, comment: `${base}/comment` };
  }
  if (entityKey === "organizations") {
    const base = `/api/v1/admin/verifications/organizations/${id}`;
    return { detail: base, base, comment: `${base}/comment` };
  }
  if (entityKey === "branches") {
    const base = `/api/v1/admin/verifications/branches/${id}`;
    return { detail: base, base, comment: `${base}/comment` };
  }
  if (entityKey === "staff") {
    const base = `/api/v1/admin/verifications/staff/${id}`;
    return { detail: base, base, comment: `${base}/comment` };
  }
  if (entityKey === "producer_orgs") {
    const base = `/api/v1/admin/verifications/producer-orgs/${id}`;
    return { detail: base, base, comment: `${base}/comment` };
  }
  const base = `/api/v1/admin/verifications/doctors/${id}`;
  return { detail: base, base, comment: null };
}

function buildOverview(entityKey: VerificationEntityKey, row: Record<string, unknown>) {
  if (entityKey === "owners") {
    const user = row.user as Record<string, unknown> | undefined;
    const auth = user?.auth as Record<string, unknown> | undefined;
    return (
      <div className="d-flex flex-column gap-1">
        <Field label="Full name" value={row.fullName} />
        <Field label="Phone" value={row.mobile || auth?.phone} />
        <Field label="Email" value={row.email || auth?.email} />
        <Field label="NID" value={row.nidNumber} />
        <Field label="Submitted" value={toDateText(row.submittedAt)} />
      </div>
    );
  }
  if (entityKey === "organizations") {
    const org = row.organization as Record<string, unknown> | undefined;
    return (
      <div className="d-flex flex-column gap-1">
        <Field label="Organization" value={row.organizationName || org?.name} />
        <Field label="Trade License" value={row.tradeLicenseNumber} />
        <Field label="TIN / BIN" value={[row.tinNumber, row.binNumber].filter(Boolean).join(" / ") || "—"} />
        <Field label="Owner User ID" value={org?.ownerUserId} />
        <Field label="Submitted" value={toDateText(row.submittedAt)} />
      </div>
    );
  }
  if (entityKey === "branches") {
    const branch = row.branch as Record<string, unknown> | undefined;
    return (
      <div className="d-flex flex-column gap-1">
        <Field label="Branch" value={branch?.name} />
        <Field label="Organization ID" value={branch?.orgId} />
        <Field label="Manager" value={row.managerName} />
        <Field label="Submitted" value={toDateText(row.submittedAt)} />
      </div>
    );
  }
  if (entityKey === "staff") {
    const user = row.user as Record<string, unknown> | undefined;
    const auth = user?.auth as Record<string, unknown> | undefined;
    const branch = row.branch as Record<string, unknown> | undefined;
    return (
      <div className="d-flex flex-column gap-1">
        <Field label="Full name" value={row.fullName} />
        <Field label="Phone" value={row.phone || auth?.phone} />
        <Field label="Email" value={auth?.email} />
        <Field label="Branch" value={branch?.name} />
        <Field label="Status" value={row.status} />
      </div>
    );
  }
  if (entityKey === "producer_orgs") {
    const owner = row.owner as Record<string, unknown> | undefined;
    const auth = owner?.auth as Record<string, unknown> | undefined;
    return (
      <div className="d-flex flex-column gap-1">
        <Field label="Organization" value={row.name} />
        <Field label="Status" value={row.status} />
        <Field label="Owner" value={owner?.id || row.ownerUserId} />
        <Field label="Email" value={auth?.email} />
        <Field label="Phone" value={auth?.phone} />
        <Field label="Country" value={row.countryCode} />
      </div>
    );
  }
  const user = row.user as Record<string, unknown> | undefined;
  const auth = user?.auth as Record<string, unknown> | undefined;
  return (
    <div className="d-flex flex-column gap-1">
      <Field label="User ID" value={row.userId} />
      <Field label="Phone" value={auth?.phone} />
      <Field label="Email" value={auth?.email} />
      <Field label="Primary country" value={row.primaryCountryCode} />
      <Field label="License no." value={row.licenseNumber} />
      <Field label="NID" value={row.nidNumber} />
      <Field label="Submitted" value={toDateText(row.submittedAt)} />
      <Field label="Review note" value={row.reviewNote} />
    </div>
  );
}

function getDetailTitle(entityKey: VerificationEntityKey, detail: Record<string, unknown>, id: number) {
  if (entityKey === "owners") return String(detail.fullName || `Owner #${id}`);
  if (entityKey === "organizations") {
    const org = detail.organization as Record<string, unknown> | undefined;
    return String(detail.organizationName || org?.name || `Organization #${id}`);
  }
  if (entityKey === "branches") {
    const branch = detail.branch as Record<string, unknown> | undefined;
    return String(branch?.name || `Branch #${id}`);
  }
  if (entityKey === "staff") return String(detail.fullName || `Staff #${id}`);
  if (entityKey === "producer_orgs") return String(detail.name || `Producer #${id}`);
  return `Doctor verification #${id}`;
}

export default function VerificationDetailPage({
  entityKey,
  id,
}: {
  entityKey: VerificationEntityKey;
  id: number;
}) {
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const config = VERIFICATION_ENTITY_CONFIG[entityKey];
  const endpoints = useMemo(() => getEndpoints(entityKey, id), [entityKey, id]);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiGet<{ data?: Record<string, unknown> }>(endpoints.detail);
      setDetail(response?.data ?? null);
    } catch (e) {
      setError((e as Error)?.message || "Failed to load verification details");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [endpoints.detail]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const logs = ((detail?.logs as unknown[]) || []) as Array<{
    id: number | string;
    action: string;
    createdAt: string;
    note?: string;
  }>;
  const documents = ((detail?.documents as unknown[]) || []) as Array<Record<string, unknown>>;
  const licenses = ((detail?.licenses as unknown[]) || []) as Array<{
    id: number;
    licenseNumber: string;
    regulatoryBody?: { name?: string | null; abbreviation?: string | null; verificationUrl?: string | null };
    documents?: Array<Record<string, unknown>>;
    expiryDate?: string | null;
    issueDate?: string | null;
  }>;

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "documents", label: "Documents" },
    ...(entityKey === "doctors" ? [{ key: "licenses", label: "Licenses" }] : []),
    { key: "activity", label: "Activity" },
    ...(endpoints.comment ? [{ key: "notes", label: "Notes" }] : []),
  ];

  const content = useMemo(() => {
    if (!detail) return <div className="text-secondary">No details found.</div>;
    if (activeTab === "overview") return buildOverview(entityKey, detail);
    if (activeTab === "documents") {
      return documents.length ? (
        <DocGrid documents={documents} />
      ) : (
        <div className="text-secondary">No documents uploaded.</div>
      );
    }
    if (activeTab === "licenses" && entityKey === "doctors") {
      if (!licenses.length) return <div className="text-secondary">No licenses found.</div>;
      return (
        <div className="d-flex flex-column gap-3">
          {licenses.map((license) => (
            <div key={license.id} className="card">
              <div className="card-body">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                  <div>
                    <div className="fw-semibold">
                      {license.regulatoryBody?.abbreviation ||
                        license.regulatoryBody?.name ||
                        "License"}
                    </div>
                    <div className="text-secondary small">{license.licenseNumber}</div>
                  </div>
                  <div className="d-flex gap-2">
                    <span className="badge bg-light text-dark">
                      Expiry: {toDateText(license.expiryDate)}
                    </span>
                    {license.regulatoryBody?.verificationUrl ? (
                      <a
                        href={license.regulatoryBody.verificationUrl}
                        className="btn btn-sm btn-outline-primary"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Verify online
                      </a>
                    ) : null}
                  </div>
                </div>
                <DocGrid documents={license.documents || []} />
              </div>
            </div>
          ))}
        </div>
      );
    }
    if (activeTab === "activity") return <TimelineView logs={logs} />;
    if (activeTab === "notes") {
      return (
        <CommentThread
          comments={logs
            .filter((log) => ["COMMENT", "INTERNAL_NOTE"].includes(log.action))
            .map((log) => ({
              id: log.id,
              author: "Admin",
              createdAt: toDateText(log.createdAt),
              text: log.note || "",
            }))}
          onSend={async (text) => {
            if (!endpoints.comment) return;
            await apiPost(endpoints.comment, { comment: text });
            await loadDetail();
          }}
        />
      );
    }
    return <div className="text-secondary">No content.</div>;
  }, [
    detail,
    activeTab,
    entityKey,
    documents,
    licenses,
    logs,
    endpoints.comment,
    loadDetail,
  ]);

  const title = detail ? getDetailTitle(entityKey, detail, id) : `Review #${id}`;

  return (
    <AdminPageShell
      title={`${config.label} Verification Review`}
      breadcrumbs={[
        { label: "Governance" },
        { label: "Verification Center", href: "/admin/verifications" },
        { label: config.label, href: getVerificationListHref(entityKey) },
        { label: title },
      ]}
      actions={
        <Link href={getVerificationListHref(entityKey)} className="btn btn-sm btn-outline-secondary">
          Back to queue
        </Link>
      }
    >
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <div className="row g-3">
        <div className="col-12 col-xl-4">
          <SectionCard title="Profile Summary">
            {loading ? (
              <div className="text-secondary">Loading...</div>
            ) : detail ? (
              <>
                <div className="mb-2">
                  <StatusChip status={String(detail.verificationStatus || detail.status || "")} />
                </div>
                {buildOverview(entityKey, detail)}
              </>
            ) : (
              <div className="text-secondary">No details found.</div>
            )}
          </SectionCard>

          <SectionCard title="Recent Timeline" className="mt-3">
            <TimelineView logs={logs.slice(0, 6)} emptyMessage="No recent actions." />
          </SectionCard>
        </div>

        <div className="col-12 col-xl-8">
          <div className="card radius-12 h-100 d-flex flex-column">
            <div className="card-header bg-transparent d-flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`btn btn-sm ${activeTab === tab.key ? "btn-primary" : "btn-outline-secondary"}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="card-body flex-grow-1">{loading ? <div className="text-secondary">Loading...</div> : content}</div>

            <div className="border-top bg-light p-3 position-sticky bottom-0">
              <DecisionPanel
                basePath={endpoints.base}
                allowedActions={
                  entityKey === "doctors"
                    ? ["approve", "reject"]
                    : ["approve", "request-changes", "reject", "suspend"]
                }
                onDone={async () => {
                  await loadDetail();
                }}
                loading={loading}
              />
            </div>
          </div>
        </div>
      </div>
    </AdminPageShell>
  );
}
