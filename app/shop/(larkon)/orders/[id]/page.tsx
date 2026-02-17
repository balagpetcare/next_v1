"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
  notes: string | null;
  items: Array<{
    id: number;
    product: { id: number; name: string };
    variant: { id: number; title: string } | null;
    quantity: number;
    price: number;
    total: number;
  }>;
  createdAt: string;
}

export default function ShopOrderDetailsPage() {
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const data = (await apiFetch(`/api/v1/orders/${orderId}`)) as { data?: unknown } | unknown;
      const payload = data && typeof data === "object" && "data" in data ? (data as { data: unknown }).data : data;
      setOrder((payload ?? null) as Order | null);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load order");
      console.error("Load order error:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-main-body">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-danger radius-12" role="alert">
          {error || "Order not found"}
        </div>
        <Link href="/shop/orders" className="btn btn-primary radius-12">
          Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <div className="row g-3">
        <div className="col-12">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div>
              <Link href="/shop/orders" className="btn btn-sm btn-light radius-12 mb-2">
                <i className="ri-arrow-left-line me-2" />
                Back to Orders
              </Link>
              <h5 className="mb-1">Order Details</h5>
              <small className="text-muted">Order #{order.orderNumber}</small>
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <div className="card radius-12">
            <div className="card-body">
              <h6 className="mb-3">Order Items</h6>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Variant</th>
                      <th>Quantity</th>
                      <th>Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.product.name}</td>
                        <td>{item.variant?.title || "Standard"}</td>
                        <td>{item.quantity}</td>
                        <td>৳{parseFloat(item.price.toString()).toFixed(2)}</td>
                        <td>
                          <strong>৳{parseFloat(item.total.toString()).toFixed(2)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} className="text-end">
                        <strong>Total:</strong>
                      </td>
                      <td>
                        <strong className="text-primary" style={{ fontSize: "1.2rem" }}>
                          ৳{parseFloat(order.totalAmount.toString()).toFixed(2)}
                        </strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card radius-12">
            <div className="card-body">
              <h6 className="mb-3">Order Information</h6>

              <div className="mb-3">
                <label className="form-label text-muted small">Status</label>
                <div>
                  <span
                    className={`badge radius-12 ${
                      order.status === "DELIVERED"
                        ? "bg-success-focus text-success-main"
                        : order.status === "CANCELLED"
                        ? "bg-danger-focus text-danger-main"
                        : order.status === "PENDING"
                        ? "bg-warning-focus text-warning-main"
                        : "bg-info-focus text-info-main"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label text-muted small">Branch</label>
                <div>{order.branch.name}</div>
              </div>

              <div className="mb-3">
                <label className="form-label text-muted small">Customer</label>
                <div>
                  {order.customer ? (
                    order.customer.profile?.displayName || "Customer"
                  ) : (
                    <span className="text-muted">Walk-in Customer</span>
                  )}
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label text-muted small">Payment Method</label>
                <div>{order.paymentMethod || "—"}</div>
              </div>

              <div className="mb-3">
                <label className="form-label text-muted small">Payment Status</label>
                <div>
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
              </div>

              <div className="mb-3">
                <label className="form-label text-muted small">Created</label>
                <div>
                  {new Date(order.createdAt).toLocaleString()}
                </div>
              </div>

              {order.notes && (
                <div className="mb-3">
                  <label className="form-label text-muted small">Notes</label>
                  <div className="text-muted">{order.notes}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
