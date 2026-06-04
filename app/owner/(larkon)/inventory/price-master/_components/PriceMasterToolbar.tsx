"use client";

import type { OrgMetaResponse } from "../_lib/priceMasterTypes";

export type ToolbarFilters = {
  q: string;
  categoryId: string;
  unpricedOnly: boolean;
  sortBy: "updatedAt" | "sku" | "basePrice";
  sortOrder: "asc" | "desc";
  clientFlags: "all" | "issues" | "recent";
};

type Props = {
  filters: ToolbarFilters;
  onChange: (next: Partial<ToolbarFilters>) => void;
  onSearch: () => void;
  meta: OrgMetaResponse | null;
  loadingMeta: boolean;
  disabled?: boolean;
};

export function PriceMasterToolbar({ filters, onChange, onSearch, meta, loadingMeta, disabled }: Props) {
  return (
    <div className="card radius-12 mb-3">
      <div className="card-body py-3">
        <div className="row g-2 align-items-end">
          <div className="col-lg-4 col-md-6">
            <label className="form-label small text-muted mb-1">Search catalog</label>
            <input
              className="form-control form-control-sm"
              placeholder="SKU, variant title, or product name"
              value={filters.q}
              disabled={disabled}
              onChange={(e) => onChange({ q: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSearch();
              }}
            />
          </div>
          <div className="col-lg-2 col-md-6">
            <label className="form-label small text-muted mb-1">Category</label>
            <select
              className="form-select form-select-sm"
              value={filters.categoryId}
              disabled={disabled || loadingMeta}
              onChange={(e) => onChange({ categoryId: e.target.value })}
            >
              <option value="">All categories</option>
              {(meta?.categories ?? []).map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-lg-2 col-md-4">
            <label className="form-label small text-muted mb-1">Sort</label>
            <select
              className="form-select form-select-sm"
              value={`${filters.sortBy}:${filters.sortOrder}`}
              disabled={disabled}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split(":") as [ToolbarFilters["sortBy"], ToolbarFilters["sortOrder"]];
                onChange({ sortBy, sortOrder });
              }}
            >
              <option value="updatedAt:desc">Recently updated</option>
              <option value="updatedAt:asc">Oldest update</option>
              <option value="sku:asc">SKU A–Z</option>
              <option value="sku:desc">SKU Z–A</option>
              <option value="basePrice:desc">Base price high → low</option>
              <option value="basePrice:asc">Base price low → high</option>
            </select>
          </div>
          <div className="col-lg-2 col-md-4">
            <label className="form-label small text-muted mb-1">Row focus</label>
            <select
              className="form-select form-select-sm"
              value={filters.clientFlags}
              disabled={disabled}
              onChange={(e) => onChange({ clientFlags: e.target.value as ToolbarFilters["clientFlags"] })}
            >
              <option value="all">All rows (this page)</option>
              <option value="issues">Issues & warnings only</option>
              <option value="recent">Updated in last 7 days</option>
            </select>
          </div>
          <div className="col-lg-2 col-md-4 d-flex flex-wrap gap-2 align-items-center">
            <div className="form-check mb-0">
              <input
                id="unpricedOnly"
                type="checkbox"
                className="form-check-input"
                checked={filters.unpricedOnly}
                disabled={disabled}
                onChange={(e) => onChange({ unpricedOnly: e.target.checked })}
              />
              <label className="form-check-label small" htmlFor="unpricedOnly">
                Missing base only
              </label>
            </div>
          </div>
        </div>
        <div className="d-flex flex-wrap gap-2 mt-3">
          <button type="button" className="btn btn-primary btn-sm" disabled={disabled} onClick={onSearch}>
            Apply filters
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            disabled={disabled}
            onClick={() => {
              onChange({
                q: "",
                categoryId: "",
                unpricedOnly: false,
                sortBy: "updatedAt",
                sortOrder: "desc",
                clientFlags: "all",
              });
              onSearch();
            }}
          >
            Clear filters
          </button>
        </div>
      </div>
    </div>
  );
}
