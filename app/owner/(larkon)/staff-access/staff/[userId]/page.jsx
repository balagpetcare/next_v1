"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet, ownerPost } from "@/app/owner/_lib/ownerApi";

const ROLE_OPTIONS = ["BRANCH_MANAGER", "BRANCH_STAFF", "SELLER", "DELIVERY_MANAGER", "DELIVERY_STAFF"];

export default function StaffAccessDetailPage({ params }) {
  const router = useRouter();
  const resolved = use(params);
  const staffUserId = Number(resolved?.userId);
  const [accessRows, setAccessRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState({ branchId: "", role: "BRANCH_STAFF", note: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");

  const load = useCallback(async () => {
    if (!staffUserId) return;
    setLoading(true);
    setError("");
    try {
      const [accessRes, branchesRes] = await Promise.all([
        ownerGet(`/api/v1/owner/staff-access/staff/${staffUserId}/branch-access`),
        ownerGet("/api/v1/owner/branches"),
      ]);
      const list = accessRes?.data ?? accessRes;
      setAccessRows(Array.isArray(list) ? list : []);
      const branchList = branchesRes?.data ?? branchesRes;
      setBranches(Array.isArray(branchList) ? branchList : []);
    } catch (e) {
      setError(e?.message || "Failed to load staff access");
    } finally {
      setLoading(false);
    }
  }, [staffUserId]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitAssign(e) {
    e.preventDefault();
    if (!form.branchId) return;
    setAction("assign");
    setError("");
    try {
      await ownerPost("/api/v1/owner/branch-access/assign", {
        userId: staffUserId,
        branchId: Number(form.branchId),
        role: form.role,
        note: form.note || undefined,
      });
      setForm((f) => ({ ...f, note: "" }));
      await load();
    } catch (err) {
      setError(err?.message || "Failed to assign access");
    } finally {
      setAction("");
    }
  }

  async function handleRowAction(id, type) {
    setAction(`${type}-${id}`);
    setError("");
    try {
      if (type === "approve") {
        await ownerPost(`/api/v1/owner/branch-access/${id}/approve`, {});
      } else if (type === "reject") {
        await ownerPost(`/api/v1/owner/branch-access/${id}/reject`, {});
      } else if (type === "suspend") {
        await ownerPost(`/api/v1/owner/branch-access/${id}/suspend`, {});
      } else if (type === "remove") {
        await ownerPost(`/api/v1/owner/branch-access/${id}/remove`, {});
      }
      await load();
    } catch (err) {
      setError(err?.message || "Action failed");
    } finally {
      setAction("");
    }
  }

  async function updateRole(id, newRole) {
    setAction(`role-${id}`);
    setError("");
    try {
      await ownerPost(`/api/v1/owner/branch-access/${id}/role`, { role: newRole });
      await load();
    } catch (err) {
      setError(err?.message || "Failed to update role");
    } finally {
      setAction("");
    }
  }

  const staffName =
    accessRows[0]?.user?.profile?.displayName ||
    accessRows[0]?.user?.auth?.email ||
    accessRows[0]?.user?.auth?.phone ||
    `User #${staffUserId}`;

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title={`Staff Access: ${staffName}`}
        subtitle="Assign or update branch-level permissions for this staff member."
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Staff Access", href: "/owner/staff-access" },
          { label: "Staff", href: "/owner/staff-access/staff" },
          { label: `User #${staffUserId}`, href: `/owner/staff-access/staff/${staffUserId}` },
        ]}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-1" />
          {error}
        </div>
      )}

      <div className="row g-24">
        <div className="col-lg-4">
          <div className="card radius-12 h-100">
            <div className="card-body p-24">
              <h6 className="mb-3">Assign access</h6>
              <form onSubmit={submitAssign} className="d-flex flex-column gap-16">
                <div>
                  <label className="form-label">Branch</label>
                  <select
                    className="form-select"
                    value={form.branchId}
                    onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
                    required
                  >
                    <option value="">Select branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Role</label>
                  <select
                    className="form-select"
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Note (optional)</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={action === "assign" || loading}>
                  {action === "assign" ? "Assigning..." : "Assign access"}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card radius-12">
            <div className="card-body p-24">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : accessRows.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <i className="ri-lock-unlock-line fs-1 d-block mb-2" />
                  <p>No access records yet.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead>
                      <tr>
                        <th>Branch</th>
                        <th>Status</th>
                        <th>Role</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accessRows.map((row) => (
                        <tr key={row.id}>
                          <td>{row.branch?.name || row.branchId}</td>
                          <td>{row.status}</td>
                          <td>
                            <select
                              className="form-select form-select-sm"
                              value={row.role || ""}
                              onChange={(e) => updateRole(row.id, e.target.value)}
                              disabled={action === `role-${row.id}`}
                            >
                              {ROLE_OPTIONS.map((role) => (
                                <option key={role} value={role}>
                                  {role.replace(/_/g, " ")}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <div className="d-flex flex-wrap gap-8">
                              {row.status === "PENDING" ? (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-primary"
                                    disabled={action === `approve-${row.id}`}
                                    onClick={() => handleRowAction(row.id, "approve")}
                                  >
                                    {action === `approve-${row.id}` ? "Approving..." : "Approve"}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    disabled={action === `reject-${row.id}`}
                                    onClick={() => handleRowAction(row.id, "reject")}
                                  >
                                    {action === `reject-${row.id}` ? "Rejecting..." : "Reject"}
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary"
                                    disabled={action === `suspend-${row.id}`}
                                    onClick={() => handleRowAction(row.id, "suspend")}
                                  >
                                    {action === `suspend-${row.id}` ? "Suspending..." : "Suspend"}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    disabled={action === `remove-${row.id}`}
                                    onClick={() => handleRowAction(row.id, "remove")}
                                  >
                                    {action === `remove-${row.id}` ? "Removing..." : "Remove"}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <button type="button" className="btn btn-link mt-3" onClick={() => router.back()}>
                ← Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
