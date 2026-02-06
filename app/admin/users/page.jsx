"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import PageHeader from "@/src/bpa/components/PageHeader";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import SectionCard from "@/src/bpa/admin/components/SectionCard";
import StatusChip from "@/src/bpa/admin/components/StatusChip";
import FilterPanel from "@/src/bpa/admin/components/FilterPanel";
import BulkActions from "@/src/bpa/admin/components/BulkActions";
import StatCard from "@/src/bpa/admin/components/StatCard";

const STATUS_OPTIONS = ["", "ACTIVE", "BLOCKED", "DELETED"];
const SEGMENTS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "blocked", label: "Blocked" },
  { key: "new7", label: "New (7d)" },
];

export default function UsersPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.append("q", search);
      const statusParam = segment === "active" ? "ACTIVE" : segment === "blocked" ? "BLOCKED" : status;
      if (statusParam) params.append("status", statusParam);
      if (segment === "new7") params.append("createdSince", "7");
      const r = await apiGet(`/api/v1/admin/users?${params.toString()}`);
      setRows(Array.isArray(r?.data) ? r.data : []);
    } catch (e) {
      setError(e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [search, status, segment]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let result = rows;
    if (segment === "active") result = result.filter((r) => r.status === "ACTIVE");
    else if (segment === "blocked") result = result.filter((r) => r.status === "BLOCKED");
    else if (segment === "new7") {
      const cut = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      result = result.filter((r) => new Date(r.createdAt) >= cut);
    }
    return result;
  }, [rows, segment]);

  const kpis = useMemo(() => {
    const active = rows.filter((r) => r.status === "ACTIVE").length;
    const blocked = rows.filter((r) => r.status === "BLOCKED").length;
    const cut = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const new7 = rows.filter((r) => new Date(r.createdAt) >= cut).length;
    return { active, blocked, new7 };
  }, [rows]);

  const handleStatusChange = async (userId, newStatus) => {
    if (!confirm(`Change user status to ${newStatus}?`)) return;
    try {
      await apiPatch(`/api/v1/admin/users/${userId}`, { status: newStatus });
      await load();
    } catch (e) {
      alert(e?.message || "Failed to update status");
    }
  };

  const handleForceLogout = async (userId) => {
    if (!confirm("Revoke all sessions for this user?")) return;
    try {
      await apiPost(`/api/v1/admin/users/${userId}/force-logout`, {});
      await load();
      alert("Sessions revoked.");
    } catch (e) {
      alert(e?.message || "Force logout failed");
    }
  };

  const handleBulkBlock = async (ids) => {
    if (!confirm(`Block ${ids.length} user(s)?`)) return;
    setBulkLoading(true);
    try {
      await Promise.all(ids.map((id) => apiPatch(`/api/v1/admin/users/${id}`, { status: "BLOCKED" })));
      setSelectedIds([]);
      await load();
    } catch (e) {
      alert(e?.message || "Bulk update failed");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkExport = (ids) => {
    const subset = filtered.filter((r) => ids.includes(r.id));
    const csv = ["id,displayName,email,phone,status,createdAt"].concat(
      subset.map((r) =>
        [r.id, r.displayName || "", r.email || "", r.phone || "", r.status || "", r.createdAt || ""]
          .map((s) => `"${String(s).replace(/"/g, '""')}"`)
          .join(",")
      )
    );
    const blob = new Blob([csv.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    setSelectedIds([]);
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) setSelectedIds([]);
    else setSelectedIds(filtered.map((r) => r.id));
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-BD", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="container-fluid">
      <PageHeader
        title="Users Directory"
        subtitle="Manage users, status, and access"
        right={
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <input
              type="text"
              className="form-control"
              placeholder="Search by ID, email, phone, username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 280 }}
            />
            <select
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: 140 }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s || "all"} value={s}>{s || "All status"}</option>
              ))}
            </select>
            <button
              onClick={load}
              disabled={loading}
              className="btn btn-outline-primary d-flex align-items-center gap-2"
            >
              <Icon icon="solar:refresh-outline" />
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        }
      />

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <div className="d-flex flex-wrap gap-2 mb-3">
        {SEGMENTS.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`btn btn-sm ${segment === s.key ? "btn-primary" : "btn-outline-secondary"}`}
            onClick={() => setSegment(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="row g-3 mb-3">
        <div className="col-6 col-md-4">
          <StatCard title="Active" value={kpis.active} icon={<Icon icon="solar:user-check-bold" />} tone="success" />
        </div>
        <div className="col-6 col-md-4">
          <StatCard title="Blocked" value={kpis.blocked} icon={<Icon icon="solar:user-block-bold" />} tone="danger" />
        </div>
        <div className="col-6 col-md-4">
          <StatCard title="New (7d)" value={kpis.new7} icon={<Icon icon="solar:user-plus-bold" />} tone="info" />
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-md-4 col-lg-3">
          <FilterPanel title="Filters" defaultCollapsed={false}>
            <div className="d-flex flex-column gap-2">
              <label className="small text-secondary">Status</label>
              <select className="form-select form-select-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s || "all"} value={s}>{s || "All"}</option>
                ))}
              </select>
              <label className="small text-secondary mt-2">Search</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="ID, email, phone, username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </FilterPanel>
        </div>

        <div className="col-12 col-md-8 col-lg-9">
          <SectionCard title="Users" right={<span className="text-secondary small">{filtered.length} user(s)</span>}>
            <BulkActions
              selectedIds={selectedIds}
              onClear={() => setSelectedIds([])}
              loading={bulkLoading}
              actions={[
                {
                  key: "block",
                  label: "Block",
                  variant: "btn-warning",
                  icon: "solar:user-block-bold",
                  onClick: handleBulkBlock,
                },
                {
                  key: "export",
                  label: "Export CSV",
                  variant: "btn-outline-secondary",
                  icon: "solar:export-outline",
                  onClick: handleBulkExport,
                },
              ]}
            />
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th style={{ width: 44 }}>
                      <input
                        type="checkbox"
                        checked={filtered.length > 0 && selectedIds.length === filtered.length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th>User</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Provider</th>
                    <th>Registered</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(r.id)}
                          onChange={() => toggleSelect(r.id)}
                        />
                      </td>
                      <td>
                        <div className="fw-semibold">{r.displayName || `User #${r.id}`}</div>
                        <div className="text-secondary" style={{ fontSize: 12 }}>
                          ID: {r.id} {r.username ? `• @${r.username}` : ""}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 13 }}>
                          {r.email ? (
                            <div className="d-flex align-items-center gap-1">
                              <Icon icon="solar:letter-bold" className="text-secondary" />
                              {r.email}
                            </div>
                          ) : null}
                          {r.phone ? (
                            <div className="d-flex align-items-center gap-1 mt-1">
                              <Icon icon="solar:phone-bold" className="text-secondary" />
                              {r.phone}
                            </div>
                          ) : null}
                          {!r.email && !r.phone ? <span className="text-secondary">—</span> : null}
                        </div>
                      </td>
                      <td><StatusChip status={r.status} /></td>
                      <td style={{ fontSize: 13 }}>
                        <span className="badge bg-secondary bg-opacity-25">{r.provider || "LOCAL"}</span>
                      </td>
                      <td style={{ fontSize: 13 }} className="text-secondary">
                        {formatDate(r.createdAt)}
                      </td>
                      <td className="text-end">
                        <div className="d-flex gap-1 justify-content-end flex-wrap">
                          <a className="btn btn-sm btn-primary" href={`/admin/users/${r.id}`}>
                            View
                          </a>
                          {r.status !== "ACTIVE" && (
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => handleStatusChange(r.id, "ACTIVE")}
                            >
                              Activate
                            </button>
                          )}
                          {r.status !== "BLOCKED" && (
                            <button
                              className="btn btn-sm btn-warning"
                              onClick={() => handleStatusChange(r.id, "BLOCKED")}
                            >
                              Block
                            </button>
                          )}
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleForceLogout(r.id)}
                            title="Force logout"
                          >
                            <Icon icon="solar:logout-2-bold" />
                          </button>
                          <a className="btn btn-sm btn-outline-secondary" href={`/admin/audit?actor=${r.id}`} title="Audit">
                            <Icon icon="solar:clipboard-list-bold" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filtered.length && !loading ? (
                    <tr>
                      <td colSpan={7} className="text-secondary text-center" style={{ fontSize: 13 }}>
                        No users found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            {loading ? <div className="text-center text-secondary py-3">Loading...</div> : null}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
