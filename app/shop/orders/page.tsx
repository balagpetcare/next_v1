"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/src/lib/apiFetch";

interface Order {
  id: number;
  orderNumber: string;
  branch: { id: number; name: string };
  customer: { id: number; profile: { displayName: string } } | null;
  status: string;
  totalAmount: number;
  paymentMethod: string | null;
  paymentStatus: string;
  createdAt: string;
}

export default function ShopOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("");

  useEffect(() => {
    loadOrders();
  }, [filterStatus]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const url = filterStatus
        ? `/api/v1/orders?status=${filterStatus}`
        : "/api/v1/orders";
      const data = await apiFetch(url);
      setOrders(Array.isArray(data) ? data : data?.items || data?.data || []);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load orders");
      console.error("Load orders error:", e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      PENDING: "bg-warning-focus text-warning-main",
      CONFIRMED: "bg-info-focus text-info-main",
      PROCESSING: "bg-primary-focus text-primary-main",
      SHIPPED: "bg-primary-focus text-primary-main",
      DELIVERED: "bg-success-focus text-success-main",
      CANCELLED: "bg-danger-focus text-danger-main",
    };
    return badges[status] || "bg-secondary-focus text-secondary-main";
  };

  return (
    <div className="dashboard-main-body">
      <div className="row g-3">
        <div className="col-12">
          <div className="card radius-12">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h5 className="mb-1">Orders</h5>
                  <small className="text-muted">View all orders</small>
                </div>
                <div className="d-flex gap-2">
                  <select
                    className="form-select form-select-sm radius-12"
                    style={{ width: "200px" }}
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="PROCESSING">Processing</option>
                    <option value="SHIPPED">Shipped</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="alert alert-danger radius-12" role="alert">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <p>No orders found.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Customer</th>
                        <th>Total</th>
                        <th>Payment</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id}>
                          <td>
                            <strong>{order.orderNumber}</strong>
                          </td>
                          <td>
                            {order.customer ? (
                              order.customer.profile?.displayName || "Customer"
                            ) : (
                              <span className="text-muted">Walk-in</span>
                            )}
                          </td>
                          <td>
                            <strong>৳{parseFloat(order.totalAmount.toString()).toFixed(2)}</strong>
                          </td>
                          <td>
                            <div>
                              <small className="text-muted">
                                {order.paymentMethod || "—"}
                              </small>
                              <br />
                              <span
                                className={`badge radius-12 ${
                                  order.paymentStatus === "COMPLETED"
                                    ? "bg-success-focus text-success-main"
                                    : order.paymentStatus === "FAILED"
                                    ? "bg-danger-focus text-danger-main"
                                    : "bg-warning-focus text-warning-main"
                                }`}
                              >
                                {order.paymentStatus}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className={`badge radius-12 ${getStatusBadge(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                          <td>
                            {new Date(order.createdAt).toLocaleDateString()}
                            <br />
                            <small className="text-muted">
                              {new Date(order.createdAt).toLocaleTimeString()}
                            </small>
                          </td>
                          <td>
                            <Link
                              href={`/shop/orders/${order.id}`}
                              className="btn btn-sm btn-light radius-12"
                            >
                              <i className="ri-eye-line" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
