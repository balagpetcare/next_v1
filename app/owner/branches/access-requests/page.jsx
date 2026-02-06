"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ownerGet, ownerPost } from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

function pickArray(resp) {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp?.data)) return resp.data;
  return [];
}

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REVOKED", label: "Rejected/Revoked" },
  { value: "EXPIRED", label: "Expired" },
  { value: "SUSPENDED", label: "Suspended" },
];

function statusBadgeClass(status) {
  switch (status) {
    case "PENDING":
      return "bg-warning text-dark";
    case "APPROVED":
      return "bg-success";
    case "REVOKED":
      return "bg-danger";
    case "EXPIRED":
      return "bg-secondary";
    case "SUSPENDED":
      return "bg-secondary";
    default:
      return "bg-secondary";
  }
}

export default function OwnerBranchAccessRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [processing, setProcessing] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url = statusFilter
        ? `/api/v1/owner/branch-access?status=${encodeURIComponent(statusFilter)}`
        : "/api/v1/owner/branch-access";
      const res = await ownerGet(url);
      setRows(pickArray(res));
    } catch (e) {
      setError(e?.message || "Failed to load access requests");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleApprove(id) {
    setError("");
    setProcessing((p) => ({ ...p, [id]: "approve" }));
    try {
      await ownerPost(`/api/v1/owner/branch-access/${id}/approve`, {});
      await load();
    } catch (e) {
      setError(e?.message || "Approve failed");
    } finally {
      setProcessing((p) => ({ ...p, [id]: null }));
    }
  }

  async function handleReject(id) {
    if (!confirm("আপনি কি নিশ্চিত যে আপনি এই access request reject করতে চান?")) return;
    setError("");
    setProcessing((p) => ({ ...p, [id]: "reject" }));
    try {
      await ownerPost(`/api/v1/owner/branch-access/${id}/reject`, {});
      await load();
    } catch (e) {
      setError(e?.message || "Reject failed");
    } finally {
      setProcessing((p) => ({ ...p, [id]: null }));
    }
  }

  const displayName = (row) =>
    row?.user?.profile?.displayName ||
    row?.user?.auth?.email ||
    row?.user?.auth?.phone ||
    "—";
  const branchName = (row) => row?.branch?.name || "—";
  const roleLabel = (row) => (row?.role ? String(row.role).replace(/_/g, " ") : "—");

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Branch Access Requests"
        subtitle="Approve or reject staff branch access (Owner only)"
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Branches", href: "/owner/branches" },
          { label: "Access Requests", href: "/owner/branches/access-requests" },
        ]}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      <div className="card radius-12 mb-24">
        <div className="card-body p-24">
          <div className="d-flex flex-wrap align-items-center gap-16 mb-24">
            <label className="form-label mb-0">Status:</label>
            <select
              className="form-select form-select-sm"
              style={{ width: "auto" }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={load}
              disabled={loading}
            >
              <i className="ri-refresh-line me-1" />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="ri-user-shared-line fs-1 d-block mb-2" />
              <p className="mb-0">No access requests match the selected status.</p>
              <Link href="/owner/branches" className="btn btn-outline-primary btn-sm mt-16">
                Back to Branches
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Branch</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Requested</th>
                    {statusFilter === "PENDING" ? <th className="text-end">Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{displayName(row)}</strong>
                        {(row?.user?.auth?.email || row?.user?.auth?.phone) && (
                          <div className="text-muted small">
                            {row.user.auth.email || row.user.auth.phone}
                          </div>
                        )}
                      </td>
                      <td>{branchName(row)}</td>
                      <td>
                        <span className="badge bg-primary-100 text-primary-600">
                          {roleLabel(row)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${statusBadgeClass(row.status)}`}>
                          {row.status || "—"}
                        </span>
                      </td>
                      <td>
                        {row.requestedAt
                          ? new Date(row.requestedAt).toLocaleString("bn-BD")
                          : "—"}
                      </td>
                      {statusFilter === "PENDING" ? (
                        <td className="text-end">
                          <div className="d-flex gap-8 justify-content-end">
                            <button
                              type="button"
                              className="btn btn-success btn-sm"
                              onClick={() => handleApprove(row.id)}
                              disabled={!!processing[row.id]}
                            >
                              {processing[row.id] === "approve" ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-1" />
                                  Approving...
                                </>
                              ) : (
                                <>
                                  <i className="ri-check-line me-1" />
                                  Approve
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => handleReject(row.id)}
                              disabled={!!processing[row.id]}
                            >
                              {processing[row.id] === "reject" ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-1" />
                                  Rejecting...
                                </>
                              ) : (
                                <>
                                  <i className="ri-close-line me-1" />
                                  Reject
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
