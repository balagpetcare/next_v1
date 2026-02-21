"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Dropdown } from "react-bootstrap";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet, ownerPost } from "@/app/owner/_lib/ownerApi";
import { Pagination } from "@/src/components/common/Pagination";
import { useToast } from "@/src/hooks/useToast";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

interface InventoryItem {
  id: string | number;
  locationId?: number;
  variantId?: number;
  productId?: number;
  quantity: number;
  availableQty?: number;
  reservedQty?: number;
  minStock?: number;
  branch?: { id: number; name: string } | null;
  product?: { id: number; name: string; slug?: string } | null;
  variant?: { id: number; sku: string; title: string } | null;
  location?: { id: number; name: string; branch?: { id: number; name: string } };
}

type BranchLite = { id: number; name?: string; title?: string; code?: string };

type DashboardCards = {
  totalSkus?: number;
  totalStockQty?: number;
  lowStockCount?: number;
  outOfStockCount?: number;
  expiringCount?: number;
};

function pickArray(resp: any): unknown[] {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp.data)) return resp.data;
  if (Array.isArray(resp.items)) return resp.items;
  return [];
}

function getStockStatus(quantity: number, minStock: number) {
  if (quantity === 0) return { label: "Out of Stock", class: "bg-danger text-white" };
  if (minStock > 0 && quantity <= minStock) return { label: "Low Stock", class: "bg-warning text-dark" };
  return { label: "In Stock", class: "bg-success text-white" };
}

export default function OwnerInventoryPage() {
  const toast = useToast();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<BranchLite[]>([]);
  const [dashboard, setDashboard] = useState<DashboardCards | null>(null);
  const [filters, setFilters] = useState({ branchId: "", search: "", status: "" });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustData, setAdjustData] = useState({ quantityDelta: 0, reason: "" });
  const [submitting, setSubmitting] = useState(false);

  const loadBranches = useCallback(async () => {
    try {
      const res = await ownerGet<{ data?: BranchLite[] }>("/api/v1/owner/branches");
      setBranches(pickArray(res) as BranchLite[]);
    } catch {
      setBranches([]);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.branchId) params.set("branchId", filters.branchId);
      const res = await ownerGet<{ data?: DashboardCards }>(`/api/v1/inventory/dashboard?${params.toString()}`);
      setDashboard(res?.data ?? null);
    } catch {
      setDashboard(null);
    }
  }, [filters.branchId]);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(pagination.page));
      params.set("limit", String(pagination.limit));
      if (filters.branchId) params.set("branchId", filters.branchId);
      if (filters.search) params.set("search", filters.search);
      if (filters.status === "low") params.set("lowStockOnly", "true");
      const res = await ownerGet<{ data?: InventoryItem[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }>(
        `/api/v1/inventory?${params.toString()}`
      );
      let items = Array.isArray(res?.data) ? res.data : [];
      const pag = res?.pagination ?? { page: 1, limit: pagination.limit, total: items.length, totalPages: 1 };
      if (filters.status === "out") {
        items = items.filter((i) => (i.quantity ?? 0) === 0);
      }
      setInventory(items);
      setPagination({
        page: pag.page,
        limit: pag.limit,
        total: filters.status === "out" ? items.length : (pag.total ?? items.length),
        totalPages: filters.status === "out" ? 1 : Math.max(1, pag.totalPages ?? 1),
      });
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
      setInventory([]);
      toast.error(getMessageFromApiError(e as Error));
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters.branchId, filters.search, filters.status, toast]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const handleRequestAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    const locationId = selectedItem.locationId ?? (selectedItem as any).locationId;
    const variantId = selectedItem.variantId ?? selectedItem.variant?.id;
    if (!locationId || !variantId) {
      toast.error("Missing location or variant");
      return;
    }
    try {
      setSubmitting(true);
      await ownerPost("/api/v1/inventory/adjustment-requests", {
        locationId,
        variantId,
        quantityDelta: adjustData.quantityDelta,
        reason: adjustData.reason || undefined,
      });
      toast.success("Adjustment request submitted");
      setShowAdjustModal(false);
      setSelectedItem(null);
      setAdjustData({ quantityDelta: 0, reason: "" });
      loadInventory();
    } catch (e) {
      toast.error(getMessageFromApiError(e as Error));
    } finally {
      setSubmitting(false);
    }
  };

  const resetFilters = () => setFilters({ branchId: "", search: "", status: "" });

  const hasFilters = filters.branchId || filters.search || filters.status;
  const noBranchSelected = false;
  const dashboardCards = [
    { label: "Total SKUs", value: dashboard?.totalSkus ?? "—", icon: "ri-box-3-line" },
    { label: "Total Stock Qty", value: dashboard?.totalStockQty ?? "—", icon: "ri-stack-line" },
    { label: "Low Stock", value: dashboard?.lowStockCount ?? "—", icon: "ri-error-warning-line" },
    { label: "Out of Stock", value: dashboard?.outOfStockCount ?? "—", icon: "ri-close-circle-line" },
  ];

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Stock"
        subtitle="Ledger-based stock (adjust via request)"
        breadcrumbs={[
          { label: "Owner", href: "/owner/dashboard" },
          { label: "Inventory", href: "/owner/inventory" },
        ]}
      />

      {/* Filter bar */}
      <div className="card radius-12 mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-sm-6 col-md-3">
              <label className="form-label small">Branch</label>
              <select
                className="form-select form-select-sm"
                value={filters.branchId}
                onChange={(e) => setFilters((f) => ({ ...f, branchId: e.target.value }))}
              >
                <option value="">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name ?? b.title ?? b.code ?? `Branch #${b.id}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-sm-6 col-md-3">
              <label className="form-label small">Search (name / SKU)</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search…"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              />
            </div>
            <div className="col-sm-6 col-md-3">
              <label className="form-label small">Status</label>
              <select
                className="form-select form-select-sm"
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="">All</option>
                <option value="low">Low stock</option>
                <option value="out">Out of stock</option>
              </select>
            </div>
            <div className="col-sm-6 col-md-3 d-flex gap-2">
              {hasFilters && (
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={resetFilters}>
                  Reset
                </button>
              )}
              <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => loadInventory()}>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI summary cards */}
      <div className="row g-3 mb-3">
        {dashboardCards.map((card) => (
          <div key={card.label} className="col-6 col-md-3">
            <div className="card radius-12 h-100">
              <div className="card-body d-flex align-items-center justify-content-between">
                <div>
                  <div className="small text-muted">{card.label}</div>
                  <div className="fw-bold fs-5">{card.value}</div>
                </div>
                <div className="rounded-circle bg-light d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                  <i className={card.icon} aria-hidden />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="alert alert-danger radius-12" role="alert">
          {error}
        </div>
      )}

      {/* Main table card */}
      <div className="card radius-12">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : noBranchSelected ? (
            <div className="text-center py-5 px-3">
              <div className="mb-3 text-muted">
                <i className="ri-map-pin-line display-4" aria-hidden />
              </div>
              <h6 className="fw-semibold mb-2">Select a branch</h6>
              <p className="text-muted small mb-0">Choose a branch above to view inventory.</p>
            </div>
          ) : inventory.length === 0 ? (
            <div className="text-center py-5 px-3">
              <div className="mb-3 text-muted">
                <i className="ri-box-3-line display-4" aria-hidden />
              </div>
              <h6 className="fw-semibold mb-2">No inventory items found</h6>
              <p className="text-muted small mb-4">Inventory is calculated from Stock Ledger entries. Create stock requests or adjustments to see data here.</p>
              <div className="d-flex flex-wrap justify-content-center gap-2">
                <Link href="/owner/inventory/stock-requests" className="btn btn-primary radius-12">
                  <i className="ri-file-list-3-line me-1" aria-hidden />
                  View Stock Requests
                </Link>
                <Link href="/owner/products" className="btn btn-outline-secondary radius-12">
                  <i className="ri-book-open-line me-1" aria-hidden />
                  Go to Products
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Branch</th>
                      <th>Available</th>
                      <th>Reserved</th>
                      <th title="Not yet in API">In Transit</th>
                      <th>Reorder level</th>
                      <th>Status</th>
                      <th style={{ width: 80 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item) => {
                      const qty = item.quantity ?? 0;
                      const minStock = item.minStock ?? 10;
                      const status = getStockStatus(qty, minStock);
                      const available = item.availableQty ?? qty;
                      const reserved = item.reservedQty ?? 0;
                      const productId = item.productId ?? item.product?.id;
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
                          <td>{item.variant?.sku ?? "—"}</td>
                          <td>{item.branch?.name ?? item.location?.branch?.name ?? "—"}</td>
                          <td>{available}</td>
                          <td>{reserved}</td>
                          <td title="In-transit not in summary API">—</td>
                          <td>{minStock}</td>
                          <td>
                            <span className={`badge radius-12 ${status.class}`}>{status.label}</span>
                          </td>
                          <td>
                            <Dropdown align="end">
                              <Dropdown.Toggle variant="light" size="sm" className="btn-icon-more" id={`inv-${item.id}`}>
                                <i className="ri-more-2-fill" aria-hidden />
                              </Dropdown.Toggle>
                              <Dropdown.Menu>
                                <Dropdown.Item as={Link} href={`/owner/inventory/warehouse${item.locationId ? `?locationId=${item.locationId}` : ""}`}>
                                  <i className="ri-map-pin-line me-2" aria-hidden />
                                  View in Warehouse
                                </Dropdown.Item>
                                <Dropdown.Item
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setAdjustData({ quantityDelta: 0, reason: "" });
                                    setShowAdjustModal(true);
                                  }}
                                >
                                  <i className="ri-edit-line me-2" aria-hidden />
                                  Create Adjustment Request
                                </Dropdown.Item>
                                <Dropdown.Item as={Link} href="/owner/inventory/transfers/new">
                                  <i className="ri-truck-line me-2" aria-hidden />
                                  Create Transfer Request
                                </Dropdown.Item>
                                {productId && (
                                  <Dropdown.Item as={Link} href={`/owner/products/${productId}`}>
                                    <i className="ri-external-link-line me-2" aria-hidden />
                                    View Product
                                  </Dropdown.Item>
                                )}
                              </Dropdown.Menu>
                            </Dropdown>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {pagination.totalPages > 1 && (
                <div className="d-flex justify-content-end p-3 border-top">
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
                    align="end"
                    ariaLabel="Inventory pagination"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showAdjustModal && selectedItem && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => setShowAdjustModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h6 className="modal-title">Request Stock Adjustment</h6>
                <button type="button" className="btn-close" onClick={() => setShowAdjustModal(false)} aria-label="Close" />
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
                      readOnly
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Current Stock</label>
                    <input type="number" className="form-control radius-12" value={selectedItem.quantity} disabled readOnly />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Adjustment (positive=add, negative=deduct) *</label>
                    <input
                      type="number"
                      className="form-control radius-12"
                      value={adjustData.quantityDelta || ""}
                      onChange={(e) => setAdjustData({ ...adjustData, quantityDelta: parseInt(e.target.value, 10) || 0 })}
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
