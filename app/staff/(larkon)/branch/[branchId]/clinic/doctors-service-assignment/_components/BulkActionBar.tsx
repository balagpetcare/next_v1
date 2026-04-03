"use client";

type Props = {
  selectedCount: number;
  bulkMode: boolean;
  onToggleBulkMode: () => void;
  onClearSelection: () => void;
  onUnassignSelected: () => void;
  onOpenTemplates: () => void;
  disabled: boolean;
};

export default function BulkActionBar({
  selectedCount,
  bulkMode,
  onToggleBulkMode,
  onClearSelection,
  onUnassignSelected,
  onOpenTemplates,
  disabled,
}: Props) {
  return (
    <div className="d-flex flex-wrap align-items-center gap-2 py-2 px-3 border rounded-3 bg-light mb-3">
      <button
        type="button"
        className={`btn btn-sm radius-8 ${bulkMode ? "btn-primary" : "btn-outline-secondary"}`}
        onClick={onToggleBulkMode}
        disabled={disabled}
      >
        {bulkMode ? "Exit selection" : "Select services"}
      </button>
      {bulkMode && (
        <>
          <span className="text-muted small">{selectedCount} selected</span>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm radius-8"
            onClick={onClearSelection}
            disabled={disabled || selectedCount === 0}
          >
            Clear
          </button>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm radius-8"
            onClick={onUnassignSelected}
            disabled={disabled || selectedCount === 0}
          >
            Unassign selected
          </button>
        </>
      )}
      <button
        type="button"
        className="btn btn-outline-primary btn-sm radius-8 ms-auto"
        onClick={onOpenTemplates}
        disabled={disabled}
      >
        Templates
      </button>
    </div>
  );
}
