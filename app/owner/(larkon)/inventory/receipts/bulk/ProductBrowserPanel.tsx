"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import type { VariantOption } from "./types";

type GroupedProduct = {
  productId: number;
  productName: string;
  variants: VariantOption[];
};

type CatNode = { id: number; name: string; children?: CatNode[] };

/** Flatten category tree for a single &lt;select&gt; */
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

type ProductBrowserPanelProps = {
  selectedVariantIds: Set<number>;
  onAddVariant: (v: VariantOption) => void;
  onRemoveVariant: (variantId: number) => void;
  /** On mobile, panel is in drawer; hide when variant added for UX */
  onCloseDrawer?: () => void;
  disabled?: boolean;
  /** When set, passed to inventory search for org-scoped multi-tenant filtering */
  orgId?: number | null;
};

/**
 * Left panel: Product Browser
 * - Debounced search + optional category / brand / variant-active filters (wired to GET /inventory/variants/search)
 * - Grouped list by product; expand to show variants with checkboxes
 * - New search results auto-expand all product groups so checkboxes are visible without extra clicks
 */
export function ProductBrowserPanel({
  selectedVariantIds,
  onAddVariant,
  onRemoveVariant,
  onCloseDrawer,
  disabled,
  orgId,
}: ProductBrowserPanelProps) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [brandId, setBrandId] = useState<string>("");
  /** "active" = only isActive variants; "all" = include inactive */
  const [variantActive, setVariantActive] = useState<"active" | "all">("active");
  const [variants, setVariants] = useState<VariantOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());
  const [categoryOptions, setCategoryOptions] = useState<{ id: number; label: string }[]>([]);
  const [brandOptions, setBrandOptions] = useState<{ id: number; name: string }[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (!canSearch) {
      setVariants([]);
      return;
    }
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search.trim().length >= 2) q.set("q", search.trim());
      q.set("limit", "50");
      if (orgId != null && orgId > 0) q.set("orgId", String(orgId));
      if (categoryId) q.set("categoryId", categoryId);
      if (brandId) q.set("brandId", brandId);
      if (variantActive === "all") q.set("variantActive", "all");

      const res = await ownerGet<{ data?: VariantOption[] }>(
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

  /** When result set changes, expand all product groups so variant checkboxes are visible (avoids "empty" UI when collapsed). */
  useEffect(() => {
    if (variants.length === 0) return;
    const ids = new Set<number>();
    for (const v of variants) {
      ids.add(v.productId);
    }
    setExpandedProducts(ids);
  }, [variants]);

  // Group by product
  const groups: GroupedProduct[] = useMemo(() => {
    const byProduct = new Map<number, GroupedProduct>();
    for (const v of variants) {
      const pid = v.productId;
      const pname = v.product?.name ?? v.title ?? "Unknown";
      if (!byProduct.has(pid)) {
        byProduct.set(pid, {
          productId: pid,
          productName: pname,
          variants: [],
        });
      }
      byProduct.get(pid)!.variants.push(v);
    }
    return Array.from(byProduct.values());
  }, [variants]);

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
          placeholder="Search SKU, name, barcode…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="d-flex flex-wrap gap-1 mb-2 small">
        <select
          className="form-select form-select-sm"
          style={{ width: "auto", minWidth: 110, maxWidth: "100%" }}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          disabled={disabled}
          title="Filter by product category"
        >
          <option value="">All categories</option>
          {categoryOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          className="form-select form-select-sm"
          style={{ width: "auto", minWidth: 100, maxWidth: "100%" }}
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
        <select
          className="form-select form-select-sm"
          style={{ width: "auto", minWidth: 92 }}
          value={variantActive}
          onChange={(e) => setVariantActive(e.target.value === "all" ? "all" : "active")}
          disabled={disabled}
          title="Active variants only, or include inactive SKUs"
        >
          <option value="active">Active only</option>
          <option value="all">All variants</option>
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
        {!loading && !canSearch && (
          <div className="p-2 small text-muted">
            Type 2+ characters, or choose a category / brand, or set variants to &quot;All variants&quot; to search.
          </div>
        )}
        {!loading && canSearch && variants.length === 0 && (
          <div className="p-2 small text-muted">No variants match. Adjust search or filters.</div>
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
