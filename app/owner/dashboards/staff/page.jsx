"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import StatusBadge from "@/app/owner/_components/StatusBadge";
import ActionDropdown from "@/app/owner/_components/shared/ActionDropdown";
import { ownerGet, ownerPatch, ownerPost } from "@/app/owner/_lib/ownerApi";

const API_BASE = "/api/v1/owner";

function nameFrom(item) {
  return (
    item?.user?.profile?.displayName ||
    item?.user?.profile?.username ||
    item?.user?.auth?.email ||
    item?.user?.auth?.phone ||
    "—"
  );
}

function getInitials(name) {
  if (!name) return "??";
  const parts = String(name).split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return String(name).substring(0, 2).toUpperCase();
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function roleLabel(role) {
  if (!role) return "—";
  return String(role).replace(/_/g, " ");
}

/** Staff detail drawer: profile, permissions, shift rules, audit, activity, disciplinary */
function StaffDetailDrawer({ staffUserId, branches = [], open, onClose, onUpdated, initialTab = "profile" }) {
  const [detail, setDetail] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activity, setActivity] = useState(null);
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [permOverrides, setPermOverrides] = useState("");
  const [loginStart, setLoginStart] = useState("");
  const [loginEnd, setLoginEnd] = useState("");
  const [savingPerms, setSavingPerms] = useState(false);
  const [warningNote, setWarningNote] = useState("");
  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [newRole, setNewRole] = useState("");

  useEffect(() => {
    if (!open || !staffUserId) return;
    setLoading(true);
    Promise.all([
      ownerGet(`${API_BASE}/staff/${staffUserId}`),
      ownerGet(`${API_BASE}/staff/${staffUserId}/audit-logs?limit=50`),
      ownerGet(`${API_BASE}/staff/${staffUserId}/activity-summary`),
    ])
      .then(([detailRes, logsRes, activityRes]) => {
        const d = detailRes?.data ?? detailRes;
        const logs = Array.isArray(logsRes?.data) ? logsRes.data : Array.isArray(logsRes) ? logsRes : [];
        const act = activityRes?.data ?? activityRes;
        setDetail(d);
        setAuditLogs(logs);
        setActivity(act);
        const firstPerm = d?.branchAccess?.[0];
        if (firstPerm) {
          const over = firstPerm.permissionOverrides;
          setPermOverrides(Array.isArray(over) ? over.join(", ") : "");
          setLoginStart(firstPerm.loginWindowStart ?? "");
          setLoginEnd(firstPerm.loginWindowEnd ?? "");
        }
        if (d?.memberships?.[0]) {
          setNewRole(d.memberships[0].role ?? "");
          setTransferFrom(String(d.memberships[0].branchId ?? ""));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, staffUserId]);
  useEffect(() => {
    if (open && initialTab) setTab(initialTab);
  }, [open, initialTab]);

  const handleSavePermissions = async () => {
    if (!staffUserId) return;
    setSavingPerms(true);
    try {
      await ownerPatch(`${API_BASE}/staff/${staffUserId}/permissions`, {
        permissionOverrides: permOverrides.trim() ? permOverrides.split(/,\s*/).filter(Boolean) : null,
        loginWindowStart: loginStart.trim() || null,
        loginWindowEnd: loginEnd.trim() || null,
      });
      onUpdated?.();
      const res = await ownerGet(`${API_BASE}/staff/${staffUserId}`);
      setDetail(res?.data ?? res);
    } catch (e) {
      alert(e?.message ?? "Failed to update");
    } finally {
      setSavingPerms(false);
    }
  };

  const handleSaveShiftRules = async () => {
    if (!staffUserId) return;
    setSavingPerms(true);
    try {
      await ownerPatch(`${API_BASE}/staff/${staffUserId}/shift-rules`, {
        loginWindowStart: loginStart.trim() || null,
        loginWindowEnd: loginEnd.trim() || null,
      });
      onUpdated?.();
      const res = await ownerGet(`${API_BASE}/staff/${staffUserId}`);
      setDetail(res?.data ?? res);
    } catch (e) {
      alert(e?.message ?? "Failed to update");
    } finally {
      setSavingPerms(false);
    }
  };

  const handleTransfer = async () => {
    if (!staffUserId || !transferFrom || !transferTo) {
      alert("Select source and target branch.");
      return;
    }
    if (transferFrom === transferTo) {
      alert("Source and target branch must be different.");
      return;
    }
    if (!confirm("Transfer this staff to the selected branch? Current branch access will be revoked.")) return;
    try {
      await ownerPost(`${API_BASE}/staff/${staffUserId}/transfer-branch`, {
        fromBranchId: Number(transferFrom),
        toBranchId: Number(transferTo),
      });
      onUpdated?.();
      const res = await ownerGet(`${API_BASE}/staff/${staffUserId}`);
      setDetail(res?.data ?? res);
      setTransferFrom("");
      setTransferTo("");
    } catch (e) {
      alert(e?.message ?? "Transfer failed");
    }
  };

  const handleChangeRole = async () => {
    if (!staffUserId || !newRole) return;
    try {
      await ownerPatch(`${API_BASE}/staff/${staffUserId}/role`, { role: newRole });
      onUpdated?.();
      const res = await ownerGet(`${API_BASE}/staff/${staffUserId}`);
      setDetail(res?.data ?? res);
    } catch (e) {
      alert(e?.message ?? "Failed to update role");
    }
  };

  if (!open) return null;

  const user = detail?.user;
  const memberships = detail?.memberships ?? [];
  const access = detail?.branchAccess ?? [];

  return (
    <div
      className="offcanvas offcanvas-end show"
      style={{ width: "min(520px, 100vw)", visibility: "visible" }}
      tabIndex={-1}
    >
      <div className="offcanvas-header border-bottom">
        <h5 className="offcanvas-title">Staff Profile & Controls</h5>
        <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
      </div>
      <div className="offcanvas-body p-0">
        {loading ? (
          <div className="p-4 text-center text-muted">
            <div className="spinner-border spinner-border-sm me-2" />
            Loading…
          </div>
        ) : !detail ? (
          <div className="p-4 text-muted">Failed to load.</div>
        ) : (
          <>
            <ul className="nav nav-tabs px-3 pt-2">
              {["profile", "permissions", "shift", "audit", "activity", "disciplinary"].map((t) => (
                <li key={t} className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${tab === t ? "active" : ""}`}
                    onClick={() => setTab(t)}
                  >
                    {t === "shift" ? "Shift & Login" : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                </li>
              ))}
            </ul>
            <div className="p-3">
              {tab === "profile" && (
                <>
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <div
                      className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center"
                      style={{ width: 48, height: 48, fontSize: 18 }}
                    >
                      {getInitials(nameFrom({ user }))}
                    </div>
                    <div>
                      <strong>{nameFrom({ user })}</strong>
                      <div className="text-muted small">
                        {user?.auth?.email ?? "—"} {user?.auth?.phone ? ` · ${user.auth.phone}` : ""}
                      </div>
                    </div>
                  </div>
                  <p className="mb-1 small text-muted">Last login: {formatDate(detail?.lastLoginAt ?? user?.auth?.lastLoginAt)}</p>
                  <p className="mb-2 small">Assigned branch(es) & reporting manager:</p>
                  <ul className="list-unstyled small">
                    {memberships.map((m) => (
                      <li key={m.id} className="mb-2">
                        <Link href={`/owner/branches/${m.branchId}`} className="text-decoration-none">
                          {m.branch?.name ?? `Branch #${m.branchId}`}
                        </Link>
                        <span className="text-muted"> · {m.org?.name}</span>
                        <span className="badge bg-secondary ms-1">{roleLabel(m.role)}</span>
                        <StatusBadge status={m.status} className="ms-1" />
                        {m.reportingManager && (
                          <div className="text-muted mt-1">Reports to: {m.reportingManager.displayName || m.reportingManager.email || "—"}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3">
                    <label className="form-label small">Change role</label>
                    <div className="d-flex gap-2">
                      <select
                        className="form-select form-select-sm"
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                      >
                        <option value="BRANCH_STAFF">Branch Staff</option>
                        <option value="SELLER">Seller</option>
                        <option value="BRANCH_MANAGER">Branch Manager</option>
                        <option value="DELIVERY_STAFF">Delivery Staff</option>
                        <option value="DELIVERY_MANAGER">Delivery Manager</option>
                      </select>
                      <button type="button" className="btn btn-primary btn-sm" onClick={handleChangeRole}>
                        Apply
                      </button>
                    </div>
                  </div>
                </>
              )}
              {tab === "permissions" && (
                <>
                  <p className="small text-muted mb-2">Permission overrides (comma-separated keys).</p>
                  <div className="mb-2">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. pos.access, discount.limit, inventory.edit"
                      value={permOverrides}
                      onChange={(e) => setPermOverrides(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleSavePermissions}
                    disabled={savingPerms}
                  >
                    {savingPerms ? "Saving…" : "Save"}
                  </button>
                  {access.length > 0 && (
                    <div className="mt-3 small">
                      <strong>Current access:</strong>
                      {access.map((a) => (
                        <div key={a.id}>
                          {a.branch?.name} — {a.status}
                          {a.permissionOverrides && ` · Overrides: ${JSON.stringify(a.permissionOverrides)}`}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              {tab === "shift" && (
                <>
                  <p className="small text-muted mb-2">Login time window (e.g. 09:00–18:00). Leave empty for no restriction.</p>
                  <div className="row g-2 mb-2">
                    <div className="col-6">
                      <label className="form-label small">From</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="09:00"
                        value={loginStart}
                        onChange={(e) => setLoginStart(e.target.value)}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small">Until</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="18:00"
                        value={loginEnd}
                        onChange={(e) => setLoginEnd(e.target.value)}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleSaveShiftRules}
                    disabled={savingPerms}
                  >
                    {savingPerms ? "Saving…" : "Save shift rules"}
                  </button>
                </>
              )}
              {tab === "audit" && (
                <div className="small">
                  <p className="text-muted mb-2">Last 50 actions by or on this staff.</p>
                  <div className="overflow-auto" style={{ maxHeight: 320 }}>
                    {auditLogs.length === 0 ? (
                      <p className="text-muted">No audit entries.</p>
                    ) : (
                      <ul className="list-unstyled">
                        {auditLogs.map((log) => (
                          <li key={log.id} className="border-bottom py-2">
                            <strong>{log.action}</strong>
                            <span className="text-muted"> · {log.entityType}:{log.entityId}</span>
                            <div className="text-muted">{formatDate(log.createdAt)} · IP: {log.ip ?? "—"}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
              {tab === "activity" && (
                <div className="small">
                  {activity ? (
                    <>
                      <p className="mb-2">Last 30 days activity.</p>
                      <ul className="list-unstyled">
                        <li>Orders processed: {activity.last30Days?.ordersProcessed ?? 0}</li>
                        <li>Orders cancelled: {activity.last30Days?.ordersCancelled ?? 0}</li>
                        <li>Inventory actions: {activity.last30Days?.inventoryActions ?? 0}</li>
                      </ul>
                      {activity.flags && (
                        <div className="mt-2">
                          <strong>Flags:</strong>
                          <ul className="list-unstyled mb-0">
                            {activity.flags.excessiveCancels && <li className="text-warning">Excessive cancels</li>}
                            {activity.flags.noActivity && <li className="text-muted">No activity</li>}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-muted">No activity data.</p>
                  )}
                </div>
              )}
              {tab === "disciplinary" && (
                <>
                  <p className="small text-muted mb-2">Transfer branch (revokes current branch access).</p>
                  <div className="row g-2 mb-2">
                    <div className="col-6">
                      <label className="form-label small">From branch</label>
                      <select
                        className="form-select form-select-sm"
                        value={transferFrom}
                        onChange={(e) => setTransferFrom(e.target.value)}
                      >
                        <option value="">Select</option>
                        {memberships.map((m) => (
                          <option key={m.branchId} value={m.branchId}>{m.branch?.name ?? m.branchId}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label small">To branch</label>
                      <select
                        className="form-select form-select-sm"
                        value={transferTo}
                        onChange={(e) => setTransferTo(e.target.value)}
                      >
                        <option value="">Select</option>
                        {branches.filter((b) => String(b.id) !== String(transferFrom)).map((b) => (
                          <option key={b.id} value={b.id}>{b.name ?? `Branch #${b.id}`}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button type="button" className="btn btn-outline-primary btn-sm me-2" onClick={handleTransfer}>
                    Transfer
                  </button>
                  <p className="small text-muted mt-3 mb-2">Warning notes (for your reference).</p>
                  <textarea
                    className="form-control form-control-sm"
                    rows={2}
                    placeholder="Warning note…"
                    value={warningNote}
                    onChange={(e) => setWarningNote(e.target.value)}
                  />
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function StaffControlDashboardPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [branches, setBranches] = useState([]);
  const [filters, setFilters] = useState({ branchId: "", role: "", status: "", lastActiveFrom: "" });
  const [drawerUserId, setDrawerUserId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState("profile");

  const fetchStaff = () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (filters.branchId) q.set("branchId", filters.branchId);
    if (filters.role) q.set("role", filters.role);
    if (filters.status) q.set("status", filters.status);
    if (filters.lastActiveFrom) q.set("lastActiveFrom", filters.lastActiveFrom);
    ownerGet(`${API_BASE}/staff?${q.toString()}`)
      .then((res) => {
        const data = res?.data ?? res;
        setItems(data?.items ?? []);
        setError("");
      })
      .catch((e) => {
        setError(e?.message ?? "Failed to load staff");
        setItems([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStaff();
  }, [filters.branchId, filters.role, filters.status, filters.lastActiveFrom]);

  useEffect(() => {
    ownerGet(`${API_BASE}/branches`)
      .then((res) => {
        const list = res?.data ?? (Array.isArray(res) ? res : []);
        setBranches(Array.isArray(list) ? list : []);
      })
      .catch(() => setBranches([]));
  }, []);

  const handleStatus = async (userId, currentStatus) => {
    const next = currentStatus === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    if (!confirm(next === "SUSPENDED" ? "Suspend this staff?" : "Resume this staff?")) return;
    try {
      await ownerPatch(`${API_BASE}/staff/${userId}/status`, { status: next });
      fetchStaff();
      if (drawerUserId === userId) setDrawerOpen(false);
    } catch (e) {
      alert(e?.message ?? "Failed");
    }
  };

  const handleForceLogout = async (userId) => {
    if (!confirm("Force logout this staff from all devices?")) return;
    try {
      await ownerPost(`${API_BASE}/staff/${userId}/force-logout`, {});
      fetchStaff();
    } catch (e) {
      alert(e?.message ?? "Failed");
    }
  };

  const openDrawer = (userId, initialTab = "profile") => {
    setDrawerUserId(userId);
    setDrawerTab(initialTab);
    setDrawerOpen(true);
  };

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Staff Control Dashboard"
        subtitle="Monitor, control access, enforce shifts, and take disciplinary actions"
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Dashboards", href: "/owner/dashboard" },
          { label: "Staff", href: "/owner/dashboards/staff" },
        ]}
        actions={[
          <button
            key="refresh"
            type="button"
            className="btn btn-outline-secondary radius-12"
            onClick={() => fetchStaff()}
            disabled={loading}
          >
            <i className="ri-refresh-line me-1" />
            Refresh
          </button>,
        ]}
      />

      <div className="card radius-12 mb-24">
        <div className="card-body p-24">
          <div className="row g-3">
            <div className="col-12 col-md-2">
              <label className="form-label small">Branch</label>
              <select
                className="form-select form-select-sm radius-12"
                value={filters.branchId}
                onChange={(e) => setFilters((f) => ({ ...f, branchId: e.target.value }))}
              >
                <option value="">All</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name ?? `Branch #${b.id}`}</option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-2">
              <label className="form-label small">Role</label>
              <select
                className="form-select form-select-sm radius-12"
                value={filters.role}
                onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}
              >
                <option value="">All</option>
                <option value="BRANCH_STAFF">Branch Staff</option>
                <option value="SELLER">Seller</option>
                <option value="BRANCH_MANAGER">Branch Manager</option>
                <option value="DELIVERY_STAFF">Delivery Staff</option>
                <option value="DELIVERY_MANAGER">Delivery Manager</option>
              </select>
            </div>
            <div className="col-12 col-md-2">
              <label className="form-label small">Status</label>
              <select
                className="form-select form-select-sm radius-12"
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="">All</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="INVITED">Invited</option>
              </select>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label small">Last active from (date)</label>
              <input
                type="date"
                className="form-control form-control-sm radius-12"
                value={filters.lastActiveFrom}
                onChange={(e) => setFilters((f) => ({ ...f, lastActiveFrom: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <p className="text-muted mt-2 mb-0">Loading staff…</p>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <i className="ri-team-line fs-1 text-muted d-block mb-2" />
            <p className="text-muted mb-0">No staff found.</p>
          </div>
        </div>
      ) : (
        <div className="card radius-12 border-0 shadow-sm">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table align-middle mb-0 table-hover">
                <thead className="table-light">
                  <tr>
                    <th style={{ padding: "16px 20px", fontWeight: 600 }}>Name</th>
                    <th style={{ padding: "16px 20px", fontWeight: 600 }}>Email</th>
                    <th style={{ padding: "16px 20px", fontWeight: 600 }}>Role</th>
                    <th style={{ padding: "16px 20px", fontWeight: 600 }}>Assigned Branch(s)</th>
                    <th style={{ padding: "16px 20px", fontWeight: 600 }}>Reporting Manager</th>
                    <th style={{ padding: "16px 20px", fontWeight: 600 }}>Status</th>
                    <th style={{ padding: "16px 20px", fontWeight: 600 }}>Last Login</th>
                    <th className="text-end" style={{ padding: "16px 20px", fontWeight: 600, width: 100 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const firstBranch = item.branches?.[0];
                    const reporting = firstBranch?.reportingManager;
                    return (
                      <tr key={item.userId}>
                        <td style={{ padding: "16px 20px" }}>
                          <div className="d-flex align-items-center gap-2">
                            <div
                              className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center"
                              style={{ width: 36, height: 36, fontSize: 14 }}
                            >
                              {getInitials(nameFrom(item))}
                            </div>
                            <span className="fw-medium">{nameFrom(item)}</span>
                          </div>
                        </td>
                        <td style={{ padding: "16px 20px" }}>
                          {item?.user?.auth?.email ? (
                            <a href={`mailto:${item.user.auth.email}`} className="text-decoration-none small">
                              {item.user.auth.email}
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td style={{ padding: "16px 20px" }}>
                          {item.branches?.length
                            ? item.branches.map((b) => (
                                <span key={b.branchId} className="badge bg-secondary me-1">{roleLabel(b.role)}</span>
                              ))
                            : "—"}
                        </td>
                        <td style={{ padding: "16px 20px" }}>
                          {item.branches?.length
                            ? item.branches.map((b) => (
                                <span key={b.branchId} className="me-1">
                                  <Link href={`/owner/branches/${b.branchId}`} className="text-decoration-none small">
                                    {b.branchName || `#${b.branchId}`}
                                  </Link>
                                </span>
                              ))
                            : "—"}
                        </td>
                        <td style={{ padding: "16px 20px" }} className="small text-muted">
                          {reporting ? (reporting.displayName || reporting.email || "—") : "—"}
                        </td>
                        <td style={{ padding: "16px 20px" }}>
                          <StatusBadge status={item.status} />
                        </td>
                        <td style={{ padding: "16px 20px" }} className="small text-muted">
                          {formatDate(item.lastLoginAt)}
                        </td>
                        <td className="text-end" style={{ padding: "16px 20px" }} onClick={(e) => e.stopPropagation()}>
                          <ActionDropdown
                            item={item}
                            actions={[
                              { label: "View Profile", onClick: () => openDrawer(item.userId), icon: "ri-eye-line" },
                              { divider: true },
                              {
                                label: item.status === "SUSPENDED" ? "Resume" : "Suspend",
                                onClick: () => handleStatus(item.userId, item.status),
                                icon: item.status === "SUSPENDED" ? "ri-play-line" : "ri-pause-line",
                                variant: item.status === "SUSPENDED" ? "success" : "warning",
                              },
                              { label: "Force Logout", onClick: () => handleForceLogout(item.userId), icon: "ri-logout-box-r-line", variant: "danger" },
                              { divider: true },
                              { label: "Transfer Branch", onClick: () => openDrawer(item.userId, "disciplinary"), icon: "ri-arrow-left-right-line" },
                              { label: "Change Role", onClick: () => openDrawer(item.userId, "profile"), icon: "ri-user-settings-line" },
                              { label: "Permissions & Shift", onClick: () => openDrawer(item.userId, "permissions"), icon: "ri-settings-3-line" },
                            ]}
                          />
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

      {drawerOpen && (
        <>
          <div className="offcanvas-backdrop show" onClick={() => setDrawerOpen(false)} />
          <StaffDetailDrawer
            staffUserId={drawerUserId}
            branches={branches}
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            onUpdated={fetchStaff}
            initialTab={drawerTab}
          />
        </>
      )}
    </div>
  );
}
