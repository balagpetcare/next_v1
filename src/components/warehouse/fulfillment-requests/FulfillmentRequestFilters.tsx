"use client";

import type { FulfillmentQueueTab } from "@/src/lib/staffFulfillmentRequestsUi";

export function FulfillmentRequestFilters(props: {
  search: string;
  onSearchChange: (v: string) => void;
  statusExtra: string;
  onStatusExtraChange: (v: string) => void;
  branchId: string;
  onBranchIdChange: (v: string) => void;
  branchOptions: { id: number; name: string }[];
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  urgency: string;
  onUrgencyChange: (v: string) => void;
  hasDispatch: string;
  onHasDispatchChange: (v: string) => void;
  sortBy: string;
  sortDir: "asc" | "desc";
  onSortChange: (sortBy: string, sortDir: "asc" | "desc") => void;
  queueTab: FulfillmentQueueTab;
  onQueueTab: (t: FulfillmentQueueTab) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}) {
  const {
    search,
    onSearchChange,
    statusExtra,
    onStatusExtraChange,
    branchId,
    onBranchIdChange,
    branchOptions,
    dateFrom,
    dateTo,
    onDateFromChange,
    onDateToChange,
    urgency,
    onUrgencyChange,
    hasDispatch,
    onHasDispatchChange,
    sortBy,
    sortDir,
    onSortChange,
    queueTab,
    onQueueTab,
    onClearFilters,
    hasActiveFilters,
  } = props;

  return (
    <div className="card radius-12 border mb-4">
      <div className="card-body py-3 px-3">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <span className="small fw-semibold text-muted text-uppercase" style={{ letterSpacing: "0.04em" }}>
            Filters
          </span>
          {hasActiveFilters ? (
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClearFilters}>
              Clear filters
            </button>
          ) : null}
        </div>

        <ul className="nav nav-tabs nav-bordered mb-3 flex-nowrap overflow-auto">
          {(
            [
              ["all", "All"],
              ["action", "Action required"],
              ["approved", "Fulfillment"],
              ["dispatch", "Dispatch"],
              ["partial", "Partial"],
            ] as const
          ).map(([key, label]) => (
            <li className="nav-item" key={key}>
              <button
                type="button"
                className={`nav-link ${queueTab === key ? "active" : ""}`}
                onClick={() => onQueueTab(key)}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>

        <div className="row g-2 g-md-3 align-items-end">
          <div className="col-12 col-md-4 col-lg-3">
            <label className="form-label small text-muted mb-1">Search</label>
            <input
              className="form-control form-control-sm"
              placeholder="Request #, branch name…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <div className="col-6 col-md-4 col-lg-2">
            <label className="form-label small text-muted mb-1">Status</label>
            <select className="form-select form-select-sm" value={statusExtra} onChange={(e) => onStatusExtraChange(e.target.value)}>
              <option value="">(tab default)</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="OWNER_REVIEW">Pending approval</option>
              <option value="APPROVED">Approved</option>
              <option value="PARTIALLY_DISPATCHED">Partially dispatched</option>
              <option value="FULFILLED_PARTIAL">Partially fulfilled</option>
            </select>
          </div>
          <div className="col-6 col-md-4 col-lg-2">
            <label className="form-label small text-muted mb-1">Branch</label>
            <select className="form-select form-select-sm" value={branchId} onChange={(e) => onBranchIdChange(e.target.value)}>
              <option value="">All branches</option>
              {branchOptions.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-4 col-lg-2">
            <label className="form-label small text-muted mb-1">Created from</label>
            <input type="date" className="form-control form-control-sm" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} />
          </div>
          <div className="col-6 col-md-4 col-lg-2">
            <label className="form-label small text-muted mb-1">Created to</label>
            <input type="date" className="form-control form-control-sm" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} />
          </div>
          <div className="col-6 col-md-4 col-lg-2">
            <label className="form-label small text-muted mb-1">Priority</label>
            <select className="form-select form-select-sm" value={urgency} onChange={(e) => onUrgencyChange(e.target.value)}>
              <option value="">Any</option>
              <option value="HIGH">High</option>
              <option value="NORMAL">Normal</option>
              <option value="LOW">Low</option>
            </select>
          </div>
          <div className="col-6 col-md-4 col-lg-2">
            <label className="form-label small text-muted mb-1">Dispatch</label>
            <select className="form-select form-select-sm" value={hasDispatch} onChange={(e) => onHasDispatchChange(e.target.value)}>
              <option value="">Any</option>
              <option value="true">Has dispatch</option>
              <option value="false">No dispatch</option>
            </select>
          </div>
          <div className="col-12 col-md-6 col-lg-3">
            <label className="form-label small text-muted mb-1">Sort</label>
            <div className="input-group input-group-sm">
              <select
                className="form-select"
                value={`${sortBy}:${sortDir}`}
                onChange={(e) => {
                  const [sb, sd] = e.target.value.split(":");
                  onSortChange(sb, sd === "asc" ? "asc" : "desc");
                }}
              >
                <option value="createdAt:desc">Newest created</option>
                <option value="createdAt:asc">Oldest created</option>
                <option value="updatedAt:desc">Recently updated</option>
                <option value="updatedAt:asc">Least recently updated</option>
                <option value="urgency:desc">Priority (high first)</option>
                <option value="id:desc">Request ID (high)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
