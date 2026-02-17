"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useLanguage } from "@/app/(public)/_lib/LanguageContext";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import StatusBadge from "@/app/owner/_components/StatusBadge";

function pickArray(resp) {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp.data)) return resp.data;
  if (Array.isArray(resp.items)) return resp.items;
  if (Array.isArray(resp.data?.items)) return resp.data.items;
  return [];
}

export default function BranchesPage() {
  const { t } = useLanguage();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    async function loadBranches() {
      try {
        setLoading(true);
        setError("");
        const data = await ownerGet("/api/v1/owner/branches");
        const items = pickArray(data);
        setBranches(items);
      } catch (e) {
        setError(e?.message || t("owner.failedToLoadBranches"));
      } finally {
        setLoading(false);
      }
    }
    loadBranches();
  }, []);

  const filteredBranches = useMemo(() => {
    let list = branches;
    if (statusFilter) {
      list = list.filter((b) => String(b.status || "ACTIVE").toUpperCase() === statusFilter.toUpperCase());
    }
    if (typeFilter) {
      list = list.filter((b) =>
        (b.types || []).some(
          (t) =>
            String(t?.type?.nameEn || t?.code || "").toUpperCase() === typeFilter.toUpperCase() ||
            String(t?.code || "").toUpperCase() === typeFilter.toUpperCase()
        )
      );
    }
    return list;
  }, [branches, statusFilter, typeFilter]);

  const uniqueStatuses = useMemo(() => {
    const s = new Set((branches || []).map((b) => (b.status || "ACTIVE").toUpperCase()));
    return Array.from(s).sort();
  }, [branches]);

  const uniqueTypes = useMemo(() => {
    const types = new Set();
    (branches || []).forEach((b) => {
      (b.types || []).forEach((t) => {
        const name = t?.type?.nameEn || t?.code;
        if (name) types.add(name);
      });
    });
    return Array.from(types).sort();
  }, [branches]);

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title={t("owner.branches")}
        subtitle={t("owner.manageBranchesSubtitle")}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Branches", href: "/owner/branches" },
        ]}
        actions={[
          <Link
            key="access"
            href="/owner/access/requests"
            className="btn btn-outline-primary radius-12"
          >
            <i className="ri-user-shared-line me-1" />
            Access Requests
          </Link>,
          <Link
            key="new"
            href="/owner/branches/new"
            className="btn btn-primary radius-12"
          >
            <i className="ri-add-line me-1" />
            New Branch
          </Link>,
        ]}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      ) : branches.length === 0 ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <i className="ri-store-line fs-1 text-muted mb-3 d-block" />
            <h5 className="mb-3">No Branches Found</h5>
            <p className="text-muted mb-4">Create your first branch to get started.</p>
            <Link href="/owner/branches/new" className="btn btn-primary radius-12">
              <i className="ri-add-line me-1" />
              Create Branch
            </Link>
          </div>
        </div>
      ) : (
        <div className="card radius-12">
          <div className="card-body p-24">
            <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
              <label className="form-label mb-0">Status:</label>
              <select
                className="form-select form-select-sm radius-12"
                style={{ width: "auto" }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All</option>
                {uniqueStatuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <label className="form-label mb-0 ms-2">Type:</label>
              <select
                className="form-select form-select-sm radius-12"
                style={{ width: "auto" }}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All</option>
                {uniqueTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {(statusFilter || typeFilter) && (
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm radius-12"
                  onClick={() => { setStatusFilter(""); setTypeFilter(""); }}
                >
                  Clear filters
                </button>
              )}
            </div>
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Branch Name</th>
                    <th>Organization</th>
                    <th>Types</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBranches.map((branch) => {
                    const orgId = branch.orgId || branch.org?.id;
                    const branchId = branch.id;
                    return (
                      <tr key={branch.id}>
                        <td>
                          <div className="fw-semibold">{branch.name || `Branch #${branch.id}`}</div>
                        </td>
                        <td>
                          {branch.org?.name || `Organization #${orgId}`}
                        </td>
                        <td>
                          <div className="d-flex flex-wrap gap-2">
                            {Array.isArray(branch.types) &&
                              branch.types.slice(0, 2).map((type, idx) => (
                                <span key={idx} className="badge bg-primary-light text-primary radius-8">
                                  {type?.type?.nameEn || type?.code || "Unknown"}
                                </span>
                              ))}
                            {Array.isArray(branch.types) && branch.types.length > 2 && (
                              <span className="badge bg-secondary radius-8">
                                +{branch.types.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={branch.status || "ACTIVE"} />
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            {branchId && (
                              <>
                                <Link
                                  href={`/owner/branches/${branchId}`}
                                  className="btn btn-sm btn-primary radius-12"
                                  title="View Full Details"
                                >
                                  <i className="ri-eye-line me-1" />
                                  View Details
                                </Link>
                                {orgId && (
                                  <>
                                    <Link
                                      href={`/owner/organizations/${orgId}/branches/${branchId}`}
                                      className="btn btn-sm btn-outline-primary radius-12"
                                      title="View Overview"
                                    >
                                      <i className="ri-file-list-line" />
                                    </Link>
                                    <Link
                                      href={`/owner/organizations/${orgId}/branches/${branchId}/edit`}
                                      className="btn btn-sm btn-outline-secondary radius-12"
                                      title="Edit Branch"
                                    >
                                      <i className="ri-edit-line" />
                                    </Link>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
