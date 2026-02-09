"use client";

import { useState, useEffect, useMemo } from "react";
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

/** Manager detail drawer: profile, branches, permissions, audit, performance, disciplinary */
function ManagerDetailDrawer({ managerUserId, open, onClose, onUpdated, initialTab = "profile" }) {
  const [detail, setDetail] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [permOverrides, setPermOverrides] = useState("");
  const [loginStart, setLoginStart] = useState("");
  const [loginEnd, setLoginEnd] = useState("");
  const [savingPerms, setSavingPerms] = useState(false);
  const [warningNote, setWarningNote] = useState("");

  useEffect(() => {
    if (!open || !managerUserId) return;
    setLoading(true);
    Promise.all([
      ownerGet(`${API_BASE}/branch-managers/${managerUserId}`),
      ownerGet(`${API_BASE}/branch-managers/${managerUserId}/audit-logs?limit=50`),
      ownerGet(`${API_BASE}/branch-managers/${managerUserId}/performance`),
    ])
      .then(([detailRes, logsRes, perfRes]) => {
        const d = detailRes?.data ?? detailRes;
        const logs = Array.isArray(logsRes?.data) ? logsRes.data : Array.isArray(logsRes) ? logsRes : [];
        const perf = perfRes?.data ?? perfRes;
        setDetail(d);
        setAuditLogs(logs);
        setPerformance(perf);
        const firstPerm = d?.branchAccess?.[0];
        if (firstPerm) {
          const over = firstPerm.permissionOverrides;
          setPermOverrides(Array.isArray(over) ? over.join(", ") : "");
          setLoginStart(firstPerm.loginWindowStart ?? "");
          setLoginEnd(firstPerm.loginWindowEnd ?? "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, managerUserId]);
  useEffect(() => {
    if (open && initialTab) setTab(initialTab);
  }, [open, initialTab]);

  const handleSavePermissions = async () => {
    if (!managerUserId) return;
    setSavingPerms(true);
    try {
      await ownerPatch(`${API_BASE}/branch-managers/${managerUserId}/permissions`, {
        permissionOverrides: permOverrides.trim() ? permOverrides.split(/,\s*/).filter(Boolean) : null,
        loginWindowStart: loginStart.trim() || null,
        loginWindowEnd: loginEnd.trim() || null,
      });
      onUpdated?.();
      const res = await ownerGet(`${API_BASE}/branch-managers/${managerUserId}`);
      const d = res?.data ?? res;
      setDetail(d);
    } catch (e) {
      alert(e?.message ?? "Failed to update");
    } finally {
      setSavingPerms(false);
    }
  };

  if (!open) return null;

  const user = detail?.user;
  const branches = detail?.memberships ?? [];
  const access = detail?.branchAccess ?? [];

  return (
    <div
      className="offcanvas offcanvas-end show"
      style={{ width: "min(480px, 100vw)", visibility: "visible" }}
      tabIndex={-1}
    >
      <div className="offcanvas-header border-bottom">
        <h5 className="offcanvas-title">Branch Manager Details</h5>
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
              {["profile", "permissions", "audit", "performance", "disciplinary"].map((t) => (
                <li key={t} className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${tab === t ? "active" : ""}`}
                    onClick={() => setTab(t)}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
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
                  <p className="mb-2 small">Assigned branches:</p>
                  <ul className="list-unstyled small">
                    {branches.map((m) => (
                      <li key={m.id}>
                        <Link href={`/owner/branches/${m.branchId}`} className="text-decoration-none">
                          {m.branch?.name ?? `Branch #${m.branchId}`}
                        </Link>
                        <span className="text-muted"> · {m.org?.name}</span>
                        <StatusBadge status={m.status} className="ms-1" />
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {tab === "permissions" && (
                <>
                  <p className="small text-muted mb-2">Override permissions (comma-separated keys) and optional login time window.</p>
                  <div className="mb-2">
                    <label className="form-label small">Permission overrides</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. inventory.write, orders.cancel"
                      value={permOverrides}
                      onChange={(e) => setPermOverrides(e.target.value)}
                    />
                  </div>
                  <div className="row g-2 mb-2">
                    <div className="col-6">
                      <label className="form-label small">Login from (e.g. 09:00)</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="09:00"
                        value={loginStart}
                        onChange={(e) => setLoginStart(e.target.value)}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small">Login until (e.g. 18:00)</label>
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
              {tab === "audit" && (
                <div className="small">
                  <p className="text-muted mb-2">Last 50 actions by or on this manager.</p>
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
              {tab === "performance" && (
                <div className="small">
                  {performance ? (
                    <>
                      <p className="mb-2">Branch performance snapshot (today).</p>
                      <ul className="list-unstyled">
                        <li className="mb-2">Orders today: {performance.summary?.totalOrdersToday ?? 0}</li>
                        <li className="mb-2">Sales today: {performance.summary?.totalSalesToday ?? 0}</li>
                        <li className="mb-2">Inventory alerts: {performance.summary?.totalInventoryAlerts ?? 0}</li>
                      </ul>
                      {performance.branches?.length > 0 && (
                        <table className="table table-sm">
                          <thead>
                            <tr>
                              <th>Branch</th>
                              <th>Orders</th>
                              <th>Sales</th>
                              <th>Alerts</th>
                            </tr>
                          </thead>
                          <tbody>
                            {performance.branches.map((b) => (
                              <tr key={b.branchId}>
                                <td>{b.name}</td>
                                <td>{b.ordersToday}</td>
                                <td>{b.salesToday}</td>
                                <td>{b.inventoryAlerts}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </>
                  ) : (
                    <p className="text-muted">No performance data.</p>
                  )}
                </div>
              )}
              {tab === "disciplinary" && (
                <>
                  <p className="small text-muted mb-2">Warning notes (stored for your reference; attach to manager record).</p>
                  <textarea
                    className="form-control form-control-sm mb-2"
                    rows={2}
                    placeholder="Warning note…"
                    value={warningNote}
                    onChange={(e) => setWarningNote(e.target.value)}
                  />
                  <p className="small text-muted">
                    To suspend this manager use the &quot;Suspend&quot; action in the list. To revoke branch access, use Branch Access in the owner panel.
                  </p>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function BranchManagerDashboardPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [branches, setBranches] = useState([]);
  const [filters, setFilters] = useState({ branchId: "", status: "", lastActiveFrom: "" });
  const [drawerUserId, setDrawerUserId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState("profile");

  const fetchManagers = () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (filters.branchId) q.set("branchId", filters.branchId);
    if (filters.status) q.set("status", filters.status);
    if (filters.lastActiveFrom) q.set("lastActiveFrom", filters.lastActiveFrom);
    ownerGet(`${API_BASE}/branch-managers?${q.toString()}`)
      .then((res) => {
        const data = res?.data ?? res;
        const list = data?.items ?? [];
        setItems(list);
        setError("");
      })
      .catch((e) => {
        setError(e?.message ?? "Failed to load branch managers");
        setItems([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchManagers();
  }, [filters.branchId, filters.status, filters.lastActiveFrom]);

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
    if (!confirm(next === "SUSPENDED" ? "Suspend this manager?" : "Resume this manager?")) return;
    try {
      await ownerPatch(`${API_BASE}/branch-managers/${userId}/status`, { status: next });
      fetchManagers();
      if (drawerUserId === userId) setDrawerUserId(null);
    } catch (e) {
      alert(e?.message ?? "Failed");
    }
  };

  const handleForceLogout = async (userId) => {
    if (!confirm("Force logout this manager from all devices?")) return;
    try {
      await ownerPost(`${API_BASE}/branch-managers/${userId}/force-logout`, {});
      fetchManagers();
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
        title="Branch Manager Control"
        subtitle="Monitor, control, restrict, and audit Branch Managers"
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Dashboards", href: "/owner/dashboard" },
          { label: "Branch Manager", href: "/owner/dashboards/branch-manager" },
        ]}
        actions={[
          <button
            key="refresh"
            type="button"
            className="btn btn-outline-secondary radius-12"
            onClick={() => fetchManagers()}
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
            <div className="col-12 col-md-3">
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
            <p className="text-muted mt-2 mb-0">Loading branch managers…</p>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <i className="ri-user-search-line fs-1 text-muted d-block mb-2" />
            <p className="text-muted mb-0">No branch managers found.</p>
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
                    <th style={{ padding: "16px 20px", fontWeight: 600 }}>Assigned Branch(s)</th>
                    <th style={{ padding: "16px 20px", fontWeight: 600 }}>Status</th>
                    <th style={{ padding: "16px 20px", fontWeight: 600 }}>Last Login</th>
                    <th className="text-end" style={{ padding: "16px 20px", fontWeight: 600, width: 100 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
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
                              <span key={b.branchId} className="me-1">
                                <Link href={`/owner/branches/${b.branchId}`} className="text-decoration-none small">
                                  {b.branchName || `#${b.branchId}`}
                                </Link>
                              </span>
                            ))
                          : "—"}
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
                            { label: "View Details", onClick: () => openDrawer(item.userId), icon: "ri-eye-line" },
                            { divider: true },
                            {
                              label: item.status === "SUSPENDED" ? "Resume" : "Suspend",
                              onClick: () => handleStatus(item.userId, item.status),
                              icon: item.status === "SUSPENDED" ? "ri-play-line" : "ri-pause-line",
                              variant: item.status === "SUSPENDED" ? "success" : "warning",
                            },
                            {
                              label: "Force Logout",
                              onClick: () => handleForceLogout(item.userId),
                              icon: "ri-logout-box-r-line",
                              variant: "danger",
                            },
                            { divider: true },
                            {
                              label: "Restrict Login Time / Permissions",
                              onClick: () => openDrawer(item.userId, "permissions"),
                              icon: "ri-settings-3-line",
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {drawerOpen && (
        <>
          <div className="offcanvas-backdrop show" onClick={() => setDrawerOpen(false)} />
          <ManagerDetailDrawer
            managerUserId={drawerUserId}
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            onUpdated={fetchManagers}
            initialTab={drawerTab}
          />
        </>
      )}
    </div>
  );
}
