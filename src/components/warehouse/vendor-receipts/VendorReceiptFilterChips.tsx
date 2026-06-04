"use client";

export function VendorReceiptFilterChips(props: {
  discrepancyOnly: boolean;
  onToggleDiscrepancy: () => void;
  onToday: () => void;
  onClearAll: () => void;
}) {
  const { discrepancyOnly, onToggleDiscrepancy, onToday, onClearAll } = props;
  return (
    <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
      <span className="small text-muted me-1">Quick filters</span>
      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onToday}>
        Today
      </button>
      <button
        type="button"
        className={`btn btn-sm ${discrepancyOnly ? "btn-warning text-dark" : "btn-outline-warning"}`}
        onClick={onToggleDiscrepancy}
      >
        Discrepancy
      </button>
      <button type="button" className="btn btn-sm btn-outline-dark" onClick={onClearAll}>
        Clear filters
      </button>
    </div>
  );
}
