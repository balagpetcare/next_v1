"use client";

import type { TierToolbarFilters } from "../_lib/membershipTierTypes";

type Props = {
  filters: TierToolbarFilters;
  onChange: (p: Partial<TierToolbarFilters>) => void;
  onClear: () => void;
  onRefresh: () => void;
  onCreate: () => void;
  loading: boolean;
  canManage: boolean;
};

export function MembershipTierToolbar({ filters, onChange, onClear, onRefresh, onCreate, loading, canManage }: Props) {
  return (
    <div className="card radius-12 mb-3">
      <div className="card-body py-3">
        <div className="row g-2 align-items-end">
          <div className="col-md-4">
            <label className="form-label small text-muted mb-1">Search tiers</label>
            <input
              className="form-control form-control-sm"
              placeholder="Name contains…"
              value={filters.q}
              onChange={(e) => onChange({ q: e.target.value })}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label small text-muted mb-1">Status</label>
            <select className="form-select form-select-sm" value={filters.status} onChange={(e) => onChange({ status: e.target.value })}>
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="PAUSED">Paused</option>
              <option value="ARCHIVED">Archived</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
          <div className="col-md-3 d-flex flex-wrap gap-3 align-items-center pt-3 pt-md-4">
            <div className="form-check mb-0">
              <input
                className="form-check-input"
                type="checkbox"
                id="flt-scoped"
                checked={filters.scopedOnly}
                onChange={(e) => onChange({ scopedOnly: e.target.checked })}
              />
              <label className="form-check-label small" htmlFor="flt-scoped">
                Branch-scoped only
              </label>
            </div>
            <div className="form-check mb-0">
              <input
                className="form-check-input"
                type="checkbox"
                id="flt-excl"
                checked={filters.exclusionsOnly}
                onChange={(e) => onChange({ exclusionsOnly: e.target.checked })}
              />
              <label className="form-check-label small" htmlFor="flt-excl">
                Has exclusions
              </label>
            </div>
          </div>
          <div className="col-md-3 text-md-end">
            <div className="btn-group btn-group-sm">
              <button type="button" className="btn btn-outline-secondary" disabled={loading} onClick={onClear}>
                Clear filters
              </button>
              <button type="button" className="btn btn-outline-secondary" disabled={loading} onClick={onRefresh} title="Reload from server">
                ↻
              </button>
            </div>
            {canManage && (
              <button type="button" className="btn btn-sm btn-primary ms-2 mt-2 mt-md-0" onClick={onCreate}>
                Create tier
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
