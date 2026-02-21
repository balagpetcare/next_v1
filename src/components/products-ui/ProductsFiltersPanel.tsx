"use client";

import { useState } from "react";
import type { ProductsFiltersState } from "./types";
import type { ViewMode } from "./productsViewState";
import styles from "./ProductsFiltersPanel.module.css";

type Category = { id: number; name: string };
type Brand = { id: number; name: string };

type Props = {
  filters: ProductsFiltersState;
  onFiltersChange: (f: Partial<ProductsFiltersState>) => void;
  categories?: Category[];
  brands?: Brand[];
  onReset?: () => void;
  savedViews?: { id: string; name: string }[];
  onLoadView?: (id: string) => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: () => void;
  searchPlaceholder?: string;
  viewMode?: ViewMode;
  setViewMode?: (mode: ViewMode) => void;
  density?: "compact" | "comfortable";
  setDensity?: (d: "compact" | "comfortable") => void;
  className?: string;
};

const APPROVAL_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_APPROVAL", label: "Submitted" },
  { value: "APPROVED", label: "Approved" },
  { value: "PUBLISHED", label: "Published" },
];

const SORT_OPTIONS: { value: ProductsFiltersState["sort"]; label: string }[] = [
  { value: "updated_desc", label: "Updated (newest)" },
  { value: "updated_asc", label: "Updated (oldest)" },
  { value: "name_asc", label: "Name (A–Z)" },
  { value: "name_desc", label: "Name (Z–A)" },
];

export function ProductsFiltersPanel(props: Props) {
  const {
    filters,
    onFiltersChange,
    categories = [],
    brands = [],
    onReset,
    savedViews = [],
    onLoadView,
    search = "",
    onSearchChange,
    onSearchSubmit,
    searchPlaceholder = "Search name, SKU…",
    viewMode,
    setViewMode,
    density = "comfortable",
    setDensity,
    className = "",
  } = props;

  const [collapsed, setCollapsed] = useState(false);

  const update = (partial: Partial<ProductsFiltersState>) => {
    onFiltersChange(partial);
  };

  const clearFilter = (key: keyof ProductsFiltersState) => {
    update({ [key]: key === "sort" ? "updated_desc" : "" });
  };

  const categoryName = categories.find((c) => String(c.id) === filters.categoryId)?.name;
  const brandName = brands.find((b) => String(b.id) === filters.brandId)?.name;
  const approvalLabel = APPROVAL_OPTIONS.find((o) => o.value === filters.approvalStatus)?.label;

  const chips: { key: keyof ProductsFiltersState; label: string }[] = [];
  if (filters.status) chips.push({ key: "status", label: `Status: ${filters.status}` });
  if (filters.approvalStatus && approvalLabel) chips.push({ key: "approvalStatus", label: `Approval: ${approvalLabel}` });
  if (filters.categoryId && categoryName) chips.push({ key: "categoryId", label: `Category: ${categoryName}` });
  if (filters.brandId && brandName) chips.push({ key: "brandId", label: `Brand: ${brandName}` });

  const hasTopControls = setViewMode && viewMode !== undefined;
  const hasSearch = onSearchChange !== undefined;

  return (
    <div className={`card ${styles.card} ${styles.sticky} ${className}`}>
      <button
        type="button"
        className={styles.header}
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        aria-controls="products-filters-body"
      >
        <span className={styles.headerTitle}>
          <i className="ri-filter-3-line me-2" aria-hidden />
          Filters
          <small className="d-block text-muted fw-normal mt-0">Search & filter above the table</small>
        </span>
        <i className={`ri-arrow-${collapsed ? "down" : "up"}-s-line ${styles.chevron}`} aria-hidden />
      </button>
        <div className={styles.body}>
        

          <div className={styles.grid}>

            <select
              className={`form-select ${styles.select}`}
              value={filters.status}
              onChange={(e) => update({ status: e.target.value })}
              aria-label="Status"
            >
              <option value="">All (status)</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <select
              className={`form-select ${styles.select}`}
              value={filters.approvalStatus}
              onChange={(e) => update({ approvalStatus: e.target.value })}
              aria-label="Approval"
            >
              {APPROVAL_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {categories.length > 0 && (
              <select
                className={`form-select ${styles.select}`}
                value={filters.categoryId}
                onChange={(e) => update({ categoryId: e.target.value })}
                aria-label="Category"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            {brands.length > 0 && (
              <select
                className={`form-select ${styles.select}`}
                value={filters.brandId}
                onChange={(e) => update({ brandId: e.target.value })}
                aria-label="Brand"
              >
                <option value="">All brands</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            <select
              className={`form-select ${styles.select}`}
              value={filters.sort}
              onChange={(e) => update({ sort: e.target.value as ProductsFiltersState["sort"] })}
              aria-label="Sort"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {onReset && (
              <div className={styles.resetCell}>
                <button type="button" className={`btn btn-outline-secondary radius-12 ${styles.resetBtn}`} onClick={onReset}>
                  Reset
                </button>
              </div>
            )}
          </div>

          {chips.length > 0 && (
            <div className={styles.chips}>
              {chips.map(({ key, label }) => (
                <span key={key} className={styles.chip}>
                  {label}
                  <button
                    type="button"
                    className={styles.chipRemove}
                    onClick={() => clearFilter(key)}
                    aria-label={`Clear ${label}`}
                  >
                    <i className="ri-close-line" aria-hidden />
                  </button>
                </span>
              ))}
            </div>
          )}
          {savedViews.length > 0 && onLoadView && (
            <div className="small text-muted d-flex align-items-center gap-2 flex-wrap mt-2">
              <span>Saved views:</span>
              {savedViews.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className="btn btn-link btn-sm p-0"
                  onClick={() => onLoadView(v.id)}
                >
                  {v.name}
                </button>
              ))}
            </div>
          )}
        </div>
        {hasTopControls && (
            <div className={styles.topRow}>
              <div className={styles.topRowSpacer} />
              {hasSearch && (
                <div className={`input-group ${styles.searchWrap}`}>
                  <span className="input-group-text bg-white border-end-0 radius-12 radius-end-0">
                    <i className="ri-search-line text-muted" aria-hidden />
                  </span>
                  <input
                    type="search"
                    className="form-control col-xl  border-start-0 radius-12 radius-start-0"
                    placeholder={searchPlaceholder}
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSearchSubmit?.(); } }}
                    aria-label="Search products"
                  />
                </div>
              )}
              <div className={styles.topRowControls}>
                <div className={styles.segmented} role="group" aria-label="View mode">
                  <button
                    type="button"
                    className={viewMode === "table" ? styles.active : ""}
                    onClick={() => setViewMode!("table")}
                    aria-pressed={viewMode === "table"}
                    aria-label="Table view"
                  >
                    <i className="ri-list-unordered" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={viewMode === "grid" ? styles.active : ""}
                    onClick={() => setViewMode!("grid")}
                    aria-pressed={viewMode === "grid"}
                    aria-label="Grid view"
                  >
                    <i className="ri-grid-line" aria-hidden />
                  </button>
                </div>

              </div>
            </div>
          )}
    </div>
  );
}
