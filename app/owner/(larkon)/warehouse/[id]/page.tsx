"use client";

// PHASE 2 FINAL CLEANUP: Warehouse detail page loads branch-backed data primarily
// The warehouseById API now resolves warehouse IDs to branch data as the canonical source
// Legacy warehouse records accessed only for backward compatibility

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { warehouseById, warehouseUpdate, warehouseDashboard } from "@/lib/api";

function QcSettingsMini({
  warehouseId,
  wh,
  onUpdated,
}: {
  warehouseId: number;
  wh: any;
  onUpdated: (w: any) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [thr, setThr] = useState(wh?.qcEscalationFailedQtyThreshold ?? "");
  const [poMin, setPoMin] = useState(wh?.poReceiveEscalationMinTotal ?? "");

  async function toggleQc() {
    setSaving(true);
    try {
      const u = await warehouseUpdate(warehouseId, { qcInboundEnabled: !wh.qcInboundEnabled });
      onUpdated(u);
    } catch (e: any) {
      alert(e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveThresholds() {
    setSaving(true);
    try {
      const u = await warehouseUpdate(warehouseId, {
        qcEscalationFailedQtyThreshold: thr === "" ? null : Number(thr),
        poReceiveEscalationMinTotal: poMin === "" ? null : Number(poMin),
      });
      onUpdated(u);
      alert("Saved");
    } catch (e: any) {
      alert(e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-top pt-3 mt-2">
      <div className="small text-muted mb-2">QC & escalation (warehouse)</div>
      <button type="button" className="btn btn-sm btn-outline-primary me-2" disabled={saving} onClick={toggleQc}>
        {wh.qcInboundEnabled ? "Turn off inbound QC" : "Enable inbound QC"}
      </button>
      <div className="row g-2 align-items-end mt-2">
        <div className="col-6 col-md-4">
          <label className="form-label small mb-0">Fail qty escalation ≥</label>
          <input className="form-control form-control-sm" value={thr} onChange={(e) => setThr(e.target.value)} placeholder="e.g. 10" />
        </div>
        <div className="col-6 col-md-4">
          <label className="form-label small mb-0">PO grand total alert ≥</label>
          <input className="form-control form-control-sm" value={poMin} onChange={(e) => setPoMin(e.target.value)} placeholder="Optional" />
        </div>
        <div className="col-12 col-md-4">
          <button type="button" className="btn btn-sm btn-secondary" disabled={saving} onClick={saveThresholds}>
            Save thresholds
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OwnerWarehouseDetailPage() {
  const params = useParams();
  const warehouseId = Number(params?.id);

  const [wh, setWh] = useState<any>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!warehouseId) return;
    let cancelled = false;
    (async () => {
      try {
        const [whData, dashData] = await Promise.all([
          warehouseById(warehouseId),
          warehouseDashboard(warehouseId).catch(() => null),
        ]);
        if (cancelled) return;
        setWh(whData);
        setDashboard(dashData);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load warehouse");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [warehouseId]);

  async function toggleActive() {
    if (!wh) return;
    setToggling(true);
    try {
      const updated = await warehouseUpdate(warehouseId, { isActive: !wh.isActive });
      setWh(updated);
    } catch (e: any) {
      alert(e?.message || "Failed to update");
    } finally {
      setToggling(false);
    }
  }

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-2 text-muted">Loading warehouse…</p>
      </div>
    );
  }

  if (error || !wh) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger">{error || "Warehouse not found"}</div>
        <Link href="/owner/warehouse" className="btn btn-outline-secondary">← Back</Link>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link href="/owner/warehouse" className="text-muted text-decoration-none small">
            ← All Warehouses
          </Link>
          <h4 className="mb-0 mt-1">{wh.name}</h4>
          {wh.code && <span className="text-muted small">Code: {wh.code}</span>}
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button className="btn btn-sm btn-outline-secondary" onClick={toggleActive} disabled={toggling}>
            {wh.isActive ? "Deactivate" : "Activate"}
          </button>
          <Link href={`/owner/warehouse/${warehouseId}/staff`} className="btn btn-sm btn-primary">
            <i className="ti ti-users me-1" />Manage Staff
          </Link>
          <Link href={`/owner/warehouse/${warehouseId}/dispatches`} className="btn btn-sm btn-outline-primary">
            <i className="ti ti-package me-1" />Dispatches
          </Link>
          <Link href={`/owner/warehouse/${warehouseId}/delivery`} className="btn btn-sm btn-outline-primary">
            <i className="ti ti-truck me-1" />Delivery
          </Link>
          <Link href={`/owner/warehouse/${warehouseId}/operations`} className="btn btn-sm btn-success">
            <i className="ti ti-layout-kanban me-1" />Operations
          </Link>
          <Link href={`/owner/warehouse/${warehouseId}/zones`} className="btn btn-sm btn-outline-secondary">
            Zones
          </Link>
          <Link href={`/owner/warehouse/${warehouseId}/qc`} className="btn btn-sm btn-outline-secondary">
            QC
          </Link>
          <Link href={`/owner/warehouse/${warehouseId}/quarantine`} className="btn btn-sm btn-outline-secondary">
            Quarantine
          </Link>
          <Link href={`/owner/warehouse/${warehouseId}/audit`} className="btn btn-sm btn-outline-secondary">
            Audit
          </Link>
        </div>
      </div>

      {/* Dashboard KPIs */}
      {dashboard && (
        <div className="row g-3 mb-4">
          {[
            { label: "Locations", value: dashboard.totalLocations, icon: "ti-map-pin", color: "primary" },
            { label: "Active Staff", value: dashboard.activeStaff, icon: "ti-users", color: "success" },
            { label: "Pending Dispatches", value: dashboard.pendingDispatches, icon: "ti-package", color: "warning" },
            { label: "In Transit", value: dashboard.inTransitDispatches, icon: "ti-truck", color: "info" },
            { label: "Recent GRNs (7d)", value: dashboard.recentGrns, icon: "ti-clipboard-check", color: "secondary" },
            { label: "Low Stock Items", value: dashboard.lowStockCount, icon: "ti-alert-triangle", color: "danger" },
          ].map((kpi) => (
            <div key={kpi.label} className="col-6 col-md-4 col-xl-2">
              <div className="card border h-100">
                <div className="card-body text-center py-3">
                  <i className={`ti ${kpi.icon} fs-4 text-${kpi.color}`} />
                  <div className="fs-4 fw-semibold mt-1">{kpi.value ?? 0}</div>
                  <div className="text-muted small">{kpi.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details */}
      <div className="row g-3">
        <div className="col-md-6">
          <div className="card border">
            <div className="card-header"><h6 className="mb-0">Details</h6></div>
            <div className="card-body">
              <table className="table table-sm mb-0">
                <tbody>
                  <tr><td className="text-muted">Type</td><td><span className="badge bg-primary">{wh.type}</span></td></tr>
                  <tr><td className="text-muted">Status</td><td><span className={`badge ${wh.isActive ? "bg-success" : "bg-danger"}`}>{wh.isActive ? "Active" : "Inactive"}</span></td></tr>
                  <tr>
                    <td className="text-muted">Manager</td>
                    <td>{wh.manager?.profile?.displayName || wh.manager?.auth?.email || "—"}</td>
                  </tr>
                  <tr><td className="text-muted">Created</td><td>{wh.createdAt ? new Date(wh.createdAt).toLocaleDateString() : "—"}</td></tr>
                  <tr>
                    <td className="text-muted">Inbound QC</td>
                    <td>
                      {wh.qcInboundEnabled ? (
                        <span className="badge bg-success">Enabled</span>
                      ) : (
                        <span className="badge bg-secondary">Off</span>
                      )}
                    </td>
                  </tr>
                  {wh.qcEscalationFailedQtyThreshold != null && (
                    <tr>
                      <td className="text-muted">QC fail threshold</td>
                      <td>{wh.qcEscalationFailedQtyThreshold}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <QcSettingsMini warehouseId={warehouseId} wh={wh} onUpdated={setWh} />
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card border">
            <div className="card-header"><h6 className="mb-0">Linked Locations</h6></div>
            <div className="card-body">
              {wh.locations?.length > 0 ? (
                <ul className="list-group list-group-flush">
                  {wh.locations.map((loc: any) => (
                    <li key={loc.id} className="list-group-item d-flex justify-content-between align-items-center px-0">
                      <div>
                        <span className="fw-medium">{loc.name}</span>
                        {loc.code && <span className="text-muted ms-2 small">({loc.code})</span>}
                      </div>
                      <span className="badge bg-secondary">{loc.type}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted mb-0">No locations linked yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Staff preview */}
      {wh.staff?.length > 0 && (
        <div className="card border mt-3">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h6 className="mb-0">Staff ({wh.staff.length})</h6>
            <Link href={`/owner/warehouse/${warehouseId}/staff`} className="btn btn-sm btn-outline-primary">
              Manage →
            </Link>
          </div>
          <div className="card-body p-0">
            <table className="table table-sm mb-0">
              <thead className="table-light">
                <tr><th>Name</th><th>Role</th><th>Since</th></tr>
              </thead>
              <tbody>
                {wh.staff.slice(0, 5).map((s: any) => (
                  <tr key={s.id}>
                    <td>{s.user?.profile?.displayName || s.user?.auth?.email || "—"}</td>
                    <td><span className="badge bg-secondary">{s.role}</span></td>
                    <td className="text-muted small">{s.assignedAt ? new Date(s.assignedAt).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
