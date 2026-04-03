"use client";

/**
 * Canonical create route (flat segment) — avoids Next.js 16 nested-route 404 under [branchId]/stock-requests/new.
 * Legacy URL .../inventory/stock-requests/new redirects here (proxy + next.config + thin redirect page).
 *
 * Implementation Plan (New Stock Request product picker):
 * - Two-panel layout: left = Product Picker table (paginated, search, sort, filters); right = Selected Items sticky panel (qty, note, remove, submit).
 * - Data: GET /api/v1/inventory/stock-request-products (branchId, search, page, limit, sort, stockStatus); POST /api/v1/stock-requests for create.
 * - Reuses: Pagination, useToast, staffStockRequestCreate, BranchHeader, AccessDenied. Draft in localStorage by branchId.
 * - Validation: variant required when product has variants; qty > 0 integer; invalid rows highlighted.
 * - a11y: aria-labels, / focuses search, keyboard-friendly.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffStockRequestDetailPath, staffStockRequestListPath } from "@/lib/staffInventoryRoutes";
import { staffStockRequestProducts, staffStockRequestCreate } from "@/lib/api";
import { canCreateStockRequest, isWarehouseHubBranch } from "@/lib/staffStockRequestRbac";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PaginationBar } from "@/src/components/common/PaginationBar";
import { useToast } from "@/src/hooks/useToast";

/** Shown on hard deny (no branch view) */
const BRANCH_VIEW_PERMS = "branch.view + dashboard.view";
const DRAFT_KEY_PREFIX = "staff-stock-request-draft-";
const DEBOUNCE_MS = 400;
const PAGE_SIZE_OPTIONS = [20, 30, 50];
const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "low_stock", label: "Low stock first" },
  { value: "most_used", label: "Most used" },
  { value: "name_asc", label: "A–Z" },
];
const STOCK_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "low", label: "Low" },
  { value: "out", label: "Out" },
];

function stockBadgeClass(stockOnHand, lowThreshold) {
  if (stockOnHand <= 0) return "bg-danger text-white";
  if (lowThreshold > 0 && stockOnHand <= lowThreshold) return "bg-warning text-dark";
  return "bg-success text-white";
}

function stockLabel(stockOnHand, lowThreshold) {
  if (stockOnHand <= 0) return "Out";
  if (lowThreshold > 0 && stockOnHand <= lowThreshold) return "Low";
  return "OK";
}

function getExpiryBadge(batchInfo) {
  if (!batchInfo) return null;
  if (batchInfo.expiredQty > 0) return { label: "Expired stock", class: "bg-danger text-white", icon: "ri-error-warning-line" };
  if (batchInfo.nearExpiryQty > 0) return { label: "Near expiry", class: "bg-warning text-dark", icon: "ri-time-line" };
  if (batchInfo.activeLots > 0) return { label: `${batchInfo.activeLots} batch${batchInfo.activeLots > 1 ? 'es' : ''}`, class: "bg-info text-white", icon: "ri-archive-line" };
  return null;
}

function formatExpiryDate(date) {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `Expired ${Math.abs(diffDays)}d ago`;
  if (diffDays === 0) return "Expires today";
  if (diffDays <= 30) return `Expires in ${diffDays}d`;
  return d.toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" });
}

/** Selected item: productId, variantId, productName, variantLabel, sku, requestedQty, note, stockOnHand (for display) */
function selectedKey(productId, variantId) {
  return `${productId}-${variantId}`;
}

export default function StaffBranchStockRequestCreatePage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading, errorCode, hasViewPermission } = useBranchContext(branchId);
  const toast = useToast();
  const searchInputRef = useRef(null);

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 30, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState("recommended");
  const [stockStatus, setStockStatus] = useState("all");
  const [onlyShowSelected, setOnlyShowSelected] = useState(false);
  /** Per-product variant choice for the left table dropdown (productId -> variantId) */
  const [variantChoice, setVariantChoice] = useState({});
  const [selected, setSelected] = useState(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(DRAFT_KEY_PREFIX + branchId);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.items)) {
        const map = {};
        parsed.items.forEach((it) => {
          const k = selectedKey(it.productId, it.variantId);
          map[k] = {
            productId: it.productId,
            variantId: it.variantId,
            productName: it.productName ?? "",
            variantLabel: it.variantLabel ?? "",
            sku: it.sku ?? "",
            requestedQty: it.requestedQty ?? 1,
            note: it.note ?? "",
            stockOnHand: it.stockOnHand ?? 0,
            batchInfo: it.batchInfo || null,
          };
        });
        return map;
      }
      return {};
    } catch {
      return {};
    }
  });
  const [draftRestored, setDraftRestored] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [pickerMeta, setPickerMeta] = useState(null);
  const permissions = myAccess?.permissions ?? [];
  const canCreate = canCreateStockRequest(branch, permissions);
  const warehouseHub = isWarehouseHubBranch(branch);

  useEffect(() => {
    if (errorCode === "unauthorized") router.replace("/staff/login");
  }, [errorCode, router]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const loadProducts = useCallback(() => {
    if (!branchId || !canCreate) return;
    setLoading(true);
    setError("");
    staffStockRequestProducts(branchId, {
      orgId: branch?.orgId != null ? Number(branch.orgId) : undefined,
      search: debouncedSearch || undefined,
      page: pagination.page,
      limit: pagination.limit,
      sort: sort,
      stockStatus: stockStatus,
    })
      .then((res) => {
        const list = res.items ?? [];
        setItems(list);
        setVariantChoice((prev) => {
          const next = { ...prev };
          list.forEach((p) => {
            const firstId = (p.variants && p.variants[0]) ? p.variants[0].id : null;
            if (firstId != null && next[p.id] === undefined) next[p.id] = firstId;
          });
          return next;
        });
        setPickerMeta(res.meta ?? null);
        setPagination((prev) => ({
          ...prev,
          ...(res.pagination ?? {}),
          page: res.pagination?.page ?? prev.page,
          limit: res.pagination?.limit ?? prev.limit,
          total: res.pagination?.total ?? 0,
          totalPages: res.pagination?.totalPages ?? 1,
        }));
      })
      .catch((e) => {
        setError(e?.message ?? "Failed to load products");
        setItems([]);
        setPickerMeta(null);
      })
      .finally(() => setLoading(false));
  }, [branchId, branch?.orgId, canCreate, debouncedSearch, pagination.page, pagination.limit, sort, stockStatus]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const selCount = Object.keys(selected).length;
    if (selCount > 0 && !draftRestored) setDraftRestored(true);
  }, [selected, draftRestored]);

  const saveDraft = useCallback(() => {
    const list = Object.values(selected).map((s) => ({
      productId: s.productId,
      variantId: s.variantId,
      productName: s.productName,
      variantLabel: s.variantLabel,
      sku: s.sku,
      requestedQty: s.requestedQty,
      note: s.note,
      stockOnHand: s.stockOnHand,
      batchInfo: s.batchInfo || null,
    }));
    try {
      localStorage.setItem(DRAFT_KEY_PREFIX + branchId, JSON.stringify({ items: list }));
      toast.success("Draft saved");
    } catch {
      toast.error("Could not save draft");
    }
  }, [branchId, selected, toast]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY_PREFIX + branchId);
    } catch {}
    setSelected({});
    toast.info("Draft cleared");
  }, [branchId, toast]);

  const selectOnPage = useCallback(() => {
    setSelected((prev) => {
      const next = { ...prev };
      items.forEach((p) => {
        const vid = variantChoice[p.id] ?? (p.variants && p.variants[0]?.id);
        if (vid == null) return;
        const v = (p.variants || []).find((x) => x.id === vid);
        if (!v) return;
        const k = selectedKey(p.id, v.id);
        if (!next[k])
          next[k] = {
            productId: p.id,
            variantId: v.id,
            productName: p.name,
            variantLabel: v.title || v.sku,
            sku: v.sku,
            requestedQty: 1,
            note: "",
            stockOnHand: v.stockOnHand ?? 0,
            batchInfo: v.batchInfo || null,
          };
      });
      return next;
    });
  }, [items, variantChoice]);

  const toggleProductVariant = useCallback((product, variant) => {
    const k = selectedKey(product.id, variant.id);
    setSelected((prev) => {
      if (prev[k]) {
        const next = { ...prev };
        delete next[k];
        return next;
      }
      return {
        ...prev,
        [k]: {
          productId: product.id,
          variantId: variant.id,
          productName: product.name,
          variantLabel: variant.title || variant.sku,
          sku: variant.sku,
          requestedQty: 1,
          note: "",
          stockOnHand: variant.stockOnHand ?? 0,
          batchInfo: variant.batchInfo || null,
        },
      };
    });
  }, []);

  const updateSelected = useCallback((key, field, value) => {
    setSelected((prev) => {
      const cur = prev[key];
      if (!cur) return prev;
      const next = { ...prev };
      next[key] = { ...cur, [field]: value };
      return next;
    });
  }, []);

  const removeSelected = useCallback((key) => {
    setSelected((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const selectedList = useMemo(() => Object.entries(selected).map(([k, v]) => ({ key: k, ...v })), [selected]);
  const totalQty = useMemo(() => selectedList.reduce((s, i) => s + (Number(i.requestedQty) || 0), 0), [selectedList]);
  const invalidSelected = useMemo(() => {
    return selectedList.filter((i) => {
      const q = Number(i.requestedQty);
      return !Number.isInteger(q) || q < 1;
    });
  }, [selectedList]);
  const canSubmit = selectedList.length > 0 && invalidSelected.length === 0;

  /** Keys of `selected` for O(1) lookup when filtering the product table */
  const selectedKeysSet = useMemo(() => new Set(Object.keys(selected)), [selected]);

  const displayItems = useMemo(() => {
    const filtered = onlyShowSelected
      ? items.filter((p) =>
          (p.variants || []).some((v) => selectedKeysSet.has(selectedKey(p.id, v.id)))
        )
      : items;
    return filtered.filter((p) => (p.variants || []).length > 0);
  }, [items, onlyShowSelected, selectedKeysSet]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      toast.error("Add at least one item with quantity ≥ 1.");
      return;
    }
    const payload = selectedList.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      requestedQty: Number(i.requestedQty) || 1,
      note: (i.note || "").trim() || undefined,
    }));
    setSubmitting(true);
    setError("");
    try {
      const res = await staffStockRequestCreate({
        branchId: Number(branchId),
        orgId: branch?.orgId != null ? Number(branch.orgId) : undefined,
        items: payload,
      });
      if (res?.data?.id) {
        clearDraft();
        toast.success("Stock request created");
        router.push(staffStockRequestDetailPath(branchId, res.data.id));
        return;
      }
      const msg = res?.message ?? "Request created but no ID returned.";
      setError(msg);
      toast.error(msg);
    } catch (err) {
      const msg = err?.message ?? "Failed to create request";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getChosenVariant = (p) => {
    const vid = variantChoice[p.id] ?? (p.variants && p.variants[0]?.id);
    return (p.variants || []).find((v) => v.id === vid) ?? (p.variants && p.variants[0]);
  };

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "/" && e.target !== document.body && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName)) return;
      if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const totalExpiryRisk = useMemo(() => {
    let nearExpiry = 0;
    let expired = 0;
    selectedList.forEach((item) => {
      const product = items.find((p) => p.id === item.productId);
      if (product) {
        const variant = product.variants?.find((v) => v.id === item.variantId);
        if (variant?.batchInfo) {
          nearExpiry += variant.batchInfo.nearExpiryQty || 0;
          expired += variant.batchInfo.expiredQty || 0;
        }
      }
    });
    return { nearExpiry, expired };
  }, [selectedList, items]);

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" aria-label="Loading" />
        <p className="mt-16 text-secondary">Loading...</p>
      </div>
    );
  }
  if (errorCode === "forbidden" || !hasViewPermission) {
    return (
      <AccessDenied
        title="Not authorized for this branch"
        message="You don't have access to this branch or your session expired. Try selecting the branch again or contact your administrator."
        missingPerm={BRANCH_VIEW_PERMS}
        onBack={() => router.push(staffStockRequestListPath(branchId))}
      />
    );
  }

  if (!canCreate) {
    return (
      <div className="container py-24">
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        <Card className="radius-12">
          <div className="card-body p-24 text-center">
            <div className="mb-16">
              <i className="ri-file-forbid-line text-warning" style={{ fontSize: "48px" }} aria-hidden />
            </div>
            <h5 className="mb-12">Stock request creation is not available for your role</h5>
            <p className="text-secondary-light mb-16 mx-auto" style={{ maxWidth: "520px" }}>
              {warehouseHub ? (
                <>
                  Distribution / warehouse hubs need explicit permission to raise stock requests (e.g. inventory or warehouse
                  operations). You can ask your organization owner to grant access, or request replenishment from another
                  warehouse or the central team.
                </>
              ) : (
                <>
                  Your account doesn&apos;t include permission to create stock requests on this branch. Ask a branch
                  manager or owner to grant <span className="text-secondary fw-semibold">inventory</span> access, or use
                  &quot;Request access&quot; below if your org uses access requests.
                </>
              )}
            </p>
            <div className="d-flex flex-wrap gap-12 justify-content-center">
              <Link href={staffStockRequestListPath(branchId)} className="btn btn-outline-secondary">
                Back to requests
              </Link>
              <Link href={`/staff/branch/${branchId}/approvals`} className="btn btn-primary">
                Request access
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      
      {/* Page Header with Breadcrumbs */}
      <nav aria-label="breadcrumb" className="mb-2">
        <ol className="breadcrumb mb-0 small">
          <li className="breadcrumb-item"><Link href="/staff">Staff</Link></li>
          <li className="breadcrumb-item"><Link href="/staff/branch">Branches</Link></li>
          <li className="breadcrumb-item"><Link href={`/staff/branch/${branchId}`}>{branch?.name || `Branch #${branchId}`}</Link></li>
          <li className="breadcrumb-item"><Link href={`/staff/branch/${branchId}/inventory`}>Inventory</Link></li>
          <li className="breadcrumb-item active">New Stock Request</li>
        </ol>
      </nav>
      
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <div className="d-flex align-items-center gap-3">
          <Link
            href={staffStockRequestListPath(branchId)}
            className="btn btn-outline-secondary btn-sm radius-12"
            aria-label="Back to stock requests"
          >
            ← Back
          </Link>
          <div>
            <h5 className="mb-0">New Stock Request</h5>
            <p className="text-muted small mb-0">Select products and specify quantities</p>
          </div>
        </div>
        <span className="badge bg-primary">Draft</span>
      </div>

      {/* Summary Strip */}
      {selectedList.length > 0 && (
        <div className="row g-2 mb-3">
          <div className="col-6 col-md-3">
            <Card className="h-100">
              <div className="card-body py-2 px-3 d-flex align-items-center justify-content-between">
                <div>
                  <div className="small text-muted">Selected Items</div>
                  <div className="fw-bold fs-5">{selectedList.length}</div>
                </div>
                <i className="ri-shopping-cart-line text-primary fs-4" aria-hidden />
              </div>
            </Card>
          </div>
          <div className="col-6 col-md-3">
            <Card className="h-100">
              <div className="card-body py-2 px-3 d-flex align-items-center justify-content-between">
                <div>
                  <div className="small text-muted">Total Quantity</div>
                  <div className="fw-bold fs-5">{totalQty}</div>
                </div>
                <i className="ri-stack-line text-success fs-4" aria-hidden />
              </div>
            </Card>
          </div>
          <div className="col-6 col-md-3">
            <Card className="h-100">
              <div className="card-body py-2 px-3 d-flex align-items-center justify-content-between">
                <div>
                  <div className="small text-muted">Validation</div>
                  <div className={`fw-bold fs-5 ${invalidSelected.length > 0 ? 'text-danger' : 'text-success'}`}>
                    {invalidSelected.length > 0 ? `${invalidSelected.length} invalid` : 'All valid'}
                  </div>
                </div>
                <i className={`${invalidSelected.length > 0 ? 'ri-error-warning-line text-danger' : 'ri-checkbox-circle-line text-success'} fs-4`} aria-hidden />
              </div>
            </Card>
          </div>
          <div className="col-6 col-md-3">
            <Card className="h-100">
              <div className="card-body py-2 px-3 d-flex align-items-center justify-content-between">
                <div>
                  <div className="small text-muted">Expiry Risk</div>
                  <div className={`fw-bold fs-5 ${totalExpiryRisk.expired > 0 ? 'text-danger' : totalExpiryRisk.nearExpiry > 0 ? 'text-warning' : 'text-success'}`}>
                    {totalExpiryRisk.expired > 0 ? 'Has expired' : totalExpiryRisk.nearExpiry > 0 ? 'Near expiry' : 'OK'}
                  </div>
                </div>
                <i className={`${totalExpiryRisk.expired > 0 ? 'ri-alert-line text-danger' : totalExpiryRisk.nearExpiry > 0 ? 'ri-time-line text-warning' : 'ri-shield-check-line text-success'} fs-4`} aria-hidden />
              </div>
            </Card>
          </div>
        </div>
      )}

      {draftRestored && selectedList.length > 0 && (
        <div className="alert alert-info d-flex align-items-center justify-content-between mb-3" role="status">
          <span>Draft restored ({selectedList.length} item(s)). Edit and submit or clear.</span>
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={clearDraft}>
            Clear draft
          </button>
        </div>
      )}

      {pickerMeta?.defaultLocationCreated && (
        <div className="alert alert-warning py-2 mb-3" role="status">
          A default branch stock location was created so inventory can be tracked. Stock counts may show zero until receipts are posted.
        </div>
      )}
      {pickerMeta?.catalogTruncated && (
        <div className="alert alert-warning py-2 mb-3" role="status">
          Product catalog is large; results are capped. Refine search to see all SKUs.
        </div>
      )}
{error && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between mb-3">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}

      <div className="row g-3">
        {/* Left: Product Picker */}
        <div className="col-12 col-lg-7">
          <Card className="h-100 d-flex flex-column">
            <div className="card-body flex-grow-1 d-flex flex-column overflow-hidden">
              <h6 className="card-title mb-3">Product Picker</h6>
              <div className="card radius-12 mb-3 p-2">
                <div className="row g-2 align-items-end flex-wrap">
                  <div className="col-12 col-md">
                    <label className="form-label small mb-0">Search (name / SKU / barcode)</label>
                    <input
                      ref={searchInputRef}
                      type="search"
                      className="form-control form-control-sm radius-12"
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      aria-label="Search products by name, SKU or barcode"
                    />
                  </div>
                  <div className="col-6 col-md">
                    <label className="form-label small mb-0">Sort</label>
                    <select
                      className="form-select form-select-sm radius-12"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      aria-label="Sort order"
                    >
                      {SORT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-6 col-md">
                    <label className="form-label small mb-0">Stock</label>
                    <select
                      className="form-select form-select-sm radius-12"
                      value={stockStatus}
                      onChange={(e) => setStockStatus(e.target.value)}
                      aria-label="Filter by stock status"
                    >
                      {STOCK_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-auto">
                    <div className="form-check">
                      <input
                        id="only-selected"
                        type="checkbox"
                        className="form-check-input"
                        checked={onlyShowSelected}
                        onChange={(e) => setOnlyShowSelected(e.target.checked)}
                        aria-label="Only show selected"
                      />
                      <label className="form-check-label small" htmlFor="only-selected">
                        Only show selected
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                <span className="small text-secondary">
                  Page size:
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`btn btn-sm ms-1 ${pagination.limit === n ? "btn-primary" : "btn-outline-secondary"}`}
                      onClick={() => setPagination((p) => ({ ...p, limit: n, page: 1 }))}
                      aria-label={`Show ${n} per page`}
                    >
                      {n}
                    </button>
                  ))}
                </span>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={selectOnPage}
                  aria-label="Select all on this page"
                >
                  Select all on page
                </button>
              </div>
              <div className="table-responsive flex-grow-1 overflow-auto" style={{ minHeight: "280px" }}>
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border spinner-border-sm text-primary" role="status" aria-label="Loading products" />
                  </div>
                ) : (
                  <table className="table table-sm table-striped table-hover mb-0" aria-label="Product list">
                    <thead className="table-light sticky-top">
                      <tr>
                        <th style={{ width: "40px" }} aria-label="Select">
                          <span className="visually-hidden">Select</span>
                        </th>
                        <th style={{ width: "44px" }} aria-label="Image"> </th>
                        <th>Product</th>
                        <th>Variant</th>
                        <th>Branch</th>
                        <th>Central</th>
                        <th>Batch/Expiry</th>
                        <th className="text-end">Usage (30d)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayItems.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center text-secondary py-4">
                            No products match. Try a different search or filters.
                            {warehouseHub && (
                              <span className="d-block small mt-2 text-muted">
                                At warehouse hubs, results include your org catalog with branch and central stock columns;
                                refine search if the catalog is large.
                              </span>
                            )}
                          </td>
                        </tr>
                      ) : (
                        displayItems.map((p) => {
                          const v = getChosenVariant(p);
                          if (!v || !p.variants || p.variants.length === 0) return null;
                          const k = selectedKey(p.id, v.id);
                          const isSelected = !!selected[k];
                          const expiryBadge = getExpiryBadge(v.batchInfo);
                          return (
                            <tr key={p.id} className={isSelected ? "table-primary" : ""}>
                              <td className="align-middle">
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={isSelected}
                                  onChange={() => toggleProductVariant(p, v)}
                                  aria-label={`Select ${p.name} ${v.title || v.sku}`}
                                />
                              </td>
                              <td className="align-middle">
                                <div
                                  className="rounded bg-light d-flex align-items-center justify-content-center text-secondary"
                                  style={{ width: 40, height: 40 }}
                                  aria-hidden
                                >
                                  <i className="ri-box-3-line" style={{ fontSize: "1.2rem" }} />
                                </div>
                              </td>
                              <td className="align-middle">
                                <span className="fw-bold">{p.name}</span>
                                <br />
                                <small className="text-muted">{v.sku}</small>
                                {(p.category?.name || p.brand?.name) && <br />}
                                {p.category?.name && <small className="text-muted">{p.category.name}</small>}
                                {p.brand?.name && <small className="text-muted ms-1"> · {p.brand.name}</small>}
                              </td>
                              <td className="align-middle">
                                <select
                                  className="form-select form-select-sm"
                                  value={v.id}
                                  onChange={(e) => {
                                    const newVid = Number(e.target.value);
                                    setVariantChoice((prev) => ({ ...prev, [p.id]: newVid }));
                                  }}
                                  aria-label={`Variant for ${p.name}`}
                                >
                                  {(p.variants || []).map((vopt) => (
                                    <option key={vopt.id} value={vopt.id}>
                                      {vopt.title || vopt.sku}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="align-middle">
                                <span
                                  className={`badge ${stockBadgeClass(v.stockOnHand, v.lowStockThreshold)}`}
                                  title="Branch on-hand"
                                >
                                  {stockLabel(v.stockOnHand, v.lowStockThreshold)} · {v.stockOnHand}
                                </span>
                              </td>
                              <td className="align-middle">
                                <span className="small text-muted" title="Central warehouse on-hand">
                                  {typeof v.centralOnHand === "number" && v.centralOnHand > 0 ? v.centralOnHand : "—"}
                                </span>
                              </td>
                              <td className="align-middle">
                                {v.batchInfo ? (
                                  <div className="d-flex flex-column gap-1">
                                    {expiryBadge && (
                                      <span className={`badge ${expiryBadge.class} small`} title={expiryBadge.label}>
                                        <i className={`${expiryBadge.icon} me-1`} aria-hidden />
                                        {expiryBadge.label}
                                      </span>
                                    )}
                                    {v.batchInfo.nearestExpiry && (
                                      <small className="text-muted">{formatExpiryDate(v.batchInfo.nearestExpiry)}</small>
                                    )}
                                  </div>
                                ) : (
                                  <span className="small text-muted">—</span>
                                )}
                              </td>
                              <td className="align-middle text-end">
                                {v.usageMetric > 0 ? (
                                  <span className="small text-muted">Req: {v.usageMetric}</span>
                                ) : (
                                  <span className="small text-muted">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                )}
              </div>
              <PaginationBar
                page={pagination.page}
                pageSize={pagination.limit}
                total={pagination.total}
                totalPages={pagination.totalPages}
                disabled={false}
                onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
                className="mt-2 border-0 pt-2"
                ariaLabel="Product list pages"
              />
            </div>
          </Card>
        </div>

        {/* Right: Selected panel */}
        <div className="col-12 col-lg-5">
          <div className="card radius-12 sticky-top" style={{ top: "1rem" }}>
            <div className="card-body">
              <h6 className="card-title mb-3">Selected Items</h6>
              {selectedList.length === 0 ? (
                <p className="text-muted small mb-0">Select products from the list. Use variant dropdown per product if multiple variants.</p>
              ) : (
                <>
                  <div className="overflow-auto mb-3" style={{ maxHeight: "420px" }}>
                    <ul className="list-group list-group-flush">
                      {selectedList.map(({ key, productName, variantLabel, sku, requestedQty, note, stockOnHand, productId, variantId }) => {
                        const q = Number(requestedQty);
                        const invalid = !Number.isInteger(q) || q < 1;
                        const product = items.find((p) => p.id === productId);
                        const variant = product?.variants?.find((v) => v.id === variantId);
                        const expiryBadge = getExpiryBadge(variant?.batchInfo);
                        return (
                          <li
                            key={key}
                            className={`list-group-item d-flex flex-column gap-2 ${invalid ? "list-group-item-danger" : ""}`}
                          >
                            <div className="d-flex justify-content-between align-items-start">
                              <div className="flex-grow-1">
                                <span className="fw-bold">{productName}</span>
                                <br />
                                <small className="text-muted">{variantLabel} · {sku}</small>
                                {variant?.batchInfo && (
                                  <>
                                    <br />
                                    <div className="d-flex flex-wrap gap-1 mt-1">
                                      {expiryBadge && (
                                        <span className={`badge ${expiryBadge.class} small`}>
                                          <i className={`${expiryBadge.icon} me-1`} aria-hidden />
                                          {expiryBadge.label}
                                        </span>
                                      )}
                                      {variant.batchInfo.nearestExpiry && (
                                        <small className="text-muted">{formatExpiryDate(variant.batchInfo.nearestExpiry)}</small>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                              <span className={`badge ${stockBadgeClass(stockOnHand, 10)}`}>
                                {stockOnHand}
                              </span>
                            </div>
                            <div className="input-group input-group-sm">
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => updateSelected(key, "requestedQty", Math.max(1, (Number(requestedQty) || 1) - 1))}
                                aria-label="Decrease quantity"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min={1}
                                className="form-control text-center"
                                value={requestedQty}
                                onChange={(e) => updateSelected(key, "requestedQty", e.target.value)}
                                aria-label={`Quantity for ${productName} ${variantLabel}`}
                              />
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => updateSelected(key, "requestedQty", (Number(requestedQty) || 0) + 1)}
                                aria-label="Increase quantity"
                              >
                                +
                              </button>
                            </div>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="Note (optional)"
                              value={note}
                              onChange={(e) => updateSelected(key, "note", e.target.value)}
                              aria-label={`Note for ${productName}`}
                            />
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger align-self-start"
                              onClick={() => removeSelected(key)}
                              aria-label={`Remove ${productName} from selection`}
                            >
                              <i className="ri-close-line" aria-hidden /> Remove
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="border-top pt-3 mb-2">
                    <div className="row g-2 small">
                      <div className="col-6">
                        <div className="text-muted">Items</div>
                        <div className="fw-bold">{selectedList.length}</div>
                      </div>
                      <div className="col-6">
                        <div className="text-muted">Total Qty</div>
                        <div className="fw-bold">{totalQty}</div>
                      </div>
                      <div className="col-6">
                        <div className="text-muted">Validation</div>
                        <div className={invalidSelected.length > 0 ? "text-danger fw-semibold" : "text-success fw-semibold"}>
                          {invalidSelected.length > 0 ? `${invalidSelected.length} invalid` : "All valid"}
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="text-muted">Expiry Risk</div>
                        <div className={totalExpiryRisk.expired > 0 ? "text-danger fw-semibold" : totalExpiryRisk.nearExpiry > 0 ? "text-warning fw-semibold" : "text-success fw-semibold"}>
                          {totalExpiryRisk.expired > 0 ? "Has expired" : totalExpiryRisk.nearExpiry > 0 ? "Near expiry" : "OK"}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={saveDraft}
                      aria-label="Save draft"
                    >
                      <i className="ri-save-line me-1" aria-hidden />
                      Save draft
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={clearDraft}
                      aria-label="Clear all"
                    >
                      <i className="ri-delete-bin-line me-1" aria-hidden />
                      Clear all
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm ms-auto"
                      disabled={!canSubmit || submitting}
                      onClick={handleSubmit}
                      aria-label="Submit stock request"
                    >
                      <i className="ri-send-plane-line me-1" aria-hidden />
                      {submitting ? "Creating…" : "Submit Request"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
