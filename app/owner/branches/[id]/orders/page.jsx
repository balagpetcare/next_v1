"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import BranchPageShell from "@/app/owner/_components/branch/BranchPageShell";

function pickList(resp) {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp?.data)) return resp.data;
  if (Array.isArray(resp?.items)) return resp.items;
  return [];
}

const statusBadges = {
  PENDING: "bg-warning",
  CONFIRMED: "bg-info",
  PROCESSING: "bg-primary",
  SHIPPED: "bg-primary",
  DELIVERED: "bg-success",
  CANCELLED: "bg-danger",
};

export default function BranchOrdersPage() {
  const params = useParams();
  const branchId = useMemo(() => String(params?.id || ""), [params]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    if (!branchId) return;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const id = parseInt(branchId, 10);
        let url = `/api/v1/orders?branchId=${id}`;
        if (filterStatus) url += `&status=${encodeURIComponent(filterStatus)}`;
        const data = await ownerGet(url).catch(() => ({}));
        setOrders(pickList(data));
      } catch (e) {
        setError(e?.message || "Failed to load orders");
      } finally {
        setLoading(false);
      }
    })();
  }, [branchId, filterStatus]);

  return (
    <BranchPageShell
      title="Orders"
      subtitle="Orders for this branch"
      breadcrumbLabel="Orders"
      loading={loading}
    >
      {error && (
        <div className="alert alert-danger radius-12 mb-4">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}
      <div className="card radius-12">
        <div className="card-body p-24">
          <div className="d-flex flex-wrap gap-2 mb-4">
            <select
              className="form-select form-select-sm radius-12"
              style={{ width: 160 }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All statuses</option>
              {Object.keys(statusBadges).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th className="text-end">Amount</th>
                  <th>Date</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">
                      No orders found for this branch.
                    </td>
                  </tr>
                )}
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="fw-semibold">#{o.orderNumber ?? o.id ?? "—"}</td>
                    <td>{o.customer?.profile?.displayName ?? o.customer?.email ?? "—"}</td>
                    <td>
                      <span className={`badge radius-8 ${statusBadges[o.status] ?? "bg-secondary"}`}>
                        {o.status ?? "—"}
                      </span>
                    </td>
                    <td className="text-end fw-semibold">
                      ৳{Number(o.totalAmount ?? o.total ?? 0).toLocaleString("en-BD")}
                    </td>
                    <td>{o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-BD") : "—"}</td>
                    <td className="text-end">
                      <Link
                        href={`/owner/orders/${o.id}`}
                        className="btn btn-sm btn-ghost-primary radius-8"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </BranchPageShell>
  );
}
