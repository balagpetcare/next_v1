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
  items: Array<{
    id: number;
    product: { name: string };
    variant: { title: string } | null;
    quantity: number;
    price: number;
    total: number;
  }>;
  createdAt: string;
}

export default function OwnerOrdersPage() {
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
      const data = (await apiFetch(url)) as unknown[] | { items?: unknown[] };
      setOrders((Array.isArray(data) ? data : (data && typeof data === "object" && "items" in data ? (data as { items: unknown[] }).items ?? [] : [])) as Order[]);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load orders");
      console.error("Load orders error:", e);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      await apiFetch(`/api/v1/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      loadOrders();
    } catch (e: any) {
      alert(e?.message || "Failed to update order status");
    }
  };

  const cancelOrder = async (orderId: number) => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    try {
      await apiFetch(`/api/v1/orders/${orderId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: "Cancelled by owner" }),
      });
      loadOrders();
    } catch (e: any) {
      alert(e?.message || "Failed to cancel order");
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
                  <small className="text-muted">Manage all orders (online and offline)</small>
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
                        <th>Branch</th>
                        <th>Customer</th>
                        <th>Items</th>
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
                          <td>{order.branch.name}</td>
                          <td>
                            {order.customer ? (
                              order.customer.profile?.displayName || "Customer"
                            ) : (
                              <span className="text-muted">Walk-in</span>
                            )}
                          </td>
                          <td>
                            <span className="badge bg-info-focus text-info-main radius-12">
                              {order.items.length} item{order.items.length > 1 ? "s" : ""}
                            </span>
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
                            <div className="d-flex gap-2">
                              <Link
                                href={`/owner/orders/${order.id}`}
                                className="btn btn-sm btn-light radius-12"
                              >
                                <i className="ri-eye-line" />
                              </Link>
                              {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
                                <div className="dropdown">
                                  <button
                                    className="btn btn-sm btn-light radius-12"
                                    type="button"
                                    data-bs-toggle="dropdown"
                                  >
                                    <i className="ri-more-line" />
                                  </button>
                                  <ul className="dropdown-menu">
                                    {order.status === "PENDING" && (
                                      <li>
                                        <button
                                          className="dropdown-item"
                                          onClick={() => updateOrderStatus(order.id, "CONFIRMED")}
                                        >
                                          Confirm
                                        </button>
                                      </li>
                                    )}
                                    {order.status === "CONFIRMED" && (
                                      <li>
                                        <button
                                          className="dropdown-item"
                                          onClick={() => updateOrderStatus(order.id, "PROCESSING")}
                                        >
                                          Start Processing
                                        </button>
                                      </li>
                                    )}
                                    {order.status === "PROCESSING" && (
                                      <li>
                                        <button
                                          className="dropdown-item"
                                          onClick={() => updateOrderStatus(order.id, "SHIPPED")}
                                        >
                                          Mark as Shipped
                                        </button>
                                      </li>
                                    )}
                                    {order.status === "SHIPPED" && (
                                      <li>
                                        <button
                                          className="dropdown-item"
                                          onClick={() => updateOrderStatus(order.id, "DELIVERED")}
                                        >
                                          Mark as Delivered
                                        </button>
                                      </li>
                                    )}
                                    <li>
                                      <hr className="dropdown-divider" />
                                    </li>
                                    <li>
                                      <button
                                        className="dropdown-item text-danger"
                                        onClick={() => cancelOrder(order.id)}
                                      >
                                        Cancel Order
                                      </button>
                                    </li>
                                  </ul>
                                </div>
                              )}
                            </div>
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
