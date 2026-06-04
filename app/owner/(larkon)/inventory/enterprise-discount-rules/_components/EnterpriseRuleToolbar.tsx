"use client";

import Link from "next/link";
import type { ToolbarFilters } from "../_lib/enterpriseRulesTypes";

type Props = {
  filters: ToolbarFilters;
  onChange: (p: Partial<ToolbarFilters>) => void;
  /** Apply server filters (search text uses this; selects call `onApply` from parent). */
  onApply: () => void;
  onClear: () => void;
  onRefresh: () => void;
  loading: boolean;
  canManage: boolean;
  /** Preferred: navigate to full-page create. */
  createHref?: string;
};

export function EnterpriseRuleToolbar({ filters, onChange, onApply, onClear, onRefresh, loading, canManage, createHref }: Props) {
  return (
    <div className="card radius-12 mb-3">
      <div className="card-body py-3">
        <div className="row g-2 align-items-end">
          <div className="col-lg-3 col-md-6">
            <label className="form-label small text-muted mb-1">Search name</label>
            <input
              className="form-control form-control-sm"
              placeholder="Rule name contains…"
              value={filters.q}
              onChange={(e) => onChange({ q: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") onApply();
              }}
            />
          </div>
          <div className="col-lg-2 col-md-6">
            <label className="form-label small text-muted mb-1">Applies to</label>
            <select
              className="form-select form-select-sm"
              value={filters.targetKind}
              onChange={(e) => {
                onChange({ targetKind: e.target.value });
                onApply();
              }}
            >
              <option value="">All scopes</option>
              <option value="VARIANT">Variant</option>
              <option value="BRAND">Brand</option>
              <option value="CATEGORY">Category</option>
              <option value="ALL_PRODUCTS">All products</option>
            </select>
          </div>
          <div className="col-lg-2 col-md-6">
            <label className="form-label small text-muted mb-1">Status</label>
            <select
              className="form-select form-select-sm"
              value={filters.status}
              onChange={(e) => {
                onChange({ status: e.target.value });
                onApply();
              }}
            >
              <option value="">Any status</option>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div className="col-lg-2 col-md-6">
            <label className="form-label small text-muted mb-1">Stackable</label>
            <select
              className="form-select form-select-sm"
              value={filters.stackable}
              onChange={(e) => {
                onChange({ stackable: e.target.value });
                onApply();
              }}
            >
              <option value="">Any</option>
              <option value="1">Stackable</option>
              <option value="0">Not stackable</option>
            </select>
          </div>
          <div className="col-lg-2 col-md-6">
            <label className="form-label small text-muted mb-1">Effective window</label>
            <select
              className="form-select form-select-sm"
              value={filters.effective}
              onChange={(e) => {
                onChange({ effective: e.target.value });
                onApply();
              }}
            >
              <option value="">Any dates</option>
              <option value="current">Applies now (ACTIVE + in window)</option>
              <option value="scheduled">Future start</option>
              <option value="expired">Past end date</option>
            </select>
            {filters.effective === "current" && (
              <div className="form-text">Ignores the status filter above (always ACTIVE for this slice).</div>
            )}
          </div>
          <div className="col-lg-1 col-md-6">
            <label className="form-label small text-muted mb-1">Sort</label>
            <select
              className="form-select form-select-sm"
              value={filters.sort}
              onChange={(e) => {
                onChange({ sort: e.target.value });
                onApply();
              }}
            >
              <option value="priority_asc">Priority ↑</option>
              <option value="priority_desc">Priority ↓</option>
              <option value="updated_desc">Updated</option>
              <option value="name_asc">Name A–Z</option>
            </select>
          </div>
          <div className="col-lg-12 col-md-6 d-flex flex-wrap gap-2 align-items-center pt-2">
            <div className="form-check mb-0">
              <input
                id="warnOnly"
                type="checkbox"
                className="form-check-input"
                checked={filters.warningsOnly}
                onChange={(e) => {
                  onChange({ warningsOnly: e.target.checked });
                  onApply();
                }}
              />
              <label htmlFor="warnOnly" className="form-check-label small">
                Show rows with overlap hints only
              </label>
            </div>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClear} disabled={loading}>
              Clear filters
            </button>
            <button type="button" className="btn btn-sm btn-primary" onClick={onApply} disabled={loading}>
              Apply filters
            </button>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onRefresh} disabled={loading}>
              {loading ? "Loading…" : "Refresh"}
            </button>
            {canManage && createHref && (
              <Link href={createHref} className="btn btn-sm btn-primary ms-auto">
                Create rule
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
