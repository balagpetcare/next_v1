"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/src/lib/apiFetch";
import type { ProductsFilters, ProductSort } from "./products.types";
import styles from "./ProductsToolbar.module.css";

type CategoryNode = {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  children?: CategoryNode[];
};
type Brand = { id: number; name: string };

type Props = {
  filters: ProductsFilters;
  onFiltersChange: (f: ProductsFilters) => void;
  selectedIds: Set<number>;
  onBulkSubmitForApproval: () => void;
  onBulkPublish: () => void;
  onExportCsv: () => void;
  loading?: boolean;
  total?: number;
  onQuickAdd?: () => void;
};

const APPROVAL_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_APPROVAL", label: "Submitted" },
  { value: "APPROVED", label: "Approved" },
  { value: "PUBLISHED", label: "Published" },
];

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "updated_desc", label: "Updated (newest)" },
  { value: "updated_asc", label: "Updated (oldest)" },
  { value: "name_asc", label: "Name (A–Z)" },
  { value: "name_desc", label: "Name (Z–A)" },
];

function flattenCategories(nodes: CategoryNode[]): { id: number; name: string }[] {
  const out: { id: number; name: string }[] = [];

  function walk(list: CategoryNode[], prefix = "") {
    if (!Array.isArray(list)) return;
    for (const n of list) {
      out.push({ id: n.id, name: prefix ? `${prefix} › ${n.name}` : n.name });
      if (n.children?.length) walk(n.children, prefix ? `${prefix} › ${n.name}` : n.name);
    }
  }

  walk(nodes);
  return out;
}

export default function ProductsToolbar({
  filters,
  onFiltersChange,
  selectedIds,
  onBulkSubmitForApproval,
  onBulkPublish,
  onExportCsv,
  loading,
  total = 0,
  onQuickAdd,
}: Props) {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [metaLoaded, setMetaLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [catRes, brandRes] = await Promise.all([
          apiFetch("/api/v1/meta/categories").catch(() => null),
          apiFetch("/api/v1/meta/brands").catch(() => null),
        ]);

        if (cancelled) return;

        let catData: CategoryNode[] = [];
        if (catRes && Array.isArray((catRes as any)?.data)) catData = (catRes as any).data;
        else if (Array.isArray(catRes)) catData = catRes;

        let brandData: Brand[] = [];
        if (brandRes && Array.isArray((brandRes as any)?.data)) brandData = (brandRes as any).data;
        else if (Array.isArray(brandRes)) brandData = brandRes;

        setCategories(catData);
        setBrands(brandData);
      } finally {
        if (!cancelled) setMetaLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const categoryOptions = useMemo(() => flattenCategories(categories), [categories]);
  const hasSelection = selectedIds.size > 0;

  const update = (partial: Partial<ProductsFilters>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  return (
    <div className={styles.toolbar}>
      {/* =========================
          Main row: Filters (left) + Actions (right)
         ========================= */}

         {/* RIGHT: Action buttons */}
         <div className={styles.actionsSection}>
          {onQuickAdd && (
            <button
              type="button"
              className={`btn btn-outline-primary btn-sm radius-12 ${styles.actionBtn}`}
              onClick={onQuickAdd}
            >
              Quick Add
            </button>
          )}

          <Link href="/owner/products/master-catalog" className={`btn btn-success btn-sm radius-12 ${styles.actionBtn}`}>
            <i className="ri-book-open-line me-1" aria-hidden />
            Browse Catalog
          </Link>

          <Link href="/owner/products/new" className={`btn btn-primary btn-sm radius-12 ${styles.actionBtn}`}>
            <i className="ri-add-line me-1" aria-hidden />
            New Product
          </Link>
        </div>

      <div className={styles.mainRow}>
        {/* LEFT: Filters box (NO SCROLL; wraps naturally) */}
        <div className={styles.filtersSection}>
          <div className={styles.filtersCol}>
            {/* Search */}
            <div className={`input-group ${styles.searchWrap}`}>
              <span className={`input-group-text bg-white border-end-0 radius-12 radius-end-0 ${styles.control}`}>
                <i className="ri-search-line text-muted" aria-hidden />
              </span>
              <input
                type="search"
                className={`form-control border-start-0 radius-12 radius-start-0 ${styles.control}`}
                placeholder="Search name, SKU, barcode..."
                value={filters.search}
                onChange={(e) => update({ search: e.target.value })}
                aria-label="Search products"
              />
            </div>

            {/* Status */}
            <select
              className={`form-select radius-12 ${styles.filter} ${styles.control}`}
              value={filters.status}
              onChange={(e) => update({ status: e.target.value })}
              aria-label="Filter by status"
            >
              <option value="">All (status)</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            {/* Approval */}
            <select
              className={`form-select radius-12 ${styles.filter} ${styles.control}`}
              value={filters.approvalStatus}
              onChange={(e) => update({ approvalStatus: e.target.value })}
              aria-label="Filter by approval"
            >
              {APPROVAL_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            {/* Category */}
            {metaLoaded && (
              <select
                className={`form-select radius-12 ${styles.filter} ${styles.control}`}
                value={filters.categoryId}
                onChange={(e) => update({ categoryId: e.target.value })}
                aria-label="Filter by category"
              >
                <option value="">All categories</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            {/* Brand */}
            {metaLoaded && (
              <select
                className={`form-select radius-12 ${styles.filter} ${styles.control}`}
                value={filters.brandId}
                onChange={(e) => update({ brandId: e.target.value })}
                aria-label="Filter by brand"
              >
                <option value="">All brands</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}

            {/* Sort */}
            <select
              className={`form-select radius-12 ${styles.filter} ${styles.control} ${styles.sortSelect}`}
              value={filters.sort}
              onChange={(e) => update({ sort: e.target.value as ProductSort })}
              aria-label="Sort by"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            {/* Count */}
            {!hasSelection && total >= 0 && (
              <span className={`small text-muted ${styles.productCount}`}>
                {total} product{total !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

       
      </div>

      {/* =========================
          Bulk actions (only when selected)
         ========================= */}
      {hasSelection && (
        <div className={styles.bulkRow}>
          <span className="small text-muted">{selectedIds.size} selected</span>

          <div className="d-flex gap-2 flex-wrap align-items-center">
            <button
              type="button"
              className="btn btn-outline-success btn-sm radius-12"
              onClick={onBulkSubmitForApproval}
              disabled={loading}
            >
              Submit for approval
            </button>

            <button
              type="button"
              className="btn btn-outline-primary btn-sm radius-12"
              onClick={onBulkPublish}
              disabled={loading}
            >
              Publish
            </button>

            <button type="button" className="btn btn-outline-secondary btn-sm radius-12" onClick={onExportCsv}>
              Export CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
