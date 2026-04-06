"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Dropdown } from "react-bootstrap";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet, ownerGetSafe, ownerPost } from "@/app/owner/_lib/ownerApi";
import { PaginationBar } from "@/src/components/common/PaginationBar";
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
  product?: {
    id: number;
    name: string;
    slug?: string;
    isMedicine?: boolean;
    category?: { id: number; name: string } | null;
  } | null;
  variant?: { id: number; sku: string; title: string; barcode?: string | null } | null;
  location?: { id: number; name: string; type?: string; branch?: { id: number; name: string } };
  lastMovementAt?: string | null;
  activeBatchCount?: number;
  nearestExpiry?: string | null;
  nearExpiryQty?: number;
  expiredQty?: number;
  expiryStatus?: string;
}

type BranchLite = { id: number; name?: string; title?: string; code?: string };

type LocLite = { id: number; name: string; type?: string; branch?: { id: number; name: string } };

type DashboardCards = {
  totalSkus?: number;
  skusTracked?: number;
  totalStockQty?: number;
  lowStockCount?: number;
  outOfStockCount?: number;
  expiringCount?: number;
  nearExpiry30d?: number;
  expiredLotsCount?: number;
};

type OpsExceptionSummary = {
  pendingConfirmations?: { vendorReceiveSessions?: number; dispatchReceiveSessions?: number };
  discrepancies?: { inboundOpen?: number; dispatchPending?: number };
  queues?: { draftGrns?: number; inTransitDispatches?: number };
  blockedSales?: { posOrdersPendingPayment?: number };
};

function pickArray(resp: unknown): unknown[] {
  if (!resp) return [];
  const r = resp as Record<string, unknown>;
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(r.data)) return r.data as unknown[];
  if (Array.isArray(r.items)) return r.items as unknown[];
  return [];
}

function getStockStatus(quantity: number, minStock: number) {
  if (quantity === 0) return { label: "Out of stock", class: "bg-danger text-white" };
  if (minStock > 0 && quantity <= minStock) return { label: "Low stock", class: "bg-warning text-dark" };
  return { label: "In stock", class: "bg-success text-white" };
}

function formatTypeLabel(t?: string) {
  if (!t) return "—";
  return t.replace(/_/g, " ");
}

function hubBadgeClass(type?: string) {
  const u = (type || "").toUpperCase();
  if (u === "CENTRAL_WAREHOUSE" || u === "ONLINE_HUB") return "bg-primary-subtle text-primary";
  return "bg-secondary-subtle text-secondary";
}

export default function OwnerInventoryPage() {
  const toast = useToast();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [branches, setBranches] = useState<BranchLite[]>([]);
  const [locations, setLocations] = useState<LocLite[]>([]);
  const [dashboard, setDashboard] = useState<DashboardCards | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState({
    branchId: "",
    locationId: "",
    locationScope: "" as "" | "hub" | "branch",
    stockStatus: "" as "" | "in" | "low" | "out",
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [opsSummary, setOpsSummary] = useState<OpsExceptionSummary | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustData, setAdjustData] = useState({ quantityDelta: 0, reason: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPagination((p) => ({ ...p, page: 1 }));
  }, [filters.branchId, filters.locationId, filters.locationScope, filters.stockStatus, debouncedSearch]);

  const loadBranches = useCallback(async () => {
    try {
      const res = await ownerGet<{ data?: BranchLite[] }>("/api/v1/owner/branches");
      setBranches(pickArray(res) as BranchLite[]);
    } catch {
      setBranches([]);
    }
  }, []);

  const loadLocations = useCallback(async () => {
    try {
      const res = await ownerGet<{ data?: LocLite[] }>("/api/v1/inventory/locations");
      const list = Array.isArray(res?.data) ? res.data : [];
      setLocations(list);
    } catch {
      setLocations([]);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setDashboardError(null);
    try {
      const params = new URLSearchParams();
      if (filters.branchId) params.set("branchId", filters.branchId);
      if (filters.locationId) params.set("locationId", filters.locationId);
      if (filters.locationScope) params.set("locationScope", filters.locationScope);
      const res = await ownerGet<{ data?: DashboardCards }>(`/api/v1/inventory/dashboard?${params.toString()}`);
      if (!res) {
        setDashboard(null);
        setDashboardError("Unable to load metrics (session or access).");
        return;
      }
      if (res.data) setDashboard(res.data);
      else {
        setDashboard(null);
        setDashboardError("Metrics unavailable (check permissions or try again).");
      }
    } catch (e) {
      setDashboard(null);
      setDashboardError(getMessageFromApiError(e as Error));
    }
  }, [filters.branchId, filters.locationId, filters.locationScope]);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(pagination.page));
      params.set("limit", String(pagination.limit));
      if (filters.branchId) params.set("branchId", filters.branchId);
      if (filters.locationId) params.set("locationId", filters.locationId);
      if (filters.locationScope) params.set("locationScope", filters.locationScope);
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (filters.stockStatus === "low") params.set("stockStatus", "low");
      else if (filters.stockStatus === "out") params.set("stockStatus", "out");
      else if (filters.stockStatus === "in") params.set("stockStatus", "in");

      const res = await ownerGet<{
        data?: InventoryItem[];
        pagination?: { page: number; limit: number; total: number; totalPages: number };
      }>(`/api/v1/inventory?${params.toString()}`);

      if (!res) {
        setError("Unable to load inventory (session or access).");
        setInventory([]);
        return;
      }

      const items = Array.isArray(res.data) ? res.data : [];
      const pag = res?.pagination ?? { page: 1, limit: pagination.limit, total: items.length, totalPages: 1 };
      setInventory(items);
      setPagination({
        page: pag.page,
        limit: pag.limit,
        total: pag.total ?? items.length,
        totalPages: Math.max(1, pag.totalPages ?? 1),
      });
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
      setInventory([]);
      toast.error(getMessageFromApiError(e as Error));
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters, debouncedSearch, toast]);

  useEffect(() => {
    loadBranches();
    loadLocations();
  }, [loadBranches, loadLocations]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await ownerGetSafe<{ data?: OpsExceptionSummary }>("/api/v1/inventory/operations/exception-summary");
      if (cancelled) return;
      const data = res && typeof res === "object" ? (res as { data?: OpsExceptionSummary }).data : undefined;
      setOpsSummary(data ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const handleRequestAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    const locationId = selectedItem.locationId ?? (selectedItem as { locationId?: number }).locationId;
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
      loadDashboard();
    } catch (e) {
      toast.error(getMessageFromApiError(e as Error));
    } finally {
      setSubmitting(false);
    }
  };

  const resetFilters = () => {
    setFilters({ branchId: "", locationId: "", locationScope: "", stockStatus: "" });
    setSearchInput("");
    setDebouncedSearch("");
  };

  const hasFilters =
    filters.branchId || filters.locationId || filters.locationScope || filters.stockStatus || debouncedSearch;

  const filteredLocations = useMemo(() => {
    if (!filters.branchId) return locations;
    const bid = Number(filters.branchId);
    return locations.filter((l) => l.branch?.id === bid);
  }, [locations, filters.branchId]);

  const fmtQty = (n: number | undefined) =>
    typeof n === "number" && Number.isFinite(n) ? n.toLocaleString() : "0";

  const dashboardCards = useMemo(
    () => [
      { label: "SKUs with stock", value: dashboard?.totalSkus, icon: "ri-box-3-line", hint: "Distinct variants with on-hand > 0" },
      { label: "Total on hand", value: dashboard?.totalStockQty, icon: "ri-stack-line", hint: "Sum of on-hand qty (all tracked rows)" },
      { label: "Low stock", value: dashboard?.lowStockCount, icon: "ri-error-warning-line", hint: "On-hand > 0 and ≤ reorder default (10)" },
      { label: "Out of stock", value: dashboard?.outOfStockCount, icon: "ri-close-circle-line", hint: "Tracked rows with on-hand = 0" },
      { label: "Near expiry (30d)", value: dashboard?.nearExpiry30d, icon: "ri-timer-line", hint: "Lot lines expiring within 30 days" },
      { label: "Expired on hand", value: dashboard?.expiredLotsCount, icon: "ri-alarm-warning-line", hint: "Lot lines past expiry with qty" },
    ],
    [dashboard]
  );

  const hasOrgStockSignal =
    (dashboard?.totalSkus ?? 0) > 0 ||
    (dashboard?.totalStockQty ?? 0) > 0 ||
    (dashboard?.skusTracked ?? 0) > 0;

  const opsAttentionTotal = useMemo(() => {
    if (!opsSummary) return 0;
    const p = opsSummary.pendingConfirmations;
    const d = opsSummary.discrepancies;
    const q = opsSummary.queues;
    const b = opsSummary.blockedSales;
    return (
      (p?.vendorReceiveSessions ?? 0) +
      (p?.dispatchReceiveSessions ?? 0) +
      (d?.inboundOpen ?? 0) +
      (d?.dispatchPending ?? 0) +
      (q?.draftGrns ?? 0) +
      (q?.inTransitDispatches ?? 0) +
      (b?.posOrdersPendingPayment ?? 0)
    );
  }, [opsSummary]);

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Stock"
        subtitle="Physical stock by location (balances from receipts, transfers, and adjustments — not the same as catalog SKUs)"
        breadcrumbs={[
          { label: "Owner", href: "/owner/dashboard" },
          { label: "Inventory", href: "/owner/inventory" },
        ]}
      />

      <div className="alert alert-info radius-12 py-2 small mb-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
        <span>Forecasting, replenishment suggestions, and procurement rankings live under Supply planning.</span>
        <Link href="/owner/inventory/planning" className="btn btn-sm btn-primary">
          Supply planning
        </Link>
      </div>

      <div className="alert alert-secondary radius-12 py-2 small mb-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
        <span>Central MRP/base/floor, branch override bounds, retail discount rules, and pricing audit.</span>
        <Link href="/owner/inventory/pricing-governance" className="btn btn-sm btn-outline-dark">
          Pricing governance
        </Link>
      </div>

      {opsSummary && opsAttentionTotal > 0 && (
        <div
          className="alert alert-warning radius-12 py-2 small mb-3 d-flex flex-wrap align-items-center justify-content-between gap-2"
          role="status"
        >
          <div className="flex-grow-1">
            <strong className="me-1">Operations attention:</strong>
            {(opsSummary.pendingConfirmations?.vendorReceiveSessions ?? 0) +
              (opsSummary.pendingConfirmations?.dispatchReceiveSessions ?? 0) >
              0 && (
              <span className="me-2">
                Pending confirmations (vendor{" "}
                {opsSummary.pendingConfirmations?.vendorReceiveSessions ?? 0}, dispatch{" "}
                {opsSummary.pendingConfirmations?.dispatchReceiveSessions ?? 0})
              </span>
            )}
            {(opsSummary.discrepancies?.inboundOpen ?? 0) + (opsSummary.discrepancies?.dispatchPending ?? 0) > 0 && (
              <span className="me-2">
                Open discrepancies (inbound {opsSummary.discrepancies?.inboundOpen ?? 0}, dispatch{" "}
                {opsSummary.discrepancies?.dispatchPending ?? 0})
              </span>
            )}
            <span className="me-2">
              Draft GRNs {opsSummary.queues?.draftGrns ?? 0}, in-transit dispatches {opsSummary.queues?.inTransitDispatches ?? 0}
            </span>
            {(opsSummary.blockedSales?.posOrdersPendingPayment ?? 0) > 0 && (
              <span className="me-2">POS orders pending payment: {opsSummary.blockedSales?.posOrdersPendingPayment}</span>
            )}
          </div>
          <Link href="/owner/inventory/receipts" className="btn btn-sm btn-outline-dark shrink-0">
            Receipts &amp; queues
          </Link>
        </div>
      )}

      {dashboardError && (
        <div className="alert alert-warning radius-12 py-2 small mb-3" role="status">
          {dashboardError}
        </div>
      )}

      {/* Filters */}
      <div className="card radius-12 mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-6 col-md-4 col-lg-2">
              <label className="form-label small text-muted mb-1">Branch</label>
              <select
                className="form-select form-select-sm"
                value={filters.branchId}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    branchId: e.target.value,
                    locationId: "",
                  }))
                }
              >
                <option value="">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name ?? b.title ?? b.code ?? `Branch #${b.id}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md-4 col-lg-2">
              <label className="form-label small text-muted mb-1">Location</label>
              <select
                className="form-select form-select-sm"
                value={filters.locationId}
                onChange={(e) => setFilters((f) => ({ ...f, locationId: e.target.value }))}
              >
                <option value="">All locations</option>
                {filteredLocations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                    {l.branch?.name ? ` · ${l.branch.name}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md-4 col-lg-2">
              <label className="form-label small text-muted mb-1">Hub / branch</label>
              <select
                className="form-select form-select-sm"
                value={filters.locationScope}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    locationScope: (e.target.value || "") as "" | "hub" | "branch",
                  }))
                }
              >
                <option value="">All</option>
                <option value="hub">Hub / warehouse</option>
                <option value="branch">Branch locations</option>
              </select>
            </div>
            <div className="col-6 col-md-4 col-lg-2">
              <label className="form-label small text-muted mb-1">Stock status</label>
              <select
                className="form-select form-select-sm"
                value={filters.stockStatus}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    stockStatus: (e.target.value || "") as "" | "in" | "low" | "out",
                  }))
                }
              >
                <option value="">All</option>
                <option value="in">In stock</option>
                <option value="low">Low stock</option>
                <option value="out">Out of stock</option>
              </select>
            </div>
            <div className="col-12 col-md-8 col-lg-4">
              <label className="form-label small text-muted mb-1">Search (name / SKU / barcode)</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div className="col-12 col-lg-auto d-flex flex-wrap gap-2">
              {hasFilters && (
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={resetFilters}>
                  Reset
                </button>
              )}
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={() => {
                  loadInventory();
                  loadDashboard();
                }}
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="row g-3 mb-3">
        {dashboardCards.map((card) => (
          <div key={card.label} className="col-6 col-md-4 col-xl-2">
            <div className="card radius-12 h-100">
              <div className="card-body d-flex align-items-center justify-content-between py-3">
                <div>
                  <div className="small text-muted" title={card.hint}>
                    {card.label}
                  </div>
                  <div className="fw-bold fs-5">{card.value !== undefined && card.value !== null ? fmtQty(card.value as number) : "—"}</div>
                </div>
                <div className="rounded-circle bg-light d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 40, height: 40 }}>
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

      <div className="card radius-12">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : inventory.length === 0 ? (
            <div className="text-center py-5 px-3">
              <div className="mb-3 text-muted">
                <i className="ri-archive-line display-4" aria-hidden />
              </div>
              {hasOrgStockSignal && hasFilters ? (
                <>
                  <h6 className="fw-semibold mb-2">No rows match your filters</h6>
                  <p className="text-muted small mb-4">
                    Stock exists in your organization, but nothing matches the current branch, location, status, or search. Try clearing filters or
                    broadening search.
                  </p>
                </>
              ) : hasOrgStockSignal && !hasFilters ? (
                <>
                  <h6 className="fw-semibold mb-2">No stock rows in this view</h6>
                  <p className="text-muted small mb-4">
                    Balances are tracked per location and variant. If you expected lines here, confirm locations exist and receipts/transfers have been
                    posted.
                  </p>
                </>
              ) : (
                <>
                  <h6 className="fw-semibold mb-2">No on-hand stock recorded yet</h6>
                  <p className="text-muted small mb-4">
                    Products in your catalog do not create stock automatically. Record a receipt (bulk or GRN), complete a transfer in, or post opening
                    stock so balances appear here.
                  </p>
                </>
              )}
              <div className="d-flex flex-wrap justify-content-center gap-2">
                <Link href="/owner/inventory/receipts/bulk" className="btn btn-primary btn-sm radius-12">
                  <i className="ri-inbox-archive-line me-1" aria-hidden />
                  Bulk receipt
                </Link>
                <Link href="/owner/inventory/warehouse" className="btn btn-outline-primary btn-sm radius-12">
                  <i className="ri-building-2-line me-1" aria-hidden />
                  Warehouse
                </Link>
                <Link href="/owner/inventory/stock-requests" className="btn btn-outline-secondary btn-sm radius-12">
                  <i className="ri-file-list-3-line me-1" aria-hidden />
                  Stock requests
                </Link>
                <Link href="/owner/products" className="btn btn-outline-secondary btn-sm radius-12">
                  <i className="ri-book-open-line me-1" aria-hidden />
                  Products
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
                      <th>Category</th>
                      <th>Branch</th>
                      <th>Location</th>
                      <th className="text-end">On hand</th>
                      <th className="text-end">Reserved</th>
                      <th className="text-end">Avail.</th>
                      <th>Batches</th>
                      <th>Expiry</th>
                      <th className="text-end">Reorder</th>
                      <th>Status</th>
                      <th>Last move</th>
                      <th style={{ width: 72 }}> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item) => {
                      const qty = item.quantity ?? 0;
                      const minStock = item.minStock ?? 10;
                      const status = getStockStatus(qty, minStock);
                      const available = item.availableQty ?? qty - (item.reservedQty ?? 0);
                      const productId = item.productId ?? item.product?.id;
                      const locType = item.location?.type;
                      const lastMove = item.lastMovementAt
                        ? new Date(item.lastMovementAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
                        : "—";
                      return (
                        <tr key={String(item.id)}>
                          <td>
                            <strong>{item.product?.name ?? "—"}</strong>
                            {item.product?.isMedicine ? (
                              <span className="badge bg-info-subtle text-info ms-1 small">Medicine</span>
                            ) : null}
                            {item.product?.slug ? (
                              <>
                                <br />
                                <small className="text-muted">{item.product.slug}</small>
                              </>
                            ) : null}
                          </td>
                          <td>
                            <span className="text-nowrap">{item.variant?.sku ?? "—"}</span>
                            {item.variant?.barcode ? (
                              <>
                                <br />
                                <small className="text-muted">{item.variant.barcode}</small>
                              </>
                            ) : null}
                          </td>
                          <td>{item.product?.category?.name ?? "—"}</td>
                          <td>{item.branch?.name ?? item.location?.branch?.name ?? "—"}</td>
                          <td>
                            <div className="small">{item.location?.name ?? "—"}</div>
                            <span className={`badge radius-12 small ${hubBadgeClass(locType)}`}>{formatTypeLabel(locType)}</span>
                          </td>
                          <td className="text-end">{fmtQty(qty)}</td>
                          <td className="text-end">{fmtQty(item.reservedQty ?? 0)}</td>
                          <td className="text-end">{fmtQty(available)}</td>
                          <td>
                            <span className="badge bg-light text-dark">{item.activeBatchCount ?? 0}</span>
                          </td>
                          <td>
                            <div className="small">
                              {item.nearestExpiry
                                ? new Date(item.nearestExpiry).toLocaleDateString()
                                : (item.activeBatchCount ?? 0) > 0
                                  ? "—"
                                  : "No lots"}
                            </div>
                            {item.expiryStatus && item.expiryStatus !== "—" ? (
                              <span
                                className={`badge small radius-12 ${
                                  (item.expiredQty ?? 0) > 0
                                    ? "bg-danger text-white"
                                    : (item.nearExpiryQty ?? 0) > 0
                                      ? "bg-warning text-dark"
                                      : "bg-success-subtle text-success"
                                }`}
                              >
                                {item.expiryStatus}
                              </span>
                            ) : null}
                          </td>
                          <td className="text-end">{fmtQty(minStock)}</td>
                          <td>
                            <span className={`badge radius-12 ${status.class}`}>{status.label}</span>
                          </td>
                          <td className="small text-muted text-nowrap">{lastMove}</td>
                          <td>
                            <Dropdown align="end">
                              <Dropdown.Toggle variant="light" size="sm" className="btn-icon-more" id={`inv-${item.id}`}>
                                <i className="ri-more-2-fill" aria-hidden />
                              </Dropdown.Toggle>
                              <Dropdown.Menu>
                                <Dropdown.Item as={Link} href={`/owner/inventory/warehouse${item.locationId ? `?locationId=${item.locationId}` : ""}`}>
                                  <i className="ri-map-pin-line me-2" aria-hidden />
                                  Warehouse
                                </Dropdown.Item>
                                <Dropdown.Item
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setAdjustData({ quantityDelta: 0, reason: "" });
                                    setShowAdjustModal(true);
                                  }}
                                >
                                  <i className="ri-edit-line me-2" aria-hidden />
                                  Adjustment request
                                </Dropdown.Item>
                                <Dropdown.Item as={Link} href="/owner/inventory/transfers/new">
                                  <i className="ri-truck-line me-2" aria-hidden />
                                  Transfer
                                </Dropdown.Item>
                                {productId ? (
                                  <Dropdown.Item as={Link} href={`/owner/products/${productId}`}>
                                    <i className="ri-external-link-line me-2" aria-hidden />
                                    Product
                                  </Dropdown.Item>
                                ) : null}
                              </Dropdown.Menu>
                            </Dropdown>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {pagination.total > 0 && (
                <div className="p-3 border-top">
                  <PaginationBar
                    page={pagination.page}
                    pageSize={pagination.limit}
                    total={pagination.total}
                    totalPages={pagination.totalPages}
                    disabled={false}
                    onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
                    className="mt-0 pt-0 border-0"
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
                <h6 className="modal-title">Request stock adjustment</h6>
                <button type="button" className="btn-close" onClick={() => setShowAdjustModal(false)} aria-label="Close" />
              </div>
              <form onSubmit={handleRequestAdjustment}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Product</label>
                    <input
                      type="text"
                      className="form-control radius-12"
                      value={`${selectedItem.product?.name ?? ""}${selectedItem.variant ? ` — ${selectedItem.variant.title}` : ""}`}
                      disabled
                      readOnly
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Current on hand</label>
                    <input type="number" className="form-control radius-12" value={selectedItem.quantity} disabled readOnly />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Adjustment (positive = add, negative = deduct) *</label>
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
                  <p className="small text-muted mb-0">You will review and approve the request per your workflow.</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary radius-12" onClick={() => setShowAdjustModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary radius-12" disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit"}
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
