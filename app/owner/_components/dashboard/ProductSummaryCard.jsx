"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ownerGet } from "@/app/owner/_lib/ownerApi";

export default function ProductSummaryCard({ loading: externalLoading }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");
        const res = await ownerGet("/api/v1/owner/products/summary");
        if (res && res?.success && res.data) {
          setData(res.data);
        }
      } catch (e) {
        setError(e?.message || "Failed to load product summary");
        console.error("Product summary error:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const isLoading = loading || externalLoading;

  return (
    <div className="card radius-12">
      <div className="card-body p-24">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h6 className="mb-0 fw-semibold">
            <i className="ri-box-line me-2 text-primary" />
            Product Summary
          </h6>
          <Link href="/owner/products" className="btn btn-sm btn-ghost-primary radius-8">
            View All
          </Link>
        </div>

        {error && (
          <div className="alert alert-danger radius-8 mb-3" style={{ fontSize: 12 }}>
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-3">
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : data ? (
          <>
            {/* Summary Stats */}
            <div className="row g-3 mb-3">
              <div className="col-6">
                <div className="text-center p-2 bg-light radius-8">
                  <div className="text-secondary-light mb-1" style={{ fontSize: 11 }}>
                    Total Products
                  </div>
                  <h5 className="mb-0 fw-bold text-primary">{data.summary?.total || 0}</h5>
                </div>
              </div>
              <div className="col-6">
                <div className="text-center p-2 bg-light radius-8">
                  <div className="text-secondary-light mb-1" style={{ fontSize: 11 }}>
                    Active
                  </div>
                  <h5 className="mb-0 fw-bold text-success">{data.summary?.active || 0}</h5>
                </div>
              </div>
            </div>

            {/* Approval Status */}
            <div className="mb-3">
              <div className="text-secondary-light mb-2" style={{ fontSize: 12 }}>
                Approval Status
              </div>
              <div className="d-flex flex-wrap gap-2">
                {data.approvalStatus?.draft > 0 && (
                  <span className="badge bg-secondary radius-8">
                    Draft: {data.approvalStatus.draft}
                  </span>
                )}
                {data.approvalStatus?.pendingApproval > 0 && (
                  <span className="badge bg-warning radius-8">
                    Pending: {data.approvalStatus.pendingApproval}
                  </span>
                )}
                {data.approvalStatus?.approved > 0 && (
                  <span className="badge bg-info radius-8">
                    Approved: {data.approvalStatus.approved}
                  </span>
                )}
                {data.approvalStatus?.published > 0 && (
                  <span className="badge bg-success radius-8">
                    Published: {data.approvalStatus.published}
                  </span>
                )}
              </div>
            </div>

            {/* Low Stock Alerts */}
            {data.lowStockAlerts && data.lowStockAlerts.length > 0 && (
              <div className="mb-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="text-secondary-light" style={{ fontSize: 12 }}>
                    Low Stock Alerts
                  </div>
                  <span className="badge bg-warning radius-8">{data.lowStockAlerts.length}</span>
                </div>
                <div className="list-group list-group-flush" style={{ maxHeight: 150, overflowY: "auto" }}>
                  {data.lowStockAlerts.slice(0, 5).map((alert, idx) => (
                    <div key={`low-stock-${alert.productId}-${alert.branchId}-${alert.variantId || 'null'}-${idx}`} className="list-group-item px-0 py-2 border-0">
                      <div className="d-flex align-items-center justify-content-between">
                        <div style={{ fontSize: 12 }}>
                          <div className="fw-semibold">{alert.productName}</div>
                          <div className="text-secondary-light">
                            {alert.branchName} - Qty: {alert.quantity} / Min: {alert.minStock}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {data.lowStockAlerts.length > 5 && (
                  <Link
                    href="/owner/inventory"
                    className="btn btn-sm btn-outline-primary radius-8 mt-2 w-100"
                  >
                    View All ({data.lowStockAlerts.length})
                  </Link>
                )}
              </div>
            )}

            {/* Out of Stock Alerts */}
            {data.outOfStockAlerts && data.outOfStockAlerts.length > 0 && (
              <div>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="text-secondary-light" style={{ fontSize: 12 }}>
                    Out of Stock
                  </div>
                  <span className="badge bg-danger radius-8">{data.outOfStockAlerts.length}</span>
                </div>
                <div className="list-group list-group-flush" style={{ maxHeight: 100, overflowY: "auto" }}>
                  {data.outOfStockAlerts.slice(0, 3).map((alert, idx) => (
                    <div key={`out-of-stock-${alert.productId}-${alert.branchId}-${alert.variantId || 'null'}-${idx}`} className="list-group-item px-0 py-2 border-0">
                      <div style={{ fontSize: 12 }}>
                        <div className="fw-semibold">{alert.productName}</div>
                        <div className="text-secondary-light">{alert.branchName}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {data.outOfStockAlerts.length > 3 && (
                  <Link
                    href="/owner/inventory"
                    className="btn btn-sm btn-outline-danger radius-8 mt-2 w-100"
                  >
                    View All ({data.outOfStockAlerts.length})
                  </Link>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
