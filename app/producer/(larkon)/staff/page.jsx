"use client";

import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/src/hooks/useToast";
import {
  producerStaffInvite,
  producerStaffList,
  producerStaffRemove,
  producerStaffUpdateRole,
  producerStaffUpdateStatus,
  producerMe,
} from "../../_lib/producerApi";
import InviteStaffModal from "./components/InviteStaffModal";
import ConfirmRoleModal from "./components/ConfirmRoleModal";
import ConfirmStatusModal from "./components/ConfirmStatusModal";
import ConfirmRemoveModal from "./components/ConfirmRemoveModal";
import PermissionsModal from "./components/PermissionsModal";
import styles from "../../_styles/producer.module.css";

const ROLES = [
  { key: "PRODUCER_OWNER", label: "Owner", description: "Full access" },
  { key: "PRODUCER_MANAGER", label: "Manager", description: "Manage products, batches, codes" },
  { key: "PRODUCER_STAFF", label: "Staff", description: "Generate and export codes" },
  { key: "PRODUCER_AUDITOR", label: "Auditor", description: "View-only with analytics" },
  { key: "PRODUCER_VIEWER", label: "Viewer", description: "Basic view access" },
];

function getStatusBadgeClass(status) {
  if (!status) return "bg-secondary";
  switch (status) {
    case "ACTIVE":
      return "bg-success text-white";
    case "SUSPENDED":
      return "bg-warning text-dark";
    case "INVITED":
      return "bg-info text-white";
    case "REMOVED":
      return "bg-secondary text-white";
    default:
      return "bg-secondary";
  }
}

function getInitials(member) {
  const name = member?.user?.profile?.displayName || member?.user?.displayName || "";
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  const email = member?.user?.auth?.email || member?.user?.email || "";
  if (email) return email.slice(0, 2).toUpperCase();
  return "—";
}

export default function ProducerStaffPage() {
  const toast = useToast();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [sortNewestFirst, setSortNewestFirst] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", phone: "", roleKey: "PRODUCER_VIEWER" });
  const [roleTarget, setRoleTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [permissionsTarget, setPermissionsTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("list");

  useEffect(() => {
    loadStaff();
    producerMe().then((me) => {
      if (me?.user?.id) setCurrentUserId(me.user.id);
      else if (me?.id) setCurrentUserId(me.id);
    }).catch(() => {});
  }, []);

  function handleAuthError(err) {
    if (typeof window !== "undefined" && err?.status === 401) {
      window.location.href = "/producer/login";
      return true;
    }
    return false;
  }

  async function loadStaff() {
    try {
      setLoading(true);
      setError(null);
      const res = await producerStaffList();
      setStaff(Array.isArray(res) ? res : []);
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(err?.message || "Failed to load staff");
      toast.error(err?.message || "Failed to load staff");
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredAndSorted = useMemo(() => {
    let list = [...staff];
    const q = (search || "").trim().toLowerCase();
    if (q) {
      list = list.filter((m) => {
        const name = (m.user?.profile?.displayName || m.user?.displayName || "").toLowerCase();
        const email = (m.user?.auth?.email || m.user?.email || "").toLowerCase();
        const phone = (m.user?.auth?.phone || m.user?.phone || "").toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q);
      });
    }
    if (filterStatus) list = list.filter((m) => (m.status || "ACTIVE") === filterStatus);
    if (filterRole) list = list.filter((m) => m.role?.key === filterRole);
    list.sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime();
      const tb = new Date(b.createdAt || 0).getTime();
      return sortNewestFirst ? tb - ta : ta - tb;
    });
    return list;
  }, [staff, search, filterStatus, filterRole, sortNewestFirst]);

  const stats = useMemo(() => {
    const total = staff.length;
    const active = staff.filter((m) => (m.status || "ACTIVE") === "ACTIVE").length;
    const suspended = staff.filter((m) => m.status === "SUSPENDED").length;
    const invited = staff.filter((m) => m.status === "INVITED").length;
    const lastUpdated = staff.length ? staff.reduce((acc, m) => {
      const t = new Date(m.updatedAt || m.createdAt || 0).getTime();
      return t > acc ? t : acc;
    }, 0) : null;
    return { total, active, suspended, invited, lastUpdated };
  }, [staff]);

  async function handleInvite() {
    if (!(formData.email || "").trim() && !(formData.phone || "").trim()) {
      toast.error("Email or phone is required");
      return;
    }
    try {
      setInviteLoading(true);
      await producerStaffInvite(formData);
      toast.success("Invite sent");
      setShowInviteModal(false);
      setFormData({ email: "", phone: "", roleKey: "PRODUCER_VIEWER" });
      await loadStaff();
    } catch (err) {
      if (handleAuthError(err)) return;
      toast.error(err?.message || "Failed to invite staff");
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleConfirmRole() {
    if (!roleTarget || !roleTarget.newRoleKey) return;
    try {
      setActionLoading(true);
      await producerStaffUpdateRole(roleTarget.id, { roleKey: roleTarget.newRoleKey });
      toast.success("Role updated");
      setRoleTarget(null);
      await loadStaff();
    } catch (err) {
      if (handleAuthError(err)) return;
      toast.error(err?.message || "Failed to update role");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmStatus() {
    if (!statusTarget || !statusTarget.status) return;
    try {
      setActionLoading(true);
      await producerStaffUpdateStatus(statusTarget.id, { status: statusTarget.status });
      toast.success(statusTarget.status === "SUSPENDED" ? "Staff suspended" : "Staff activated");
      setStatusTarget(null);
      await loadStaff();
    } catch (err) {
      if (handleAuthError(err)) return;
      toast.error(err?.message || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmRemove() {
    if (!removeTarget || removeTarget.userId === currentUserId) return;
    try {
      setActionLoading(true);
      await producerStaffRemove(removeTarget.id);
      toast.success("Staff member removed");
      setRemoveTarget(null);
      await loadStaff();
    } catch (err) {
      if (handleAuthError(err)) return;
      toast.error(err?.message || "Failed to remove staff");
    } finally {
      setActionLoading(false);
    }
  }

  function openRoleConfirm(member, newRoleKey) {
    if (newRoleKey && newRoleKey !== member.role?.key) {
      setRoleTarget({ ...member, newRoleKey });
    }
  }

  if (loading && staff.length === 0) {
    return (
      <div className="p-4">
        <h2 className="h4 mb-3">Staff Management</h2>
        <div className="row g-3 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="col-sm-6 col-md-3">
              <div className="card">
                <div className="card-body">
                  <div className="placeholder-glow">
                    <span className="placeholder col-6" /> <span className="placeholder col-4" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-sm align-middle">
                <thead><tr><th>Staff</th><th>Contact</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i}>
                      <td colSpan={5}><span className="placeholder col-12" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h2 className="h4 mb-0">Staff Management</h2>
        <button className="btn btn-primary" onClick={() => setShowInviteModal(true)}>
          Invite Staff
        </button>
      </div>

      {/* Summary cards */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-md-3">
          <div className="card h-100">
            <div className="card-body py-3">
              <div className="text-muted small">Total staff</div>
              <div className="h4 mb-0">{stats.total}</div>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-md-3">
          <div className="card h-100">
            <div className="card-body py-3">
              <div className="text-muted small">Active</div>
              <div className="h4 mb-0 text-success">{stats.active}</div>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-md-3">
          <div className="card h-100">
            <div className="card-body py-3">
              <div className="text-muted small">Suspended</div>
              <div className="h4 mb-0 text-warning">{stats.suspended}</div>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-md-3">
          <div className="card h-100">
            <div className="card-body py-3">
              <div className="text-muted small">Invited</div>
              <div className="h4 mb-0 text-info">{stats.invited}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: List | Activity */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === "list" ? "active" : ""}`}
            onClick={() => setActiveTab("list")}
          >
            Staff list
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === "activity" ? "active" : ""}`}
            onClick={() => setActiveTab("activity")}
          >
            Activity
          </button>
        </li>
      </ul>

      {activeTab === "activity" && (
        <div className="card mb-4">
          <div className="card-body">
            <p className="text-secondary mb-0">Activity log is not available yet. Audit events are recorded on the backend.</p>
          </div>
        </div>
      )}

      {activeTab === "list" && (
        <>
          {error && (
            <div className="alert alert-danger d-flex align-items-center justify-content-between">
              <span>{error}</span>
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={loadStaff}>Retry</button>
            </div>
          )}

          {/* Controls */}
          <div className="d-flex flex-wrap gap-2 mb-3">
            <input
              type="search"
              className="form-control form-control-sm"
              style={{ maxWidth: 220 }}
              placeholder="Search name, email, phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="form-select form-select-sm"
              style={{ width: "auto" }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="INVITED">Invited</option>
            </select>
            <select
              className="form-select form-select-sm"
              style={{ width: "auto" }}
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="">All roles</option>
              {ROLES.map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setSortNewestFirst(!sortNewestFirst)}
            >
              {sortNewestFirst ? "Newest first" : "Oldest first"}
            </button>
          </div>

          <div className="card">
            <div className="card-body">
              {filteredAndSorted.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-secondary mb-3">{staff.length === 0 ? "No staff yet." : "No staff match your filters."}</p>
                  {staff.length === 0 && (
                    <button className="btn btn-primary" onClick={() => setShowInviteModal(true)}>
                      Invite Staff
                    </button>
                  )}
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordered table-sm align-middle">
                    <thead>
                      <tr>
                        <th>Staff</th>
                        <th>Email / Phone</th>
                        <th className={styles.w220}>Role</th>
                        <th>Status</th>
                        <th>Joined</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSorted.map((member) => (
                        <tr key={member.id}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <span className="rounded-circle bg-light d-inline-flex align-items-center justify-content-center text-muted" style={{ width: 32, height: 32, fontSize: "0.75rem" }}>
                                {getInitials(member)}
                              </span>
                              <span>{member.user?.profile?.displayName || member.user?.displayName || "N/A"}</span>
                            </div>
                          </td>
                          <td>{member.user?.auth?.email || member.user?.auth?.phone || member.user?.email || member.user?.phone || "—"}</td>
                          <td>
                            <select
                              className="form-select form-select-sm"
                              value={member.role?.key}
                              onChange={(e) => openRoleConfirm(member, e.target.value)}
                            >
                              {ROLES.map((role) => (
                                <option key={role.key} value={role.key}>{role.label}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(member.status)}`}>
                              {member.status || "ACTIVE"}
                            </span>
                          </td>
                          <td className="small text-nowrap">
                            {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : "—"}
                          </td>
                          <td>
                            <div className="d-flex flex-wrap gap-1">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => setPermissionsTarget(member)}
                              >
                                View permissions
                              </button>
                              {(member.status === "ACTIVE" || member.status === "SUSPENDED") && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-warning"
                                  onClick={() => setStatusTarget({ ...member, status: member.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" })}
                                >
                                  {member.status === "ACTIVE" ? "Suspend" : "Activate"}
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => setRemoveTarget(member)}
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <InviteStaffModal
        show={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleInvite}
        loading={inviteLoading}
        roles={ROLES}
      />
      <ConfirmRoleModal
        show={!!roleTarget}
        member={roleTarget}
        newRoleKey={roleTarget?.newRoleKey}
        roles={ROLES}
        onConfirm={handleConfirmRole}
        onCancel={() => setRoleTarget(null)}
        loading={actionLoading}
      />
      <ConfirmStatusModal
        show={!!statusTarget}
        member={statusTarget}
        status={statusTarget?.status}
        onConfirm={handleConfirmStatus}
        onCancel={() => setStatusTarget(null)}
        loading={actionLoading}
      />
      <ConfirmRemoveModal
        show={!!removeTarget}
        member={removeTarget}
        onConfirm={handleConfirmRemove}
        onCancel={() => setRemoveTarget(null)}
        loading={actionLoading}
        isSelf={removeTarget && (removeTarget.userId === currentUserId || removeTarget.user?.id === currentUserId)}
      />
      <PermissionsModal
        show={!!permissionsTarget}
        member={permissionsTarget}
        roles={ROLES}
        onClose={() => setPermissionsTarget(null)}
      />
    </div>
  );
}
