"use client";

import Link from "next/link";
import StatusBadge from "@/app/owner/_components/StatusBadge";

export default function AttentionRequiredPanel({ alerts = {}, pendingApprovalsCount = 0, loading = false }) {
  if (loading) {
    return (
      <div className="card radius-12">
        <div className="card-body p-24">
          <h6 className="mb-3 fw-semibold">Attention Required</h6>
          <div className="placeholder-glow">
            <span className="placeholder col-12 mb-2" />
            <span className="placeholder col-12 mb-2" />
            <span className="placeholder col-12" />
          </div>
        </div>
      </div>
    );
  }

  const { verifications = [], lowStock = [], pendingOrders = [], rejectedDocs = [] } = alerts;
  const totalAlerts =
    verifications.length +
    lowStock.length +
    pendingOrders.length +
    rejectedDocs.length +
    (pendingApprovalsCount > 0 ? 1 : 0);

  if (totalAlerts === 0) {
    return (
      <div className="card radius-12 border-success">
        <div className="card-body p-24">
          <h6 className="mb-3 fw-semibold text-success">
            <i className="solar:verified-check-outline me-2" />
            All Clear
          </h6>
          <p className="text-muted mb-0 small">No items require your attention at this time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card radius-12 border-warning">
      <div className="card-body p-24">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h6 className="mb-0 fw-semibold text-warning">
            <i className="solar:bell-outline me-2" />
            Attention Required ({totalAlerts})
          </h6>
        </div>

        {pendingApprovalsCount > 0 && (
          <div className="mb-3">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="fw-semibold small text-warning">Pending Approvals ({pendingApprovalsCount})</span>
              <Link href="/owner/access/requests" className="btn btn-link btn-sm p-0">
                View All →
              </Link>
            </div>
            <p className="text-muted small mb-0">Branch access requests awaiting your approval.</p>
          </div>
        )}

        {verifications.length > 0 && (
          <div className="mb-3">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="fw-semibold small">Pending Verifications ({verifications.length})</span>
              <Link href="/owner/verification" className="btn btn-link btn-sm p-0">
                View All →
              </Link>
            </div>
            <div className="list-group list-group-flush">
              {verifications.slice(0, 3).map((item, index) => (
                <div key={item.id || index} className="list-group-item px-0 py-2 border-0">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <div className="fw-semibold small">{item.name || "Verification"}</div>
                      <div className="text-muted small">{item.type || "Verification"}</div>
                    </div>
                    <StatusBadge status={item.status || "PENDING"} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {lowStock.length > 0 && (
          <div className="mb-3">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="fw-semibold small text-warning">Low Stock Items ({lowStock.length})</span>
              <Link href="/owner/inventory" className="btn btn-link btn-sm p-0">
                View All →
              </Link>
            </div>
            <div className="list-group list-group-flush">
              {lowStock.slice(0, 3).map((item, index) => (
                <div key={item.id || index} className="list-group-item px-0 py-2 border-0">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <div className="fw-semibold small">{item.name || item.productName || "Product"}</div>
                      <div className="text-muted small">Stock: {item.stock || 0} units</div>
                    </div>
                    <span className="badge bg-warning text-dark">Low Stock</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pendingOrders.length > 0 && (
          <div className="mb-3">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="fw-semibold small text-info">Pending Orders ({pendingOrders.length})</span>
              <Link href="/owner/orders" className="btn btn-link btn-sm p-0">
                View All →
              </Link>
            </div>
            <div className="list-group list-group-flush">
              {pendingOrders.slice(0, 3).map((item, index) => (
                <div key={item.id || index} className="list-group-item px-0 py-2 border-0">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <div className="fw-semibold small">Order #{item.orderNumber || item.id}</div>
                      <div className="text-muted small">৳{Number(item.total || 0).toLocaleString("en-BD")}</div>
                    </div>
                    {item.id && (
                      <Link href={`/owner/orders/${item.id}`} className="btn btn-outline-primary btn-sm">
                        View
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {rejectedDocs.length > 0 && (
          <div>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="fw-semibold small text-danger">Rejected Documents ({rejectedDocs.length})</span>
              <Link href="/owner/verification" className="btn btn-link btn-sm p-0">
                View All →
              </Link>
            </div>
            <div className="list-group list-group-flush">
              {rejectedDocs.slice(0, 3).map((item, index) => (
                <div key={item.id || index} className="list-group-item px-0 py-2 border-0">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <div className="fw-semibold small">{item.entityName || "Document"}</div>
                      <div className="text-muted small">{item.documentType || "Document"}</div>
                    </div>
                    <span className="badge bg-danger">Rejected</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
