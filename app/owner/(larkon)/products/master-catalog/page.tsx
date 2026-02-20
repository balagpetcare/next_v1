"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/src/lib/apiFetch";
import { useMe } from "@/src/lib/useMe";
import { useToast } from "@/src/hooks/useToast";
import { useAlreadyAddedSet } from "./_components/useAlreadyAddedSet";
import { MasterCatalogSkeleton } from "./_components/MasterCatalogSkeleton";
import { BulkAddConfirmModal } from "./_components/BulkAddConfirmModal";
import type { MasterProduct, Brand, Category, StatusFilter } from "./_components/masterCatalog.types";

const SEARCH_DEBOUNCE_MS = 300;
const BULK_CONCURRENCY = 6;

function getOrgIdFromMe(me: any): number | null {
  if (!me) return null;
  const first = Array.isArray(me?.orgMembers)
    ? me.orgMembers.find((x: any) => x?.org?.id)?.org?.id
    : null;
  if (first != null) return Number(first);
  if (typeof window !== "undefined") {
    const saved = window.localStorage.getItem("bpa_org_id");
    if (saved) {
      const n = Number(saved);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debouncedValue;
}

function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];
  let index = 0;
  async function worker(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      try {
        const value = await fn(items[i]);
        results[i] = { status: "fulfilled", value };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  return Promise.all(workers).then(() => results);
}

export default function MasterCatalogPage() {
  const router = useRouter();
  const { me } = useMe("owner-products-master-catalog");
  const orgId = getOrgIdFromMe(me);
  const toast = useToast();

  const { addedSet, hasMoreIfCapped, refetch: refetchAdded } = useAlreadyAddedSet(orgId);

  const [products, setProducts] = useState<MasterProduct[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [cloningId, setCloningId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmAdd, setConfirmAdd] = useState<{ productId: number; productName: string } | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    loadMasterCatalog();
  }, [page, debouncedSearch, selectedBrand, selectedCategory]);

  const loadMasterCatalog = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
        ...(selectedBrand != null && { brandId: selectedBrand.toString() }),
        ...(selectedCategory != null && { categoryId: selectedCategory.toString() }),
      });
      const res = (await apiFetch(
        `/api/v1/products/master-catalog?${params.toString()}`
      )) as {
        success?: boolean;
        data?: MasterProduct[];
        items?: MasterProduct[];
        pagination?: { page: number; totalPages: number; total: number };
      };
      const items = res?.data ?? res?.items ?? [];
      setProducts(items);
      if (res?.pagination) setTotalPages(res.pagination.totalPages);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load master catalog");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, selectedBrand, selectedCategory, toast]);

  const loadFilters = async () => {
    try {
      const [brandRes, catRes] = await Promise.all([
        apiFetch("/api/v1/meta/brands"),
        apiFetch("/api/v1/meta/categories"),
      ]);
      const brandsData = Array.isArray(brandRes) ? brandRes : (brandRes as any)?.data ?? [];
      const categoriesData = Array.isArray(catRes) ? catRes : (catRes as any)?.data ?? [];
      setBrands(brandsData);
      setCategories(categoriesData);
    } catch (e) {
      console.error("Load filters error:", e);
    }
  };

  const filteredByStatus = useMemo(() => {
    if (statusFilter === "all") return products;
    return products.filter((p) => {
      const added = addedSet.has(p.id);
      if (statusFilter === "added") return added;
      return !added;
    });
  }, [products, statusFilter, addedSet]);

  const addableIdsOnPage = useMemo(
    () => new Set(filteredByStatus.filter((p) => !addedSet.has(p.id)).map((p) => p.id)),
    [filteredByStatus, addedSet]
  );

  const toggleSelect = useCallback((id: number) => {
    if (addedSet.has(id)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, [addedSet]);

  const selectAllOnPage = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      addableIdsOnPage.forEach((id) => next.add(id));
      return next;
    });
  }, [addableIdsOnPage]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const openAddConfirm = (productId: number, productName: string) => {
    setConfirmAdd({ productId, productName });
  };

  const closeAddConfirm = () => {
    if (!cloningId) setConfirmAdd(null);
  };

  const handleCloneConfirm = async () => {
    if (!confirmAdd) return;
    const { productId, productName } = confirmAdd;
    try {
      setCloningId(productId);
      const res = await apiFetch(`/api/v1/products/master-catalog/${productId}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orgId != null ? { orgId } : {}),
      }) as { success?: boolean; data?: { id: number }; message?: string };
      setConfirmAdd(null);
      if (res?.success && res?.data?.id) {
        toast.success("Product added successfully! Redirecting to product page…", { duration: 3500 });
        refetchAdded();
        router.push(`/owner/products/${res.data.id}`);
      } else {
        toast.success(res?.message || "Product added. Opening product list…", { duration: 3000 });
        refetchAdded();
        router.push("/owner/products");
      }
    } catch (e: any) {
      const status = (e as { status?: number })?.status;
      const body = (e as { body?: { alreadyAdded?: boolean } })?.body;
      if (status === 409 || body?.alreadyAdded) {
        toast.info("Already added to your catalog");
        refetchAdded();
      } else {
        toast.error(e?.message || "Failed to add product");
      }
      setConfirmAdd(null);
    } finally {
      setCloningId(null);
    }
  };

  const handleBulkAddConfirm = async () => {
    const ids = Array.from(selectedIds).filter((id) => !addedSet.has(id));
    if (ids.length === 0) {
      setBulkConfirm(false);
      return;
    }
    setBulkLoading(true);
    let added = 0;
    let skipped = 0;
    let failed = 0;

    const cloneOne = async (masterId: number): Promise<"added" | "skipped" | "failed"> => {
      try {
        const data = (await apiFetch(`/api/v1/products/master-catalog/${masterId}/clone`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orgId != null ? { orgId } : {}),
        })) as { success?: boolean; alreadyAdded?: boolean };
        if (data?.success) return "added";
        if (data?.alreadyAdded) return "skipped";
        return "failed";
      } catch (e: any) {
        if (e?.status === 409 || e?.data?.alreadyAdded) return "skipped";
        return "failed";
      }
    };

    const results = await runWithConcurrency(ids, BULK_CONCURRENCY, cloneOne);
    results.forEach((r) => {
      if (r.status === "fulfilled") {
        if (r.value === "added") added++;
        else if (r.value === "skipped") skipped++;
        else failed++;
      } else failed++;
    });

    setBulkLoading(false);
    setBulkConfirm(false);
    setSelectedIds(new Set());
    refetchAdded();

    const parts: string[] = [];
    if (added > 0) parts.push(`Added: ${added}`);
    if (skipped > 0) parts.push(`Skipped (already added): ${skipped}`);
    if (failed > 0) parts.push(`Failed: ${failed}`);
    if (parts.length) toast.success(parts.join(". "), { duration: 5000 });
  };

  const getVariantsCount = (product: MasterProduct) => {
    if (product.variantsJson && Array.isArray(product.variantsJson)) return product.variantsJson.length;
    return 0;
  };

  const resetFilters = () => {
    setSearch("");
    setSelectedBrand(null);
    setSelectedCategory(null);
    setStatusFilter("all");
    setPage(1);
  };

  const selectedCount = selectedIds.size;
  const selectionAddable = Array.from(selectedIds).filter((id) => !addedSet.has(id)).length;

  return (
    <div className="dashboard-main-body">
      {confirmAdd && (
        <div
          className="add-product-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-product-modal-title"
          onClick={closeAddConfirm}
        >
          <div className="add-product-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="add-product-modal-icon">
              <i className="ri-add-circle-line" />
            </div>
            <h5 id="add-product-modal-title" className="add-product-modal-title">
              Add to your organization?
            </h5>
            <p className="add-product-modal-message">
              <strong>{confirmAdd.productName}</strong> will be added to your product list.
            </p>
            <div className="add-product-modal-actions">
              <button
                type="button"
                className="btn btn-outline-secondary radius-12 add-product-modal-btn"
                onClick={closeAddConfirm}
                disabled={!!cloningId}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary radius-12 add-product-modal-btn"
                onClick={handleCloneConfirm}
                disabled={!!cloningId}
              >
                {cloningId === confirmAdd.productId ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                    Adding…
                  </>
                ) : (
                  <>
                    <i className="ri-check-line me-2" />
                    Add product
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkConfirm && (
        <BulkAddConfirmModal
          count={selectionAddable}
          names={filteredByStatus.filter((p) => selectedIds.has(p.id)).map((p) => p.name)}
          onConfirm={handleBulkAddConfirm}
          onCancel={() => !bulkLoading && setBulkConfirm(false)}
          loading={bulkLoading}
        />
      )}

      <div className="row g-3">
        <div className="col-12">
          <div className="card radius-12">
            <div className="card-body">
              {/* Header */}
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                <div>
                  <h5 className="mb-1">Master Catalog</h5>
                  <small className="text-muted">Browse global products and add to your catalog</small>
                </div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <div className="d-flex gap-1">
                    <button
                      className={`btn radius-12 ${viewMode === "grid" ? "btn-primary" : "btn-outline-primary"}`}
                      onClick={() => setViewMode("grid")}
                      title="Grid"
                    >
                      <i className="ri-grid-line" />
                    </button>
                    <button
                      className={`btn radius-12 ${viewMode === "list" ? "btn-primary" : "btn-outline-primary"}`}
                      onClick={() => setViewMode("list")}
                      title="Table"
                    >
                      <i className="ri-list-check" />
                    </button>
                  </div>
                  {selectedCount > 0 && (
                    <span className="badge bg-primary-focus text-primary-main radius-12 px-2 py-2">
                      Selected: {selectedCount}
                    </span>
                  )}
                  <button
                    className="btn btn-primary radius-12"
                    disabled={selectionAddable === 0}
                    onClick={() => selectionAddable > 0 && setBulkConfirm(true)}
                  >
                    Add Selected ({selectionAddable})
                  </button>
                  <Link href="/owner/products" className="btn btn-outline-primary radius-12">
                    ← Back to Products
                  </Link>
                </div>
              </div>

              {/* Sticky filters */}
              <div className="master-catalog-filters row g-3 mb-4">
                <div className="col-md-3">
                  <input
                    type="text"
                    className="form-control radius-12"
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  />
                </div>
                <div className="col-md-2">
                  <select
                    className="form-select radius-12"
                    value={selectedCategory ?? ""}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value ? parseInt(e.target.value) : null);
                      setPage(1);
                    }}
                  >
                    <option value="">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <select
                    className="form-select radius-12"
                    value={selectedBrand ?? ""}
                    onChange={(e) => {
                      setSelectedBrand(e.target.value ? parseInt(e.target.value) : null);
                      setPage(1);
                    }}
                  >
                    <option value="">All Brands</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <select
                    className="form-select radius-12"
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}
                  >
                    <option value="all">All</option>
                    <option value="not_added">Not Added</option>
                    <option value="added">Added</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <button
                    className="btn btn-outline-secondary radius-12 w-100"
                    onClick={resetFilters}
                    title="Clear filters"
                  >
                    <i className="ri-close-line me-1" />
                    Clear
                  </button>
                </div>
              </div>

              {hasMoreIfCapped && (
                <div className="alert alert-info radius-12 mb-3 small" role="alert">
                  You have many products; &quot;Already added&quot; is based on a sample. Some items may still show as addable.
                </div>
              )}

              {/* Select all / Clear */}
              {!loading && filteredByStatus.length > 0 && addableIdsOnPage.size > 0 && (
                <div className="d-flex gap-2 mb-3">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary radius-12"
                    onClick={selectAllOnPage}
                  >
                    Select all on this page
                  </button>
                  {selectedCount > 0 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary radius-12"
                      onClick={clearSelection}
                    >
                      Clear selection
                    </button>
                  )}
                </div>
              )}

              {loading ? (
                <MasterCatalogSkeleton viewMode={viewMode} count={12} />
              ) : filteredByStatus.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <p>No products found. Try adjusting your filters.</p>
                </div>
              ) : viewMode === "grid" ? (
                <>
                  <div className="row g-3">
                    {filteredByStatus.map((product) => {
                      const alreadyAdded = addedSet.has(product.id);
                      const isSelected = selectedIds.has(product.id);
                      return (
                        <div key={product.id} className="col-md-6 col-lg-4">
                          <div className="card radius-12 h-100">
                            <div className="card-body position-relative">
                              <div className="position-absolute top-0 start-0 m-2">
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={isSelected}
                                  disabled={alreadyAdded}
                                  onChange={() => toggleSelect(product.id)}
                                  title={alreadyAdded ? "Already added" : "Select"}
                                />
                              </div>
                              <div className="d-flex align-items-start justify-content-between mb-2">
                                <div className="flex-grow-1">
                                  <h6 className="mb-1 fw-semibold">{product.name}</h6>
                                  {product.barcode && (
                                    <small className="text-muted d-block">SKU: {product.barcode}</small>
                                  )}
                                  {product.brand && (
                                    <small className="text-muted d-block"><i className="ri-store-line me-1" />{product.brand.name}</small>
                                  )}
                                  {product.category && (
                                    <small className="text-muted d-block"><i className="ri-folder-line me-1" />{product.category.name}</small>
                                  )}
                                </div>
                                <div className="d-flex flex-column gap-1 align-items-end">
                                  {product.isVerified && (
                                    <span className="badge bg-success-focus text-success-main radius-12"><i className="ri-check-line me-1" />Verified</span>
                                  )}
                                  {alreadyAdded && (
                                    <span className="badge bg-secondary radius-12" title="Already in your catalog">Already Added</span>
                                  )}
                                </div>
                              </div>
                              {product.description && (
                                <p className="text-muted small mb-2" style={{ fontSize: "0.85rem" }}>
                                  {product.description.length > 100 ? `${product.description.substring(0, 100)}...` : product.description}
                                </p>
                              )}
                              <div className="d-flex align-items-center justify-content-between mb-3">
                                <div>
                                  {getVariantsCount(product) > 0 && (
                                    <span className="badge bg-info-focus text-info-main radius-12 me-2">
                                      {getVariantsCount(product)} variant{getVariantsCount(product) > 1 ? "s" : ""}
                                    </span>
                                  )}
                                  {product.suggestedPrice != null && (
                                    <span className="text-primary fw-semibold">
                                      {product.currency || "BDT"} {product.suggestedPrice.toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                className="btn btn-primary radius-12 w-100"
                                onClick={() => openAddConfirm(product.id, product.name)}
                                disabled={alreadyAdded || cloningId === product.id}
                                title={alreadyAdded ? "Already in your catalog" : undefined}
                              >
                                {cloningId === product.id ? (
                                  <><span className="spinner-border spinner-border-sm me-2" role="status" />Adding...</>
                                ) : alreadyAdded ? (
                                  "Already Added"
                                ) : (
                                  <><i className="ri-add-line me-2" />Add to My Products</>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: 44 }}><input type="checkbox" className="form-check-input" disabled title="Select all" onChange={(e) => e.target.checked && selectAllOnPage()} /></th>
                        <th>Product</th>
                        <th>Brand</th>
                        <th>Category</th>
                        <th>Variants</th>
                        <th>Price</th>
                        <th>Status</th>
                        <th style={{ width: 100 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredByStatus.map((product) => {
                        const alreadyAdded = addedSet.has(product.id);
                        const isSelected = selectedIds.has(product.id);
                        return (
                          <tr key={product.id}>
                            <td>
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={isSelected}
                                disabled={alreadyAdded}
                                onChange={() => toggleSelect(product.id)}
                              />
                            </td>
                            <td>
                              <div className="fw-semibold">{product.name}</div>
                              {product.barcode && <small className="text-muted">SKU: {product.barcode}</small>}
                              {product.description && <small className="text-muted d-block">{product.description.slice(0, 60)}…</small>}
                            </td>
                            <td>{product.brand?.name ?? "-"}</td>
                            <td>{product.category?.name ?? "-"}</td>
                            <td><span className="badge bg-info-focus text-info-main radius-12">{getVariantsCount(product)}</span></td>
                            <td>
                              {product.suggestedPrice != null ? (
                                <span className="text-primary fw-semibold">{product.currency || "BDT"} {product.suggestedPrice.toLocaleString()}</span>
                              ) : "-"}
                            </td>
                            <td>
                              {alreadyAdded ? <span className="badge bg-secondary radius-12">Already Added</span> : <span className="text-muted">—</span>}
                            </td>
                            <td>
                              <button
                                className="btn btn-sm btn-primary radius-12"
                                onClick={() => openAddConfirm(product.id, product.name)}
                                disabled={alreadyAdded || cloningId === product.id}
                                title={alreadyAdded ? "Already in your catalog" : undefined}
                              >
                                {cloningId === product.id ? <span className="spinner-border spinner-border-sm" role="status" /> : alreadyAdded ? "Added" : <><i className="ri-add-line me-1" />Add</>}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination: shared by both grid and table, outside overflow container */}
              {!loading && filteredByStatus.length > 0 && totalPages > 1 && (
                <div className="d-flex justify-content-center mt-4">
                  <nav>
                    <ul className="pagination mb-0">
                      <li className={`page-item ${page === 1 ? "disabled" : ""}`}>
                        <button className="page-link radius-12" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</button>
                      </li>
                      {(() => {
                        const delta = 2;
                        const low = Math.max(1, page - delta);
                        const high = Math.min(totalPages, page + delta);
                        return Array.from({ length: high - low + 1 }, (_, i) => low + i).map((p) => (
                          <li key={p} className={`page-item ${p === page ? "active" : ""}`}>
                            <button className="page-link radius-12" onClick={() => setPage(p)}>{p}</button>
                          </li>
                        ));
                      })()}
                      <li className={`page-item ${page === totalPages ? "disabled" : ""}`}>
                        <button className="page-link radius-12" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
