"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buildMedicineRequisitionSummaryParams } from "@/app/owner/_lib/ownerMedicineRequisition";
import type { MedicineRequisitionDashboardSummary } from "@/app/owner/_lib/ownerMedicineRequisition";
import { ownerGet } from "@/app/owner/_lib/ownerApi";

interface PharmacyDashboardMetrics {
  totalStockValue: number;
  totalSKUs: number;
  expiredCount: number;
  nearExpiry: {
    days30: number;
    days60: number;
    days90: number;
  };
  activeRecalls: number;
  lowStockCount: number;
  pendingRequisitions: number;
  transferPipeline: {
    inTransit: number;
    pendingReceive: number;
  };
  recentWriteOffs: {
    last7Days: number;
    totalQty: number;
  };
}

export default function OwnerPharmacyDashboardPage() {
  const [stats, setStats] = useState<MedicineRequisitionDashboardSummary>({
    pending: 0,
    approved: 0,
    dispatched: 0,
    total: 0,
  });
  const [metrics, setMetrics] = useState<PharmacyDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      try {
        type MeRes = { organizations?: { id: number }[]; data?: { organizations?: { id: number }[] } };
        const meRaw = await ownerGet<MeRes>("/api/v1/owner/me").catch(() => null);
        const me = (meRaw ?? {}) as MeRes;
        if (cancelled) return;
        const orgs = me.organizations ?? me.data?.organizations ?? [];
        const orgId = orgs[0]?.id;

        const qs = buildMedicineRequisitionSummaryParams({});
        const reqUrl = `/api/v1/medicine-requisitions/summary${qs ? `?${qs}` : ""}`;
        const dashUrl = orgId
          ? `/api/v1/inventory/pharmacy-dashboard?orgId=${encodeURIComponent(String(orgId))}`
          : "";

        const [reqRes, dashRes] = await Promise.all([
          fetch(reqUrl, { method: "GET", credentials: "include", cache: "no-store" }),
          dashUrl
            ? fetch(dashUrl, { method: "GET", credentials: "include", cache: "no-store" })
            : Promise.resolve(null as unknown as Response),
        ]);

        if (cancelled) return;

        if (reqRes.status === 403) {
          setError("You do not have access to pharmacy requisitions.");
          setStats({ total: 0, pending: 0, approved: 0, dispatched: 0 });
        } else {
          const reqData = await reqRes.json().catch(() => null);
          if (reqData?.data) {
            setStats({
              total: Number(reqData.data.total) || 0,
              pending: Number(reqData.data.pending) || 0,
              approved: Number(reqData.data.approved) || 0,
              dispatched: Number(reqData.data.dispatched) || 0,
            });
          }
        }

        if (dashRes && dashRes.ok) {
          const dashData = await dashRes.json().catch(() => null);
          if (dashData && typeof dashData === "object" && !("error" in dashData)) {
            setMetrics(dashData as PharmacyDashboardMetrics);
          }
        }
      } catch {
        if (!cancelled) {
          setError(null);
          setStats({ total: 0, pending: 0, approved: 0, dispatched: 0 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="dashboard-main-body">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="mb-0">Pharmacy Dashboard</h5>
        <div className="d-flex gap-2">
          <Link href="/owner/inventory/expiry-management" className="btn btn-sm btn-outline-warning">
            Manage Expiry
          </Link>
          <Link href="/owner/inventory/recalls" className="btn btn-sm btn-outline-danger">
            View Recalls
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5 text-secondary">Loading…</div>
      ) : (
        <>
          {error && (
            <div className="alert alert-warning py-2 small mb-3" role="alert">
              {error}
            </div>
          )}

          {/* Inventory Health Metrics */}
          {metrics && (
            <>
              <h6 className="text-secondary mb-3">Inventory Health</h6>
              <div className="row g-3 mb-4">
                <div className="col-6 col-md-3">
                  <div className="card radius-12 h-100">
                    <div className="card-body text-center">
                      <div className="fs-4 fw-bold text-success">
                        {formatCurrency(metrics.totalStockValue)}
                      </div>
                      <div className="text-muted small">Total Stock Value</div>
                    </div>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="card radius-12 h-100">
                    <div className="card-body text-center">
                      <div className="fs-4 fw-bold text-primary">{metrics.totalSKUs}</div>
                      <div className="text-muted small">Total SKUs</div>
                    </div>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <Link href="/owner/inventory/expiry-management?tab=expired" className="text-decoration-none">
                    <div className="card radius-12 h-100 border-danger">
                      <div className="card-body text-center">
                        <div className="fs-4 fw-bold text-danger">
                          {metrics.expiredCount}
                          {metrics.expiredCount > 0 && (
                            <i className="ri-alert-fill ms-2" style={{ fontSize: "0.8em" }}></i>
                          )}
                        </div>
                        <div className="text-muted small">Expired Stock</div>
                      </div>
                    </div>
                  </Link>
                </div>
                <div className="col-6 col-md-3">
                  <Link href="/owner/inventory/recalls" className="text-decoration-none">
                    <div className="card radius-12 h-100 border-warning">
                      <div className="card-body text-center">
                        <div className="fs-4 fw-bold text-warning">
                          {metrics.activeRecalls}
                          {metrics.activeRecalls > 0 && (
                            <i className="ri-error-warning-fill ms-2" style={{ fontSize: "0.8em" }}></i>
                          )}
                        </div>
                        <div className="text-muted small">Active Recalls</div>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Near Expiry Breakdown */}
              <h6 className="text-secondary mb-3">Near Expiry</h6>
              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <Link href="/owner/inventory/expiry-management?tab=near&days=30" className="text-decoration-none">
                    <div className="card radius-12 h-100">
                      <div className="card-body text-center">
                        <div className="fs-4 fw-bold text-danger">{metrics.nearExpiry.days30}</div>
                        <div className="text-muted small">Expiring in 30 Days</div>
                      </div>
                    </div>
                  </Link>
                </div>
                <div className="col-md-4">
                  <Link href="/owner/inventory/expiry-management?tab=near&days=60" className="text-decoration-none">
                    <div className="card radius-12 h-100">
                      <div className="card-body text-center">
                        <div className="fs-4 fw-bold text-warning">{metrics.nearExpiry.days60}</div>
                        <div className="text-muted small">Expiring in 60 Days</div>
                      </div>
                    </div>
                  </Link>
                </div>
                <div className="col-md-4">
                  <Link href="/owner/inventory/expiry-management?tab=near&days=90" className="text-decoration-none">
                    <div className="card radius-12 h-100">
                      <div className="card-body text-center">
                        <div className="fs-4 fw-bold text-info">{metrics.nearExpiry.days90}</div>
                        <div className="text-muted small">Expiring in 90 Days</div>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Operations Metrics */}
              <h6 className="text-secondary mb-3">Operations</h6>
              <div className="row g-3 mb-4">
                <div className="col-md-3">
                  <div className="card radius-12 h-100">
                    <div className="card-body text-center">
                      <div className="fs-4 fw-bold text-dark">{metrics.lowStockCount}</div>
                      <div className="text-muted small">Low Stock Items</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card radius-12 h-100">
                    <div className="card-body text-center">
                      <div className="fs-4 fw-bold text-primary">{metrics.pendingRequisitions}</div>
                      <div className="text-muted small">Pending Requisitions</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card radius-12 h-100">
                    <div className="card-body text-center">
                      <div className="fs-4 fw-bold text-info">{metrics.transferPipeline.inTransit}</div>
                      <div className="text-muted small">Transfers In Transit</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card radius-12 h-100">
                    <div className="card-body text-center">
                      <div className="fs-4 fw-bold text-secondary">{metrics.recentWriteOffs.last7Days}</div>
                      <div className="text-muted small">Write-Offs (7d)</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Requisition Summary */}
          <h6 className="text-secondary mb-3">Requisition Pipeline</h6>
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-3">
              <Link href="/owner/pharmacy/requisitions?status=SUBMITTED%2CUNDER_REVIEW" className="text-decoration-none">
                <div className="card radius-12 h-100">
                  <div className="card-body text-center">
                    <div className="fs-3 fw-bold text-warning">{stats.pending}</div>
                    <div className="text-muted small">Pending Review</div>
                  </div>
                </div>
              </Link>
            </div>
            <div className="col-6 col-md-3">
              <Link href="/owner/pharmacy/requisitions?status=APPROVED%2CPARTIALLY_APPROVED%2CREADY_TO_DISPATCH" className="text-decoration-none">
                <div className="card radius-12 h-100">
                  <div className="card-body text-center">
                    <div className="fs-3 fw-bold text-primary">{stats.approved}</div>
                    <div className="text-muted small">Approved / Ready</div>
                  </div>
                </div>
              </Link>
            </div>
            <div className="col-6 col-md-3">
              <Link href="/owner/pharmacy/requisitions?status=DISPATCHED%2CIN_TRANSIT" className="text-decoration-none">
                <div className="card radius-12 h-100">
                  <div className="card-body text-center">
                    <div className="fs-3 fw-bold text-info">{stats.dispatched}</div>
                    <div className="text-muted small">Dispatched</div>
                  </div>
                </div>
              </Link>
            </div>
            <div className="col-6 col-md-3">
              <Link href="/owner/pharmacy/requisitions" className="text-decoration-none">
                <div className="card radius-12 h-100">
                  <div className="card-body text-center">
                    <div className="fs-3 fw-bold text-dark">{stats.total}</div>
                    <div className="text-muted small">Total Requisitions</div>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="row g-3">
            <div className="col-md-4">
              <div className="card radius-12">
                <div className="card-body">
                  <h6>Requisitions</h6>
                  <p className="text-muted small mb-2">Review and manage medicine requisitions from all branches.</p>
                  <Link href="/owner/pharmacy/requisitions" className="btn btn-primary btn-sm">
                    View Requisitions
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card radius-12">
                <div className="card-body">
                  <h6>Inventory Management</h6>
                  <p className="text-muted small mb-2">View stock balances, batches, and warehouse inventory.</p>
                  <Link href="/owner/inventory" className="btn btn-outline-primary btn-sm">
                    View Inventory
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card radius-12">
                <div className="card-body">
                  <h6>Stock Transfers</h6>
                  <p className="text-muted small mb-2">Manage hub to branch pharmacy transfers.</p>
                  <Link href="/owner/inventory/transfers" className="btn btn-outline-primary btn-sm">
                    View Transfers
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
