"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/src/lib/apiFetch";

interface InventoryItem {
  id: string | number;
  branch: { id: number; name: string } | null;
  product: { id: number; name: string; slug?: string } | null;
  variant: { id: number; sku: string; title: string } | null;
  quantity: number;
  availableQty?: number;
  minStock: number;
  expiryDate: string | null;
  locationId?: number;
  variantId?: number;
}

export default function OwnerInventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustData, setAdjustData] = useState({ quantityDelta: 0, reason: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/v1/inventory");
      const items = res?.data ?? res?.items ?? (Array.isArray(res) ? res : []);
      setInventory(Array.isArray(items) ? items : []);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load inventory");
      console.error("Load inventory error:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const res = await apiFetch("/api/v1/inventory/alerts");
      const items = res?.data ?? (Array.isArray(res) ? res : []);
      setInventory(Array.isArray(items) ? items : []);
    } catch (e: any) {
      console.error("Load alerts error:", e);
    }
  };

  const handleRequestAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    const locationId = (selectedItem as any).locationId;
    const variantId = (selectedItem as any).variantId ?? selectedItem.variant?.id;
    if (!locationId || !variantId) {
      alert("Missing location or variant");
      return;
    }
    try {
      setSubmitting(true);
      await apiFetch("/api/v1/inventory/adjustment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          variantId,
          quantityDelta: adjustData.quantityDelta,
          reason: adjustData.reason || undefined,
        }),
      });
      setShowAdjustModal(false);
      setSelectedItem(null);
      setAdjustData({ quantityDelta: 0, reason: "" });
      loadInventory();
    } catch (e: any) {
      alert(e?.message || "Failed to create adjustment request");
    } finally {
      setSubmitting(false);
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
                  <small className="text-muted">Ledger-based stock (adjust via request)</small>
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-warning radius-12" onClick={loadAlerts}>
                    <i className="ri-alert-line me-2" />
                    Low Stock Alerts
                  </button>
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
                        <th>Branch</th>
                        <th>Stock</th>
                        <th>Min Stock</th>
                        <th>Status</th>
                        <th>Actions</th>
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
                            <td>{item.branch?.name ?? "—"}</td>
                            <td>
                              <strong>{qty}</strong>
                              {(item as any).availableQty != null && (item as any).availableQty !== qty && (
                                <small className="text-muted ms-1">(avail: {(item as any).availableQty})</small>
                              )}
                            </td>
                            <td>{minStock}</td>
                            <td>
                              <span className={`badge radius-12 ${status.class}`}>{status.label}</span>
                            </td>
                            <td>
                              <button
                                className="btn btn-sm btn-light radius-12"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setAdjustData({ quantityDelta: 0, reason: "" });
                                  setShowAdjustModal(true);
                                }}
                                title="Request stock adjustment"
                              >
                                <i className="ri-edit-line" />
                              </button>
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

      {showAdjustModal && selectedItem && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowAdjustModal(false)}
        >
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h6 className="modal-title">Request Stock Adjustment</h6>
                <button type="button" className="btn-close" onClick={() => setShowAdjustModal(false)} />
              </div>
              <form onSubmit={handleRequestAdjustment}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Product</label>
                    <input
                      type="text"
                      className="form-control radius-12"
                      value={`${selectedItem.product?.name ?? ""}${selectedItem.variant ? ` - ${selectedItem.variant.title}` : ""}`}
                      disabled
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Current Stock</label>
                    <input type="number" className="form-control radius-12" value={selectedItem.quantity} disabled />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Adjustment (positive=add, negative=deduct) *</label>
                    <input
                      type="number"
                      className="form-control radius-12"
                      value={adjustData.quantityDelta || ""}
                      onChange={(e) => setAdjustData({ ...adjustData, quantityDelta: parseInt(e.target.value) || 0 })}
                      placeholder="e.g. 10 or -5"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Reason</label>
                    <textarea
                      className="form-control radius-12"
                      rows={2}
                      value={adjustData.reason}
                      onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                      placeholder="e.g. Stock count correction"
                    />
                  </div>
                  <p className="small text-muted mb-0">Owner will review and approve the request.</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary radius-12" onClick={() => setShowAdjustModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary radius-12" disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
