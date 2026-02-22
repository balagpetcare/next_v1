"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import type { VariantOption } from "./types";

type GroupedProduct = {
  productId: number;
  productName: string;
  variants: VariantOption[];
  expanded: boolean;
};

type ProductBrowserPanelProps = {
  selectedVariantIds: Set<number>;
  onAddVariant: (v: VariantOption) => void;
  onRemoveVariant: (variantId: number) => void;
  /** On mobile, panel is in drawer; hide when variant added for UX */
  onCloseDrawer?: () => void;
  disabled?: boolean;
};

/**
 * Left panel: Product Browser
 * - Debounced search
 * - Filters (placeholders)
 * - Grouped list by product; expand to show variants with checkboxes
 * - Select all visible / Clear selection
 */
export function ProductBrowserPanel({
  selectedVariantIds,
  onAddVariant,
  onRemoveVariant,
  onCloseDrawer,
  disabled,
}: ProductBrowserPanelProps) {
  const [search, setSearch] = useState("");
  const [variants, setVariants] = useState<VariantOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchVariants = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) {
      setVariants([]);
      return;
    }
    setLoading(true);
    try {
      const res = await ownerGet<{ data?: VariantOption[] }>(
        `/api/v1/inventory/variants/search?q=${encodeURIComponent(q)}&limit=50`
      );
      setVariants(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setVariants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchVariants(search);
      debounceRef.current = null;
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, fetchVariants]);

  // Group by product
  const groups: GroupedProduct[] = (() => {
    const byProduct = new Map<number, GroupedProduct>();
    for (const v of variants) {
      const pid = v.productId;
      const pname = v.product?.name ?? v.title ?? "Unknown";
      if (!byProduct.has(pid)) {
        byProduct.set(pid, {
          productId: pid,
          productName: pname,
          variants: [],
          expanded: expandedProducts.has(pid),
        });
      }
      byProduct.get(pid)!.variants.push(v);
    }
    return Array.from(byProduct.values());
  })();

  const toggleProduct = (productId: number) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleVariant = (v: VariantOption) => {
    if (selectedVariantIds.has(v.id)) {
      onRemoveVariant(v.id);
    } else {
      onAddVariant(v);
      onCloseDrawer?.();
    }
  };

  const allVisibleVariantIds = groups.flatMap((g) => g.variants.map((v) => v.id));
  const allVisibleSelected = allVisibleVariantIds.length > 0 && allVisibleVariantIds.every((id) => selectedVariantIds.has(id));

  const selectAllVisible = () => {
    for (const g of groups) {
      for (const v of g.variants) {
        if (!selectedVariantIds.has(v.id)) onAddVariant(v);
      }
    }
  };

  const clearSelection = () => {
    for (const id of selectedVariantIds) {
      if (allVisibleVariantIds.includes(id)) onRemoveVariant(id);
    }
  };

  const expandAll = () => setExpandedProducts(new Set(groups.map((g) => g.productId)));

  return (
    <div className="d-flex flex-column h-100" style={{ minHeight: 280 }}>
      <div className="mb-2">
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="Search SKU, name, barcode..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={disabled}
        />
      </div>

      {/* Filter placeholders (no backend wiring) */}
      <div className="d-flex flex-wrap gap-1 mb-2 small">
        <select className="form-select form-select-sm" style={{ width: "auto", minWidth: 90 }} disabled title="Category (placeholder)">
          <option>Category</option>
        </select>
        <select className="form-select form-select-sm" style={{ width: "auto", minWidth: 80 }} disabled title="Brand (placeholder)">
          <option>Brand</option>
        </select>
        <select className="form-select form-select-sm" style={{ width: "auto", minWidth: 80 }} disabled title="Status (placeholder)">
          <option>Active</option>
        </select>
      </div>

      <div className="d-flex gap-1 mb-2 flex-wrap">
        <button
          type="button"
          className="btn btn-outline-primary btn-sm"
          onClick={selectAllVisible}
          disabled={disabled || variants.length === 0}
        >
          Select all visible
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={clearSelection}
          disabled={disabled || selectedVariantIds.size === 0}
        >
          Clear selection
        </button>
        {groups.length > 1 && (
          <button type="button" className="btn btn-link btn-sm p-0" onClick={expandAll} disabled={disabled}>
            Expand all
          </button>
        )}
      </div>

      <div className="flex-grow-1 overflow-auto border rounded" style={{ maxHeight: 360 }}>
        {loading && <div className="p-2 small text-muted">Searching…</div>}
        {!loading && search.length >= 2 && variants.length === 0 && (
          <div className="p-2 small text-muted">No variants found. Try a different search.</div>
        )}
        {!loading && search.length < 2 && (
          <div className="p-2 small text-muted">Type 2+ characters to search.</div>
        )}
        {!loading && variants.length > 0 && (
          <ul className="list-group list-group-flush">
            {groups.map((g) => (
              <li key={g.productId} className="list-group-item py-1 px-2">
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 text-start d-flex align-items-center w-100"
                  onClick={() => toggleProduct(g.productId)}
                  aria-expanded={expandedProducts.has(g.productId)}
                >
                  <span className="me-1">{expandedProducts.has(g.productId) ? "▼" : "▶"}</span>
                  <span className="small fw-medium">{g.productName}</span>
                  <span className="small text-muted ms-1">({g.variants.length})</span>
                </button>
                {expandedProducts.has(g.productId) && (
                  <ul className="list-unstyled ms-3 mt-1">
                    {g.variants.map((v) => (
                      <li key={v.id} className="py-0">
                        <label className="d-flex align-items-center gap-2 small cursor-pointer" style={{ cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selectedVariantIds.has(v.id)}
                            onChange={() => toggleVariant(v)}
                            disabled={disabled}
                          />
                          <span>
                            {v.sku} — {v.title}
                            {(v.requiresLot || v.requiresExpiry) && (
                              <span className="badge bg-secondary ms-1">Lot/Exp</span>
                            )}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
