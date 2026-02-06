"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/src/lib/apiFetch";

interface InventoryItem {
  id: string | number;
  branch: { id: number; name: string } | null;
  product: { id: number; name: string; slug?: string } | null;
  variant: { id: number; sku: string; title: string } | null;
  quantity: number;
  minStock: number;
  expiryDate: string | null;
}

export default function ShopInventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/v1/inventory");
      const items = res?.data ?? res?.items ?? res?.data?.items ?? (Array.isArray(res) ? res : []);
      setInventory(Array.isArray(items) ? items : []);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load inventory");
      console.error("Load inventory error:", e);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (quantity: number, minStock: number) => {
    if (quantity === 0) return { label: "Out of Stock", class: "bg-danger-focus text-danger-main" };
    if (quantity <= minStock) return { label: "Low Stock", class: "bg-warning-focus text-warning-main" };
    return { label: "In Stock", class: "bg-success-focus text-success-main" };
  };

  return (
    <div className="dashboard-main-body">
      <div className="row g-3">
        <div className="col-12">
          <div className="card radius-12">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h5 className="mb-1">Inventory</h5>
                  <small className="text-muted">View stock levels</small>
                </div>
                <button
                  className="btn btn-outline-warning radius-12"
                  onClick={async () => {
                    try {
                      const res = await apiFetch("/api/v1/inventory/alerts");
                      const items = res?.data ?? (Array.isArray(res) ? res : []);
                      setInventory(Array.isArray(items) ? items : []);
                    } catch (e: any) {
                      console.error("Load alerts error:", e);
                    }
                  }}
                >
                  <i className="ri-alert-line me-2" />
                  Low Stock Alerts
                </button>
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
              ) : inventory.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <p>No inventory items found.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Variant</th>
                        <th>Stock</th>
                        <th>Min Stock</th>
                        <th>Status</th>
                        <th>Expiry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.map((item) => {
                        const qty = item.quantity ?? 0;
                        const minStock = item.minStock ?? 10;
                        const status = getStockStatus(qty, minStock);
                        return (
                          <tr key={item.id}>
                            <td>
                              <strong>{item.product?.name ?? "—"}</strong>
                              {item.product?.slug && (
                                <>
                                  <br />
                                  <small className="text-muted">{item.product.slug}</small>
                                </>
                              )}
                            </td>
                            <td>
                              {item.variant ? (
                                <>
                                  <strong>{item.variant.title}</strong>
                                  <br />
                                  <small className="text-muted">SKU: {item.variant.sku}</small>
                                </>
                              ) : (
                                <span className="text-muted">Standard</span>
                              )}
                            </td>
                            <td>
                              <strong>{qty}</strong>
                            </td>
                            <td>{minStock}</td>
                            <td>
                              <span className={`badge radius-12 ${status.class}`}>{status.label}</span>
                            </td>
                            <td>
                              {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : <span className="text-muted">—</span>}
                            </td>
                          </tr>
                        );
                      })}
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
