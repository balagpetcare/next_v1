"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffBranchStaffList,
  staffBranchAccessPending,
  staffBranchAccessForBranch,
  staffBranchAccessApprove,
  staffBranchAccessRevoke,
  staffBranchInvite,
  staffBranchInviteAllowedRoles,
} from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import PermissionGate from "@/src/components/branch/PermissionGate";

const REQUIRED_PERM = "staff.view";

export default function StaffBranchStaffPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading, errorCode, hasViewPermission } = useBranchContext(branchId);

  const permissions = myAccess?.permissions ?? [];
  const canViewStaff = permissions.includes(REQUIRED_PERM);
  const canManageStaff = permissions.includes("staff.manage");
  const canViewShifts = permissions.includes("shifts.view");
  const canManageShifts = permissions.includes("shifts.manage");
  const canApprove = canManageStaff || permissions.includes("approvals.manage");

  const [activeTab, setActiveTab] = useState("staff"); // staff | invites | shifts
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [staffError, setStaffError] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const [branchPermissions, setBranchPermissions] = useState([]);
  const [pendingFromManager, setPendingFromManager] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [revokeModal, setRevokeModal] = useState(null); // { id, userId, displayName }
  const [revokeReason, setRevokeReason] = useState("");
  const [revokeSubmitting, setRevokeSubmitting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", phone: "", role: "BRANCH_STAFF" });
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteAllowedRoles, setInviteAllowedRoles] = useState([]);
  const [inviteAllowedRolesLoading, setInviteAllowedRolesLoading] = useState(false);

  useEffect(() => {
    if (errorCode === "unauthorized") router.replace("/staff/login");
  }, [errorCode, router]);

  useEffect(() => {
    if (!branchId || !canViewStaff) return;
    let cancelled = false;
    setStaffLoading(true);
    setStaffError("");
    staffBranchStaffList(branchId)
      .then(({ items }) => { if (!cancelled) setStaffList(items ?? []); })
      .catch((e) => { if (!cancelled) setStaffError(e?.message ?? "Failed to load staff"); })
      .finally(() => { if (!cancelled) setStaffLoading(false); });
    return () => { cancelled = true; };
  }, [branchId, canViewStaff]);

  useEffect(() => {
    if (!branchId || !canViewStaff) return;
    let cancelled = false;
    staffBranchAccessForBranch(branchId)
      .then((list) => { if (!cancelled) setBranchPermissions(Array.isArray(list) ? list : []); })
      .catch(() => { if (!cancelled) setBranchPermissions([]); });
    return () => { cancelled = true; };
  }, [branchId, canViewStaff]);

  // Fetch allowed invite roles when opening invite modal (Branch Manager sees only Staff/Seller, not Branch Manager)
  useEffect(() => {
    if (!showInviteModal || !branchId || !canManageStaff) return;
    let cancelled = false;
    setInviteAllowedRolesLoading(true);
    staffBranchInviteAllowedRoles(branchId)
      .then(({ allowedRoles }) => {
        if (!cancelled && Array.isArray(allowedRoles) && allowedRoles.length > 0) setInviteAllowedRoles(allowedRoles);
        else if (!cancelled) setInviteAllowedRoles(["BRANCH_STAFF", "SELLER"]);
      })
      .catch(() => { if (!cancelled) setInviteAllowedRoles(["BRANCH_STAFF", "SELLER"]); })
      .finally(() => { if (!cancelled) setInviteAllowedRolesLoading(false); });
    return () => { cancelled = true; };
  }, [showInviteModal, branchId, canManageStaff]);

  // Keep invite form role in sync with allowed list (e.g. when API returns only Staff/Seller for manager)
  useEffect(() => {
    if (!showInviteModal || inviteAllowedRoles.length === 0) return;
    if (!inviteAllowedRoles.includes(inviteForm.role)) {
      setInviteForm((f) => ({ ...f, role: inviteAllowedRoles[0] || "BRANCH_STAFF" }));
    }
  }, [showInviteModal, inviteAllowedRoles, inviteForm.role]);

  useEffect(() => {
    if (!branchId || activeTab !== "invites") return;
    let cancelled = false;
    setInvitesLoading(true);
    staffBranchAccessPending()
      .then((pending) => { if (!cancelled) setPendingFromManager(Array.isArray(pending) ? pending : []); })
      .catch(() => { if (!cancelled) setPendingFromManager([]); })
      .finally(() => { if (!cancelled) setInvitesLoading(false); });
    return () => { cancelled = true; };
  }, [branchId, activeTab]);

  const filteredStaff = useMemo(() => {
    const q = (staffSearch || "").toLowerCase().trim();
    if (!q) return staffList;
    return staffList.filter((s) => {
      const name = (s.user?.displayName ?? s.user?.username ?? "").toLowerCase();
      const email = (s.user?.email ?? "").toLowerCase();
      const phone = (s.user?.phone ?? "").replace(/\D/g, "");
      const qNum = q.replace(/\D/g, "");
      return name.includes(q) || email.includes(q) || (qNum && phone.includes(qNum));
    });
  }, [staffList, staffSearch]);

  const pendingRequests = useMemo(() => {
    const bid = Number(branchId);
    const fromBranch = (branchPermissions || []).filter((p) => (p.status || "").toUpperCase() === "PENDING");
    const fromPending = (pendingFromManager || []).filter((p) => Number(p.branchId ?? p.branch?.id) === bid);
    const byId = new Map();
    fromBranch.forEach((p) => byId.set(p.id, p));
    fromPending.forEach((p) => byId.set(p.id, p));
    return Array.from(byId.values());
  }, [branchPermissions, pendingFromManager, branchId]);

  const handleApprove = async (permissionId) => {
    setActionLoading(permissionId);
    try {
      await staffBranchAccessApprove(permissionId);
      setToast("Access approved.");
      const [forBranch, pending] = await Promise.all([
        staffBranchAccessForBranch(branchId),
        staffBranchAccessPending(),
      ]);
      setBranchPermissions(Array.isArray(forBranch) ? forBranch : []);
      setPendingFromManager(Array.isArray(pending) ? pending : []);
      const { items } = await staffBranchStaffList(branchId);
      setStaffList(items ?? []);
    } catch (e) {
      setToast(e?.message ?? "Failed to approve");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeSubmit = async () => {
    if (!revokeModal?.id) return;
    setRevokeSubmitting(true);
    try {
      await staffBranchAccessRevoke(revokeModal.id, { reason: revokeReason.trim() || undefined });
      setToast("Access revoked.");
      setRevokeModal(null);
      setRevokeReason("");
      const [forBranch, pending] = await Promise.all([
        staffBranchAccessForBranch(branchId),
        staffBranchAccessPending(),
      ]);
      setBranchPermissions(Array.isArray(forBranch) ? forBranch : []);
      setPendingFromManager(Array.isArray(pending) ? pending : []);
      const { items } = await staffBranchStaffList(branchId);
      setStaffList(items ?? []);
    } catch (e) {
      setToast(e?.message ?? "Failed to revoke");
    } finally {
      setRevokeSubmitting(false);
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!canManageStaff) return;
    setInviteSubmitting(true);
    try {
      const res = await staffBranchInvite(branchId, inviteForm);
      if (res.success) {
        setToast("Invite sent.");
        setShowInviteModal(false);
        setInviteForm({ email: "", phone: "", role: inviteAllowedRoles[0] || "BRANCH_STAFF" });
        const [forBranch] = await Promise.all([staffBranchAccessForBranch(branchId)]);
        setBranchPermissions(Array.isArray(forBranch) ? forBranch : []);
      } else {
        setToast(res.message ?? "Invite not available. Use owner panel to invite staff.");
      }
    } catch {
      setToast("Invite failed. Use owner panel to invite staff.");
    } finally {
      setInviteSubmitting(false);
    }
  };

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }

  if (!canViewStaff) {
    return (
      <AccessDenied missingPerm={REQUIRED_PERM} onBack={() => router.push(`/staff/branch/${branchId}`)} />
    );
  }

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />

      <div className="d-flex align-items-center gap-12 mb-24">
        <Link href={`/staff/branch/${branchId}`} className="btn btn-outline-secondary btn-sm">
          ← Branch
        </Link>
        <h5 className="mb-0">Staff & Shifts</h5>
        <div className="ms-auto d-flex gap-8">
          <PermissionGate oneOfPerms={["staff.manage"]} mode="hide" permissions={permissions}>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowInviteModal(true)}>
              Invite Staff
            </button>
            <button type="button" className="btn btn-outline-primary btn-sm" disabled title="Assign role: use row action or owner panel">
              Assign Role
            </button>
          </PermissionGate>
        </div>
      </div>

      {toast && (
        <div className="alert alert-info d-flex align-items-center justify-content-between">
          <span>{toast}</span>
          <button type="button" className="btn btn-sm btn-outline-info" onClick={() => setToast(null)}>Dismiss</button>
        </div>
      )}

      <ul className="nav nav-tabs mb-16">
        <li className="nav-item">
          <button type="button" className={`nav-link ${activeTab === "staff" ? "active" : ""}`} onClick={() => setActiveTab("staff")}>
            Staff
          </button>
        </li>
        <li className="nav-item">
          <button type="button" className={`nav-link ${activeTab === "invites" ? "active" : ""}`} onClick={() => setActiveTab("invites")}>
            Invites / Access Requests
          </button>
        </li>
        <li className="nav-item">
          <button type="button" className={`nav-link ${activeTab === "shifts" ? "active" : ""}`} onClick={() => setActiveTab("shifts")}>
            Shifts
          </button>
        </li>
      </ul>

      {activeTab === "staff" && (
        <Card title="Staff" subtitle="Branch members. Search by name, email, or phone.">
          <div className="mb-16">
            <input
              type="search"
              className="form-control form-control-sm"
              style={{ maxWidth: 280 }}
              placeholder="Search name / email / phone..."
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
            />
          </div>
          {staffError && (
            <div className="alert alert-danger d-flex align-items-center justify-content-between">
              <span>{staffError}</span>
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => { setStaffError(""); staffBranchStaffList(branchId).then(({ items }) => setStaffList(items ?? [])).catch(() => {}); }}>Retry</button>
            </div>
          )}
          {staffLoading ? (
            <div className="py-24">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone / Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4].map((i) => (
                    <tr key={i}>
                      <td><span className="placeholder col-3" /></td>
                      <td><span className="placeholder col-4" /></td>
                      <td><span className="placeholder col-2" /></td>
                      <td><span className="placeholder col-2" /></td>
                      <td><span className="placeholder col-2" /></td>
                      <td><span className="placeholder col-2" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-center text-secondary-light mt-12">Loading...</p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="py-24 text-center text-secondary-light">No staff found.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone / Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((s) => {
                    const name = s.user?.displayName ?? s.user?.username ?? "—";
                    const contact = [s.user?.phone, s.user?.email].filter(Boolean).join(" / ") || "—";
                    const role = s.role ?? "—";
                    const status = (s.status ?? s.branchAccess?.status ?? "ACTIVE").toUpperCase();
                    const lastLogin = s.branchAccess?.lastLoginAt ? new Date(s.branchAccess.lastLoginAt).toLocaleString() : "—";
                    const perm = (branchPermissions || []).find((p) => p.userId === s.userId);
                    return (
                      <tr key={s.memberId ?? s.userId ?? s.user?.id}>
                        <td>{name}</td>
                        <td>{contact}</td>
                        <td><span className="badge bg-secondary">{role}</span></td>
                        <td><span className={`badge ${status === "ACTIVE" ? "bg-success" : "bg-warning text-dark"}`}>{status}</span></td>
                        <td>{lastLogin}</td>
                        <td>
                          <div className="d-flex gap-8 flex-wrap">
                            <button type="button" className="btn btn-sm btn-outline-secondary" disabled title="View profile (placeholder)">View</button>
                            <PermissionGate oneOfPerms={["staff.manage"]} mode="hide" permissions={permissions}>
                              <button type="button" className="btn btn-sm btn-outline-secondary" disabled title="Change role: use owner panel">Role</button>
                              {perm?.id && (
                                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setRevokeModal({ id: perm.id, userId: s.userId, displayName: name })}>Revoke access</button>
                              )}
                            </PermissionGate>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === "invites" && (
        <Card title="Invites & Access Requests" subtitle="Pending invites (sent) and staff who requested access to this branch. Approve or reject with reason.">
          {invitesLoading ? (
            <div className="py-24 text-center text-secondary-light">Loading...</div>
          ) : (
            <>
              <h6 className="mb-12">Pending Access Requests</h6>
              {pendingRequests.length === 0 ? (
                <p className="text-secondary-light mb-24">No pending access requests.</p>
              ) : (
                <div className="table-responsive mb-24">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Requester</th>
                        <th>Requested role</th>
                        <th>Requested at</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRequests.map((r) => {
                        const user = r.user;
                        const displayName = user?.profile?.displayName ?? user?.profile?.username ?? user?.email ?? `User ${r.userId}`;
                        const requestedAt = r.requestedAt ? new Date(r.requestedAt).toLocaleString() : "—";
                        return (
                          <tr key={r.id}>
                            <td>{displayName}</td>
                            <td>{r.role ?? "—"}</td>
                            <td>{requestedAt}</td>
                            <td><span className="badge bg-warning text-dark">{r.status ?? "PENDING"}</span></td>
                            <td>
                              <PermissionGate oneOfPerms={["staff.manage", "approvals.manage"]} mode="hide" permissions={permissions}>
                                <div className="d-flex gap-8">
                                  <button type="button" className="btn btn-sm btn-success" disabled={actionLoading === r.id} onClick={() => handleApprove(r.id)}>
                                    {actionLoading === r.id ? "..." : "Approve"}
                                  </button>
                                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setRevokeModal({ id: r.id, userId: r.userId, displayName })}>Reject</button>
                                </div>
                              </PermissionGate>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <h6 className="mb-12">Pending Invites (sent)</h6>
              <p className="text-secondary-light small mb-0">Invites sent from owner panel appear here when supported. Use Owner → Branch → Invite to add staff.</p>
            </>
          )}
        </Card>
      )}

      {activeTab === "shifts" && (
        <Card title="Shifts" subtitle="Shifts management. Backend endpoints not implemented in this phase.">
          <div className="py-24 text-center text-secondary-light">
            {canViewShifts ? "Shifts calendar and create shift will appear here when backend supports GET/POST /shifts/branches/:branchId." : "You need shifts.view to see shifts. Shifts API is not yet available."}
          </div>
        </Card>
      )}

      {revokeModal && (
        <div className="modal show d-block" style={{ background: "rgba(0,0,0,0.5)" }} aria-modal="true">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">Reject / Revoke access</h6>
                <button type="button" className="btn-close" onClick={() => { setRevokeModal(null); setRevokeReason(""); }} aria-label="Close" />
              </div>
              <div className="modal-body">
                <p className="mb-12">Revoking access for <strong>{revokeModal.displayName}</strong>. Reason (recommended):</p>
                <textarea
                  className="form-control form-control-sm"
                  rows={2}
                  placeholder="Reason for rejection/revocation"
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => { setRevokeModal(null); setRevokeReason(""); }}>Cancel</button>
                <button type="button" className="btn btn-danger" disabled={revokeSubmitting} onClick={handleRevokeSubmit}>
                  {revokeSubmitting ? "Revoking..." : "Revoke"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="modal show d-block" style={{ background: "rgba(0,0,0,0.5)" }} aria-modal="true">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">Invite Staff</h6>
                <button type="button" className="btn-close" onClick={() => setShowInviteModal(false)} aria-label="Close" />
              </div>
              <form onSubmit={handleInviteSubmit}>
                <div className="modal-body">
                  <p className="text-secondary-light small mb-16">If invite endpoint is not available for staff app, use Owner panel to invite.</p>
                  <div className="mb-16">
                    <label className="form-label text-sm">Email</label>
                    <input type="email" className="form-control form-control-sm" value={inviteForm.email} onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
                  </div>
                  <div className="mb-16">
                    <label className="form-label text-sm">Phone (optional)</label>
                    <input type="text" className="form-control form-control-sm" value={inviteForm.phone} onChange={(e) => setInviteForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+1234567890" />
                  </div>
                  <div className="mb-16">
                    <label className="form-label text-sm">Role</label>
                    <select
                      className="form-select form-select-sm"
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value }))}
                      disabled={inviteAllowedRolesLoading}
                    >
                      {(inviteAllowedRoles.length ? inviteAllowedRoles : ["BRANCH_STAFF", "SELLER"]).map((r) => (
                        <option key={r} value={r}>
                          {r === "BRANCH_STAFF" || r === "STAFF" ? "Staff" : r === "SELLER" ? "Seller" : r === "DELIVERY_STAFF" ? "Delivery Staff" : r.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                    <p className="form-text small text-secondary-light mb-0">Branch managers can invite only Staff and Seller.</p>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowInviteModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={inviteSubmitting}>{inviteSubmitting ? "Sending..." : "Send invite"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
