"use client";

import type { CatalogFilters } from "./catalogConstants";
import { DOMAIN_OPTIONS } from "./catalogConstants";

type CategoryOption = { id: number; name: string };

type CatalogToolbarProps = {
  filters: CatalogFilters;
  onFiltersChange: (f: CatalogFilters) => void;
  categoryOptions: CategoryOption[];
  onReset: () => void;
};

export default function CatalogToolbar({
  filters,
  onFiltersChange,
  categoryOptions,
  onReset,
}: CatalogToolbarProps) {
  const update = (partial: Partial<CatalogFilters>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  return (
    <div className="card radius-12 mb-3 sticky-top bg-body shadow-sm" style={{ zIndex: 10 }}>
      <div className="card-body p-3">
        <div className="row g-2 align-items-center flex-wrap">
          <div className="col-12 col-md-3 col-lg-2">
            <input
              type="search"
              className="form-control form-control-sm radius-8"
              placeholder="Search by name or code…"
              value={filters.search}
              onChange={(e) => update({ search: e.target.value })}
              aria-label="Keyword search"
            />
          </div>
          <div className="col-6 col-md-2 col-lg-2">
            <select
              className="form-select form-select-sm radius-8"
              value={filters.domainType}
              onChange={(e) => update({ domainType: e.target.value })}
              aria-label="Domain filter"
            >
              {DOMAIN_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-2 col-lg-2">
            <select
              className="form-select form-select-sm radius-8"
              value={filters.categoryId}
              onChange={(e) => update({ categoryId: e.target.value })}
              aria-label="Category filter"
            >
              <option value="">All categories</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-2 col-lg-1">
            <select
              className="form-select form-select-sm radius-8"
              value={filters.isActive}
              onChange={(e) => update({ isActive: e.target.value })}
              aria-label="Status filter"
            >
              <option value="">All status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div className="col-6 col-md-2 col-lg-2">
            <select
              className="form-select form-select-sm radius-8"
              value={filters.hasUsageTemplate}
              onChange={(e) => update({ hasUsageTemplate: e.target.value })}
              aria-label="Usage template filter"
            >
              <option value="">Any usage</option>
              <option value="true">Has template</option>
              <option value="false">No template</option>
            </select>
          </div>
          <div className="col-6 col-md-2 col-lg-1">
            <select
              className="form-select form-select-sm radius-8"
              value={filters.sort}
              onChange={(e) => update({ sort: e.target.value })}
              aria-label="Sort"
            >
              <option value="domain_code">Domain, Code</option>
              <option value="name">Name</option>
              <option value="updated_desc">Updated (newest)</option>
              <option value="updated_asc">Updated (oldest)</option>
            </select>
          </div>
          <div className="col-6 col-md-2 col-lg-1">
            <button type="button" className="btn btn-outline-secondary btn-sm radius-8 w-100" onClick={onReset} aria-label="Reset filters">
              <i className="ri-refresh-line me-1" /> Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
