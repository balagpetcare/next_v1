"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ownerClinicPackageTemplateById,
  ownerClinicPackageTemplateUpdate,
} from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import ClinicConsoleTabs from "@/app/owner/_components/clinic/ClinicConsoleTabs";

export default function PackageTemplateEditPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const templateId = params?.templateId as string | undefined;
  const [template, setTemplate] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [packageName, setPackageName] = useState("");
  const [surgeryType, setSurgeryType] = useState("");
  const [itemsJsonStr, setItemsJsonStr] = useState("[]");

  useEffect(() => {
    if (!branchId || !templateId) return;
    let mounted = true;
    ownerClinicPackageTemplateById(branchId, templateId)
      .then((data) => {
        if (!mounted) return;
        setTemplate(data ?? null);
        if (data) {
          setPackageName(String((data as Record<string, unknown>).packageName ?? ""));
          setSurgeryType(String((data as Record<string, unknown>).surgeryType ?? ""));
          const items = (data as Record<string, unknown>).itemsJson;
          setItemsJsonStr(typeof items === "string" ? items : JSON.stringify(items ?? [], null, 2));
        }
      })
      .catch((e) => {
        if (mounted) setError((e as Error)?.message ?? "Failed to load");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [branchId, templateId]);

  const handleSave = async () => {
    if (!branchId || !templateId) return;
    let itemsJson: unknown;
    try {
      itemsJson = JSON.parse(itemsJsonStr);
    } catch {
      setError("Invalid JSON in items");
      return;
    }
    try {
      setSaving(true);
      setError("");
      await ownerClinicPackageTemplateUpdate(branchId, templateId, {
        packageName: packageName.trim(),
        surgeryType: surgeryType.trim() || null,
        itemsJson,
      });
      const updated = await ownerClinicPackageTemplateById(branchId, templateId);
      setTemplate(updated ?? null);
      if (updated) setItemsJsonStr(JSON.stringify((updated as Record<string, unknown>).itemsJson ?? [], null, 2));
    } catch (e) {
      setError((e as Error)?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!branchId || !templateId) {
    return <div className="dashboard-main-body"><div className="alert alert-warning radius-12">Invalid branch or template.</div></div>;
  }
  if (loading) {
    return (
      <div className="dashboard-main-body">
        <div className="card radius-12"><div className="card-body text-center py-5"><div className="spinner-border text-primary" /><p className="text-muted mt-2 mb-0">Loading…</p></div></div>
      </div>
    );
  }
  if (!template) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">Template not found.</div>
        <Link href={`/owner/clinic/${branchId}/packages/templates`} className="btn btn-outline-primary radius-12 mt-2">Back to templates</Link>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title={String(template.packageName ?? "Template")}
        subtitle="Edit package template"
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Packages", href: `/owner/clinic/${branchId}/packages` },
          { label: "Templates", href: `/owner/clinic/${branchId}/packages/templates` },
          { label: String(template.packageName ?? templateId), href: `/owner/clinic/${branchId}/packages/templates/${templateId}` },
        ]}
        actions={[
          <Link key="back" href={`/owner/clinic/${branchId}/packages/templates`} className="btn btn-outline-secondary radius-12">Back to templates</Link>,
        ]}
      />
      <ClinicConsoleTabs branchId={branchId} />

      <div className="card radius-12">
        <div className="card-body p-24">
          {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}
          <div className="mb-3">
            <label className="form-label">Template name</label>
            <input type="text" className="form-control radius-8" value={packageName} onChange={(e) => setPackageName(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className="form-label">Surgery type</label>
            <input type="text" className="form-control radius-8" value={surgeryType} onChange={(e) => setSurgeryType(e.target.value)} placeholder="e.g. Spay, Castration" />
          </div>
          <div className="mb-3">
            <label className="form-label">Items JSON (variantId, minDose, maxDose, unit, weightBand?)</label>
            <textarea className="form-control radius-8 font-monospace small" rows={10} value={itemsJsonStr} onChange={(e) => setItemsJsonStr(e.target.value)} spellCheck={false} />
          </div>
          <button type="button" className="btn btn-primary radius-8" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
