"use client";

import type { BulkAction } from "./productsPermissions";

type Props = {
  selectedIds: number[];
  actions: BulkAction[];
  onAction: (actionId: string) => void;
  onClear: () => void;
  loading?: boolean;
  className?: string;
};

export function BulkActionBar({
  selectedIds,
  actions,
  onAction,
  onClear,
  loading = false,
  className = "",
}: Props) {
  if (selectedIds.length === 0) return null;

  const btnClass = (a: BulkAction) => {
    if (a.variant === "danger") return "btn-danger";
    if (a.variant === "success") return "btn-success";
    if (a.variant === "primary") return "btn-primary";
    if (a.variant === "outline-primary") return "btn-outline-primary";
    return "btn-outline-secondary";
  };

  return (
    <div
      className={`d-flex align-items-center justify-content-between flex-wrap gap-2 p-2 bg-light border radius-12 ${className}`}
      role="toolbar"
      aria-label="Bulk actions"
    >
      <span className="small text-muted">
        {selectedIds.length} selected
      </span>
      <div className="d-flex flex-wrap gap-2 align-items-center">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className={`btn btn-sm radius-12 ${btnClass(action)}`}
            onClick={() => !action.disabled && onAction(action.id)}
            disabled={action.disabled || loading}
            title={action.tooltip}
          >
            {action.label}
          </button>
        ))}
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary radius-12"
          onClick={onClear}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
