"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import PageHeader from "@/src/bpa/components/PageHeader";
import { apiGet } from "@/lib/api";
import SectionCard from "@/src/bpa/admin/components/SectionCard";
import StatCard from "@/src/bpa/admin/components/StatCard";
import FilterPanel from "@/src/bpa/admin/components/FilterPanel";
import StatusChip from "@/src/bpa/admin/components/StatusChip";

const STATUS = ["", "PENDING_REVIEW", "APPROVED", "REJECTED", "SUSPENDED"];

export default function AdminOrganizationsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiGet("/api/v1/admin/organizations");
      setRows(res?.data ?? []);
    } catch (e) {
      setError(e?.message ?? "Failed to load organizations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const items = Array.isArray(rows) ? rows : [];
    return items.filter((r) => {
      const okStatus = !status || String(r.status || "").toUpperCase() === status;
      if (!okStatus) return false;
      if (!q) return true;
      const hay = `${r.name ?? ""} ${r.supportPhone ?? ""} ${r.ownerUserId ?? ""}`.toLowerCase();
      return hay.includes(String(q).toLowerCase());
    });
  }, [rows, status, q]);

  const kpis = useMemo(() => {
    const items = Array.isArray(rows) ? rows : [];
    const active = items.filter((r) => String(r.status || "").toUpperCase() === "APPROVED").length;
    const pending = items.filter((r) => String(r.status || "").toUpperCase() === "PENDING_REVIEW").length;
    return { total: items.length, active, pending };
  }, [rows]);

  return (
    <div className="container-fluid">
      <PageHeader
        title="Organizations"
        subtitle="Review organizations, owner info, and verification status."
        right={
          <button
            type="button"
            className="btn btn-outline-primary d-flex align-items-center gap-2"
            onClick={load}
            disabled={loading}
          >
            <Icon icon="solar:refresh-outline" />
            {loading ? "Loading" : "Refresh"}
          </button>
        }
      />

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <div className="row g-3 mb-3">
        <div className="col-6 col-md-4">
          <StatCard title="Total orgs" value={kpis.total} icon={<Icon icon="solar:buildings-bold" />} tone="primary" />
        </div>
        <div className="col-6 col-md-4">
          <StatCard title="Active" value={kpis.active} icon={<Icon icon="solar:verify-bold" />} tone="success" />
        </div>
        <div className="col-6 col-md-4">
          <StatCard title="Pending verification" value={kpis.pending} icon={<Icon icon="solar:clock-circle-bold" />} tone="warning" />
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-md-4 col-lg-3">
          <FilterPanel title="Filters">
            <div className="d-flex flex-column gap-2">
              <label className="small text-secondary">Status</label>
              <select className="form-select form-select-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS.map((s) => (
                  <option key={s || "all"} value={s}>{s || "All"}</option>
                ))}
              </select>
              <label className="small text-secondary mt-2">Search</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Name, phone..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </FilterPanel>
        </div>
        <div className="col-12 col-md-8 col-lg-9">
          <SectionCard title="Organizations" right={<span className="text-secondary small">{filtered.length} org(s)</span>}>
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Organization</th>
                    <th>Owner</th>
                    <th>Branches</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div className="fw-semibold">{r.name ?? "—"}</div>
                        <div className="text-secondary" style={{ fontSize: 12 }}>Org #{r.id}</div>
                      </td>
                      <td className="text-secondary" style={{ fontSize: 13 }}>
                        Owner #{r.ownerUserId ?? "—"}
                      </td>
                      <td>{r._count?.branches ?? 0}</td>
                      <td><StatusChip status={r.status} /></td>
                      <td style={{ fontSize: 13 }}>
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="text-end">
                        <Link className="btn btn-sm btn-primary" href={`/admin/organizations/${r.id}`}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {!filtered.length && !loading ? (
                    <tr>
                      <td colSpan={6} className="text-secondary text-center py-4">No organizations found.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
