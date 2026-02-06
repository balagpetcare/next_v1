"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import PageHeader from "@/src/bpa/components/PageHeader";
import { apiGet, apiPatch } from "@/lib/api";
import SectionCard from "@/src/bpa/admin/components/SectionCard";
import StatCard from "@/src/bpa/admin/components/StatCard";
import FilterPanel from "@/src/bpa/admin/components/FilterPanel";
import StatusChip from "@/src/bpa/admin/components/StatusChip";

const STATUS = ["", "DRAFT", "PENDING_REVIEW", "ACTIVE", "INACTIVE", "BLOCKED"];
const TYPE_CODES = ["", "CLINIC", "PET_SHOP", "DELIVERY_HUB", "ONLINE_HUB"];

export default function AdminBranchesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [orgId, setOrgId] = useState("");
  const [typeCode, setTypeCode] = useState("");
  const [q, setQ] = useState("");
  const [pauseModal, setPauseModal] = useState({ open: false, branch: null, reason: "" });
  const [pauseLoading, setPauseLoading] = useState(false);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    if (orgId) p.set("orgId", orgId);
    if (q) p.set("q", q);
    return p.toString() ? `?${p.toString()}` : "";
  }, [status, orgId, q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await apiGet(`/api/v1/admin/branches${query}`);
      setRows(r?.data ?? []);
    } catch (e) {
      setError(e?.message ?? "Failed to load branches");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let result = rows;
    if (typeCode) {
      result = result.filter((r) =>
        (r.typeLinks ?? []).some((t) => t.branchType?.code === typeCode)
      );
    }
    return result;
  }, [rows, typeCode]);

  const kpis = useMemo(() => {
    const active = rows.filter((r) => String(r.status) === "ACTIVE").length;
    const paused = rows.filter((r) => ["INACTIVE", "BLOCKED"].includes(String(r.status))).length;
    return { total: rows.length, active, paused };
  }, [rows]);

  const handlePause = async () => {
    const b = pauseModal.branch;
    if (!b) return;
    setPauseLoading(true);
    try {
      await apiPatch(`/api/v1/admin/branches/${b.id}`, {
        status: "INACTIVE",
        ...(pauseModal.reason.trim() ? { featuresJson: { ...(b.featuresJson || {}), pauseReason: pauseModal.reason.trim(), pausedAt: new Date().toISOString() } } : {}),
      });
      setPauseModal({ open: false, branch: null, reason: "" });
      await load();
    } catch (e) {
      alert(e?.message ?? "Pause failed");
    } finally {
      setPauseLoading(false);
    }
  };

  return (
    <div className="container-fluid">
      <PageHeader
        title="Branches"
        subtitle="Search, filter, and manage branches. Pause operations or open staff roster."
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
          <StatCard title="Total branches" value={kpis.total} icon={<Icon icon="solar:shop-2-bold" />} tone="primary" />
        </div>
        <div className="col-6 col-md-4">
          <StatCard title="Active" value={kpis.active} icon={<Icon icon="solar:verify-bold" />} tone="success" />
        </div>
        <div className="col-6 col-md-4">
          <StatCard title="Paused / inactive" value={kpis.paused} icon={<Icon icon="solar:pause-circle-bold" />} tone="warning" />
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
              <label className="small text-secondary mt-2">Type</label>
              <select className="form-select form-select-sm" value={typeCode} onChange={(e) => setTypeCode(e.target.value)}>
                {TYPE_CODES.map((c) => (
                  <option key={c || "all"} value={c}>{c || "All"}</option>
                ))}
              </select>
              <label className="small text-secondary mt-2">Org ID</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Org ID"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
              />
              <label className="small text-secondary mt-2">Search</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Name, code..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </FilterPanel>
        </div>
        <div className="col-12 col-md-8 col-lg-9">
          <SectionCard title="Branches" right={<span className="text-secondary small">{filtered.length} branch(es)</span>}>
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Branch</th>
                    <th>Organization</th>
                    <th>Types</th>
                    <th>Status</th>
                    <th>Verification</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const types = (r.typeLinks ?? [])
                      .map((t) => t.branchType?.code)
                      .filter(Boolean)
                      .join(", ");
                    return (
                      <tr key={r.id}>
                        <td>
                          <div className="fw-semibold">{r.name ?? "—"}</div>
                          <div className="text-secondary" style={{ fontSize: 12 }}>Branch #{r.id}</div>
                        </td>
                        <td>
                          <div>{r.org?.name ?? "—"}</div>
                          <div className="text-secondary" style={{ fontSize: 12 }}>Org #{r.orgId ?? "—"}</div>
                        </td>
                        <td>
                          {types ? (
                            <span className="badge bg-primary bg-opacity-25">{types}</span>
                          ) : (
                            <span className="text-secondary">—</span>
                          )}
                        </td>
                        <td><StatusChip status={r.status} /></td>
                        <td><StatusChip status={r.verificationStatus} /></td>
                        <td className="text-end">
                          <div className="d-flex gap-1 justify-content-end flex-wrap">
                            <Link className="btn btn-sm btn-primary" href={`/admin/branches/${r.id}`}>
                              View
                            </Link>
                            <Link
                              className="btn btn-sm btn-outline-secondary"
                              href={`/admin/branches/${r.id}#staff`}
                              title="Staff roster"
                            >
                              <Icon icon="solar:users-group-rounded-bold" />
                            </Link>
                            {r.status === "ACTIVE" && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-warning"
                                title="Pause operations"
                                onClick={() => setPauseModal({ open: true, branch: r, reason: "" })}
                              >
                                <Icon icon="solar:pause-circle-bold" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!filtered.length && !loading ? (
                    <tr>
                      <td colSpan={6} className="text-secondary text-center py-4">No branches found.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      </div>

      {pauseModal.open && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.5)" }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded">
              <div className="modal-header">
                <h5 className="modal-title">Pause operations</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setPauseModal({ open: false, branch: null, reason: "" })}
                  aria-label="Close"
                />
              </div>
              <div className="modal-body">
                <p className="mb-2">
                  Pause operations for <strong>{pauseModal.branch?.name ?? "—"}</strong>? Set status to Inactive.
                </p>
                <label className="form-label small">Reason (optional)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Reason for pausing…"
                  value={pauseModal.reason}
                  onChange={(e) => setPauseModal((s) => ({ ...s, reason: e.target.value }))}
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setPauseModal({ open: false, branch: null, reason: "" })}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-warning"
                  onClick={handlePause}
                  disabled={pauseLoading}
                >
                  {pauseLoading ? "Pausing..." : "Pause"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
