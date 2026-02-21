"use client";

/**
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
import { staffStockRequestProducts, staffStockRequestCreate } from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { Pagination } from "@/src/components/common/Pagination";
import { useToast } from "@/src/hooks/useToast";

const REQUIRED_PERM = "inventory.update";
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

/** Selected item: productId, variantId, productName, variantLabel, sku, requestedQty, note, stockOnHand (for display) */
function selectedKey(productId, variantId) {
  return `${productId}-${variantId}`;
}

export default function StaffBranchStockRequestNewPage() {
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
  const permissions = myAccess?.permissions ?? [];
  const canCreate = permissions.includes(REQUIRED_PERM) || permissions.includes("inventory.transfer");

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
      })
      .finally(() => setLoading(false));
  }, [branchId, canCreate, debouncedSearch, pagination.page, pagination.limit, sort, stockStatus]);

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
        items: payload,
      });
      if (res?.data?.id) {
        clearDraft();
        toast.success("Stock request created");
        router.push(`/staff/branch/${branchId}/inventory/stock-requests/${res.data.id}`);
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

  const displayItems = useMemo(() => {
    if (!onlyShowSelected) return items;
    const selectedKeysSet = new Set(Object.keys(selected));
    return items.filter((p) =>
      (p.variants || []).some((v) => selectedKeysSet.has(selectedKey(p.id, v.id)))
    );
  }, [items, onlyShowSelected, selected]);

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

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" aria-label="Loading" />
        <p className="mt-16 text-secondary">Loading...</p>
      </div>
    );
  }
  if (errorCode === "forbidden" || !hasViewPermission || !canCreate) {
    return (
      <AccessDenied
        missingPerm={REQUIRED_PERM}
        onBack={() => router.push(`/staff/branch/${branchId}/inventory/stock-requests`)}
      />
    );
  }

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
        <Link
          href={`/staff/branch/${branchId}/inventory/stock-requests`}
          className="btn btn-outline-secondary btn-sm radius-12"
          aria-label="Back to stock requests"
        >
          ← Back
        </Link>
        <h5 className="mb-0">New Stock Request</h5>
      </div>

      {draftRestored && selectedList.length > 0 && (
        <div className="alert alert-info d-flex align-items-center justify-content-between mb-3" role="status">
          <span>Draft restored ({selectedList.length} item(s)). Edit and submit or clear.</span>
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={clearDraft}>
            Clear draft
          </button>
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
                        <th>Stock</th>
                        <th className="text-end">Usage (30d)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center text-secondary py-4">
                            No products match. Try a different search or filters.
                          </td>
                        </tr>
                      ) : (
                        displayItems.map((p) => {
                          const v = getChosenVariant(p);
                          if (!v) return null;
                          const k = selectedKey(p.id, v.id);
                          const isSelected = !!selected[k];
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
                                  title={`Stock: ${v.stockOnHand}`}
                                >
                                  {stockLabel(v.stockOnHand, v.lowStockThreshold)} · {v.stockOnHand}
                                </span>
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
              <div className="d-flex justify-content-between align-items-center mt-2 flex-wrap gap-2">
                <span className="small text-secondary">
                  {pagination.total} product(s) · page {pagination.page} of {pagination.totalPages}
                </span>
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
                  ariaLabel="Product list pages"
                />
              </div>
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
                  <div className="overflow-auto mb-3" style={{ maxHeight: "320px" }}>
                    <ul className="list-group list-group-flush">
                      {selectedList.map(({ key, productName, variantLabel, sku, requestedQty, note, stockOnHand, variantId }) => {
                        const q = Number(requestedQty);
                        const invalid = !Number.isInteger(q) || q < 1;
                        return (
                          <li
                            key={key}
                            className={`list-group-item d-flex flex-column gap-2 ${invalid ? "list-group-item-danger" : ""}`}
                          >
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <span className="fw-bold">{productName}</span>
                                <br />
                                <small className="text-muted">{variantLabel} · {sku}</small>
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
                  <div className="border-top pt-2 mb-2">
                    <p className="small mb-0">
                      <strong>{selectedList.length}</strong> item(s) · Total qty: <strong>{totalQty}</strong>
                    </p>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={saveDraft}
                      aria-label="Save draft"
                    >
                      Save draft
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={clearDraft}
                      aria-label="Clear all"
                    >
                      Clear all
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm ms-auto"
                      disabled={!canSubmit || submitting}
                      onClick={handleSubmit}
                      aria-label="Submit stock request"
                    >
                      {submitting ? "Creating…" : "Submit"}
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
