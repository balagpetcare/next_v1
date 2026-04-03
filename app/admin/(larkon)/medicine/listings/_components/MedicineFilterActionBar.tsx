"use client";

import type { MedicineListingsFilterState, SortByField } from "../_lib/medicineListingsFilterState";

type Props = {
  draft: MedicineListingsFilterState;
  onPatch: (patch: Partial<MedicineListingsFilterState>) => void;
  onApply: () => void;
  onClearAll: () => void;
  onSaveView: () => void;
  onExport: () => void;
  exportBusy: boolean;
  hasPendingChanges?: boolean;
};

export default function MedicineFilterActionBar({
  draft,
  onPatch,
  onApply,
  onClearAll,
  onSaveView,
  onExport,
  exportBusy,
  hasPendingChanges,
}: Props) {
  return (
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 py-3 px-1">
      <div className="d-flex flex-wrap align-items-center gap-2">
        <span className="small text-muted me-1 d-none d-md-inline">Sort</span>
        <select
          className="form-select form-select-sm w-auto"
          value={draft.sortBy}
          onChange={(e) => onPatch({ sortBy: e.target.value as SortByField })}
        >
          <option value="id">Internal ref.</option>
          <option value="createdAt">Created</option>
          <option value="countryId">Country</option>
        </select>
        <select
          className="form-select form-select-sm w-auto"
          value={draft.sortDir}
          onChange={(e) => onPatch({ sortDir: e.target.value as "asc" | "desc" })}
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
        <span className="small text-muted ms-2 d-none d-md-inline">Page size</span>
        <select
          className="form-select form-select-sm w-auto"
          value={String(draft.limit)}
          onChange={(e) => onPatch({ limit: Number(e.target.value), page: 1 })}
        >
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>
      <div className="d-flex flex-wrap align-items-center gap-2">
        {hasPendingChanges ? (
          <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">Unapplied edits</span>
        ) : null}
        <button type="button" className="btn btn-sm btn-outline-secondary radius-8" onClick={onClearAll}>
          Clear all
        </button>
        <button type="button" className="btn btn-sm btn-outline-primary radius-8" onClick={onSaveView}>
          Save view…
        </button>
        <button type="button" className="btn btn-sm btn-outline-secondary radius-8" disabled={exportBusy} onClick={onExport}>
          {exportBusy ? "Exporting…" : "Export CSV"}
        </button>
        <button type="button" className="btn btn-sm btn-primary radius-8 px-3" onClick={onApply}>
          Apply filters
        </button>
      </div>
    </div>
  );
}
