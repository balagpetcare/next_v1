"use client";

import Link from "next/link";

function pickArray(resp) {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp?.data)) return resp.data;
  if (Array.isArray(resp?.items)) return resp.items;
  if (Array.isArray(resp?.data?.items)) return resp.data.items;
  return [];
}

export default function BranchActivityFeed({ branchId, orders = [], loading = false }) {
  const items = pickArray(orders).slice(0, 8);
  const base = `/owner/branches/${branchId}`;

  if (loading) {
    return (
      <div className="card radius-12">
        <div className="card-body p-24">
          <h6 className="mb-3 fw-semibold">
            <i className="ri-history-line me-2 text-primary" />
            Recent Activity
          </h6>
          <div className="placeholder-glow">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="d-flex align-items-center gap-3 py-2">
                <span className="placeholder rounded-circle" style={{ width: 40, height: 40 }} />
                <div className="flex-grow-1">
                  <span className="placeholder col-8 d-block mb-1" />
                  <span className="placeholder col-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card radius-12">
      <div className="card-body p-24">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0 fw-semibold">
            <i className="ri-history-line me-2 text-primary" />
            Recent Activity
          </h6>
          {items.length > 0 && (
            <Link href={`${base}/orders`} className="btn btn-sm btn-outline-primary radius-12">
              View all
            </Link>
          )}
        </div>
        {items.length === 0 ? (
          <p className="text-muted mb-0 small">No recent orders. Activity will appear here.</p>
        ) : (
          <ul className="list-unstyled mb-0">
            {items.map((o) => (
              <li key={o.id} className="d-flex align-items-center gap-3 py-2 border-bottom border-light">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 bg-primary-focus text-primary"
                  style={{ width: 36, height: 36 }}
                >
                  <i className="ri-shopping-bag-line" />
                </div>
                <div className="flex-grow-1 min-w-0">
                  <div className="fw-medium text-truncate">
                    Order #{o.id || o.orderId || "—"} · ৳{Number(o.total ?? o.totalAmount ?? 0).toLocaleString("en-BD")}
                  </div>
                  <div className="small text-secondary-light">
                    {o.status || "—"} · {o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-BD") : "—"}
                  </div>
                </div>
                <Link href={`${base}/orders`} className="btn btn-sm btn-ghost-primary radius-8 flex-shrink-0">
                  View
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
