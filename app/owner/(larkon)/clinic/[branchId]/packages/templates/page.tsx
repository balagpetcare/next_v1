"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ownerClinicPackageTemplatesList,
  ownerClinicPackageTemplateCreate,
  ownerClinicPackageTemplateDelete as deleteTemplate,
} from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import ClinicConsoleTabs from "@/app/owner/_components/clinic/ClinicConsoleTabs";

type TemplateRow = {
  id: number;
  packageName: string;
  surgeryType?: string | null;
  serviceId?: number | null;
  itemsJson: unknown;
  service?: { id: number; name: string };
};

export default function PackageTemplatesPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const [list, setList] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createSaving, setCreateSaving] = useState(false);

  const load = async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      setError("");
      const data = await ownerClinicPackageTemplatesList(branchId);
      setList((data ?? []) as TemplateRow[]);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [branchId]);

  const handleCreate = async () => {
    if (!branchId || !createName.trim()) return;
    try {
      setCreateSaving(true);
      setError("");
      await ownerClinicPackageTemplateCreate(branchId, {
        packageName: createName.trim(),
        itemsJson: [],
      });
      setCreateName("");
      setShowCreate(false);
      await load();
    } catch (e) {
      setError((e as Error)?.message ?? "Create failed");
    } finally {
      setCreateSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!branchId || !confirm(`Delete template "${name}"?`)) return;
    try {
      setError("");
      await deleteTemplate(branchId, id);
      await load();
    } catch (e) {
      setError((e as Error)?.message ?? "Delete failed");
    }
  };

  if (!branchId) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">Invalid branch.</div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Package templates"
        subtitle="Org-level surgery package templates for consumption tracking"
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Packages", href: `/owner/clinic/${branchId}/packages` },
          { label: "Templates", href: `/owner/clinic/${branchId}/packages/templates` },
        ]}
        actions={[
          <Link key="packages" href={`/owner/clinic/${branchId}/packages`} className="btn btn-outline-primary radius-12">
            <i className="ri-box-3-line me-1" /> All packages
          </Link>,
          <button key="new" type="button" className="btn btn-primary radius-12" onClick={() => setShowCreate(true)}>
            <i className="ri-add-line me-1" /> New template
          </button>,
        ]}
      />
      <ClinicConsoleTabs branchId={branchId} />

      <div className="card radius-12">
        <div className="card-body p-24">
          {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
              <p className="text-muted mt-2 mb-0">Loading templates…</p>
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted mb-3">No package templates. Create one to define expected consumption (variantId, doses) for surgery.</p>
              <button type="button" className="btn btn-primary radius-12" onClick={() => setShowCreate(true)}>
                <i className="ri-add-line me-1" /> New template
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Name</th>
                    <th>Service</th>
                    <th>Surgery type</th>
                    <th>Items (JSON)</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row) => (
                    <tr key={row.id}>
                      <td className="fw-medium">{row.packageName}</td>
                      <td>{row.service?.name ?? "—"}</td>
                      <td>{row.surgeryType ?? "—"}</td>
                      <td className="small">
                        {Array.isArray(row.itemsJson) ? (
                          <span>{(row.itemsJson as unknown[]).length} item(s)</span>
                        ) : (
                          <code className="small">—</code>
                        )}
                      </td>
                      <td className="text-end">
                        <Link href={`/owner/clinic/${branchId}/packages/templates/${row.id}`} className="btn btn-sm btn-outline-primary radius-8 me-1">
                          Edit
                        </Link>
                        <button type="button" className="btn btn-sm btn-outline-danger radius-8" onClick={() => handleDelete(row.id, row.packageName)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="modal d-block bg-dark bg-opacity-50" tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h5 className="modal-title">New package template</h5>
                <button type="button" className="btn-close" onClick={() => { setShowCreate(false); setCreateName(""); }} />
              </div>
              <div className="modal-body">
                <label className="form-label">Template name</label>
                <input type="text" className="form-control radius-8" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="e.g. Standard spay" />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary radius-8" onClick={() => { setShowCreate(false); setCreateName(""); }}>Cancel</button>
                <button type="button" className="btn btn-primary radius-8" onClick={handleCreate} disabled={createSaving || !createName.trim()}>
                  {createSaving ? "Creating…" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
