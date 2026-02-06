"use client";

import { Icon } from "@iconify/react";

/**
 * Bar shown when rows are selected. Actions receive selectedIds.
 */
export default function BulkActions({ selectedIds = [], onClear, actions = [], loading }) {
  if (!selectedIds.length) return null;

  return (
    <div className="d-flex align-items-center gap-3 py-2 px-3 mb-2 rounded bg-primary bg-opacity-10 border border-primary">
      <span className="fw-semibold">{selectedIds.length} selected</span>
      <div className="d-flex gap-2">
        {actions.map((a) => (
          <button
            key={a.key}
            type="button"
            className={`btn btn-sm ${a.variant || "btn-outline-primary"}`}
            onClick={() => a.onClick(selectedIds)}
            disabled={loading || a.disabled}
          >
            {a.icon ? <Icon icon={a.icon} className="me-1" /> : null}
            {a.label}
          </button>
        ))}
      </div>
      <button type="button" className="btn btn-sm btn-outline-secondary ms-auto" onClick={onClear}>
        <Icon icon="solar:close-circle-bold" /> Clear
      </button>
    </div>
  );
}
