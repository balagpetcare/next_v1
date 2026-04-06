"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import type { VariantOption } from "../../receipts/bulk/types";

type CatNode = { id: number; name: string; children?: CatNode[] };

function flattenCategories(nodes: CatNode[], prefix = ""): { id: number; label: string }[] {
  const out: { id: number; label: string }[] = [];
  for (const n of nodes) {
    const label = prefix ? `${prefix} › ${n.name}` : n.name;
    out.push({ id: n.id, label });
    if (n.children?.length) {
      out.push(...flattenCategories(n.children, label));
    }
  }
  return out;
}

type ExtendedVariant = VariantOption & {
  brand?: { id: number; name: string } | null;
  category?: { id: number; name: string } | null;
  packSize?: number | null;
  packUnit?: string | null;
  isActive?: boolean;
};

export type POProductPickerProps = {
  orgId: number | null;
  selectedVariantIds: Set<number>;
  onAddVariant: (v: VariantOption) => void;
  disabled?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

export function POProductPicker({
  orgId,
  selectedVariantIds,
  onAddVariant,
  disabled,
  collapsed,
  onToggleCollapse,
}: POProductPickerProps) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [brandId, setBrandId] = useState<string>("");
  const [variantActive, setVariantActive] = useState<"active" | "all">("active");
  const [variants, setVariants] = useState<ExtendedVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<{ id: number; label: string }[]>([]);
  const [brandOptions, setBrandOptions] = useState<{ id: number; name: string }[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [catRes, brandRes] = await Promise.all([
          ownerGet<{ data?: CatNode[] }>("/api/v1/meta/categories"),
          ownerGet<{ data?: { id: number; name: string }[] }>("/api/v1/meta/brands"),
        ]);
        if (cancelled) return;
        const tree = Array.isArray(catRes?.data) ? catRes.data : [];
        setCategoryOptions(flattenCategories(tree));
        const brands = Array.isArray(brandRes?.data) ? brandRes.data : [];
        setBrandOptions(brands.map((b) => ({ id: b.id, name: b.name })));
      } catch {
        if (!cancelled) {
          setCategoryOptions([]);
          setBrandOptions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const canSearch =
    search.trim().length >= 2 || Boolean(categoryId) || Boolean(brandId) || variantActive === "all";

  const fetchVariants = useCallback(async () => {
    if (!canSearch || orgId == null) {
      setVariants([]);
      return;
    }
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search.trim().length >= 2) q.set("q", search.trim());
      q.set("limit", "60");
      q.set("orgId", String(orgId));
      if (categoryId) q.set("categoryId", categoryId);
      if (brandId) q.set("brandId", brandId);
      if (variantActive === "all") q.set("variantActive", "all");

      const res = await ownerGet<{ data?: ExtendedVariant[] }>(
        `/api/v1/inventory/variants/search?${q.toString()}`
      );
      setVariants(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setVariants([]);
    } finally {
      setLoading(false);
    }
  }, [canSearch, search, orgId, categoryId, brandId, variantActive]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchVariants();
      debounceRef.current = null;
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchVariants]);

  const handleAdd = useCallback(
    (v: ExtendedVariant) => {
      if (selectedVariantIds.has(v.id)) return;
      onAddVariant(v);
    },
    [selectedVariantIds, onAddVariant]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, v: ExtendedVariant) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleAdd(v);
      }
    },
    [handleAdd]
  );

  const clearFilters = () => {
    setSearch("");
    setCategoryId("");
    setBrandId("");
    setVariantActive("active");
    searchInputRef.current?.focus();
  };

  const hasFilters = search.trim() || categoryId || brandId || variantActive === "all";

  if (collapsed) {
    return (
      <div className="border-bottom py-3 px-3 d-flex justify-content-between align-items-center bg-light">
        <div className="d-flex align-items-center gap-2">
          <span className="fw-medium">Product Browser</span>
          <span className="badge bg-secondary">{selectedVariantIds.size} selected</span>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={onToggleCollapse}
        >
          Expand
        </button>
      </div>
    );
  }

  return (
    <div className="border-bottom">
      <div className="py-3 px-3 bg-light border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <span className="fw-medium">Browse Catalog</span>
          {selectedVariantIds.size > 0 && (
            <span className="badge bg-primary">{selectedVariantIds.size} in PO</span>
          )}
        </div>
        {onToggleCollapse && (
          <button
            type="button"
            className="btn btn-sm btn-link text-muted p-0"
            onClick={onToggleCollapse}
          >
            Collapse
          </button>
        )}
      </div>

      <div className="p-3">
        <div className="row g-2 mb-3">
          <div className="col-12 col-md-4 col-lg-5">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-white">
                <i className="ri-search-line" aria-hidden />
              </span>
              <input
                ref={searchInputRef}
                type="text"
                className="form-control"
                placeholder="Search SKU, name, barcode…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={disabled}
                autoComplete="off"
              />
              {search && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setSearch("")}
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </div>
          <div className="col-6 col-md-2">
            <select
              className="form-select form-select-sm"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={disabled}
              title="Filter by category"
            >
              <option value="">All categories</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-2">
            <select
              className="form-select form-select-sm"
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              disabled={disabled}
              title="Filter by brand"
            >
              <option value="">All brands</option>
              {brandOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-2">
            <select
              className="form-select form-select-sm"
              value={variantActive}
              onChange={(e) => setVariantActive(e.target.value === "all" ? "all" : "active")}
              disabled={disabled}
              title="Variant status"
            >
              <option value="active">Active only</option>
              <option value="all">All variants</option>
            </select>
          </div>
          {hasFilters && (
            <div className="col-6 col-md-1 d-flex align-items-center">
              <button
                type="button"
                className="btn btn-link btn-sm text-muted p-0"
                onClick={clearFilters}
              >
                Clear
              </button>
            </div>
          )}
        </div>

        <div
          className="border rounded"
          style={{ maxHeight: 360, overflowY: "auto" }}
        >
          {loading && (
            <div className="p-4 text-center">
              <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
              <span className="text-muted">Searching products…</span>
            </div>
          )}

          {!loading && !canSearch && (
            <div className="p-4 text-center text-muted">
              <div className="mb-2">
                <i className="ri-archive-line fs-1 opacity-50" aria-hidden />
              </div>
              <p className="mb-1">Start searching to browse products</p>
              <p className="small mb-0">
                Type 2+ characters, or select a category or brand filter
              </p>
            </div>
          )}

          {!loading && canSearch && variants.length === 0 && (
            <div className="p-4 text-center text-muted">
              <div className="mb-2">
                <i className="ri-search-line fs-1 opacity-50" aria-hidden />
              </div>
              <p className="mb-1">No products found</p>
              <p className="small mb-0">
                Try adjusting your search or filters
              </p>
            </div>
          )}

          {!loading && variants.length > 0 && (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light position-sticky top-0" style={{ zIndex: 1 }}>
                  <tr>
                    <th style={{ minWidth: 280 }}>Product / Variant</th>
                    <th style={{ minWidth: 120 }}>SKU</th>
                    <th style={{ minWidth: 100 }}>Brand</th>
                    <th style={{ minWidth: 100 }}>Category</th>
                    <th style={{ minWidth: 80 }} className="text-center">Status</th>
                    <th style={{ width: 100 }} className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v) => {
                    const isAdded = selectedVariantIds.has(v.id);
                    const productName = v.product?.name ?? "Unknown Product";
                    const brandName = (v as ExtendedVariant).brand?.name ?? "—";
                    const categoryName = (v as ExtendedVariant).category?.name ?? "—";
                    const isActive = (v as ExtendedVariant).isActive !== false;

                    return (
                      <tr
                        key={v.id}
                        className={isAdded ? "table-success" : undefined}
                        tabIndex={0}
                        onKeyDown={(e) => handleKeyDown(e, v)}
                        style={{ cursor: isAdded ? "default" : "pointer" }}
                        onClick={() => !isAdded && handleAdd(v)}
                      >
                        <td>
                          <div className="fw-semibold text-dark">{productName}</div>
                          <div className="small text-muted">{v.title}</div>
                          {v.barcode && (
                            <div className="small text-muted">
                              <i className="ri-barcode-line me-1" aria-hidden />
                              {v.barcode}
                            </div>
                          )}
                          {(v.requiresLot || v.requiresExpiry) && (
                            <span className="badge bg-info text-dark small">Lot/Expiry tracked</span>
                          )}
                        </td>
                        <td>
                          <code className="text-primary">{v.sku}</code>
                        </td>
                        <td className="small text-muted">{brandName}</td>
                        <td className="small text-muted">{categoryName}</td>
                        <td className="text-center">
                          <span
                            className={`badge ${isActive ? "bg-success-subtle text-success" : "bg-secondary-subtle text-secondary"}`}
                          >
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="text-end">
                          {isAdded ? (
                            <span className="badge bg-success">
                              <i className="ri-check-line me-1" aria-hidden />
                              Added
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAdd(v);
                              }}
                              disabled={disabled}
                            >
                              + Add
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && variants.length > 0 && (
          <div className="d-flex justify-content-between align-items-center mt-2 small text-muted">
            <span>Showing {variants.length} result(s)</span>
            <span>Click a row or press Enter to add to PO</span>
          </div>
        )}
      </div>
    </div>
  );
}
