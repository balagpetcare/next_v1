"use client";

import { useCallback, useRef } from "react";
import type { SelectedRow, VariantOption } from "./types";

type SelectedReceiveGridProps = {
  rows: SelectedRow[];
  onRowsChange: (rows: SelectedRow[]) => void;
  onFocusRow: (rowId: string) => void;
  focusedRowId: string | null;
  flashRowId: string | null;
  /** Variants for same product (for variant dropdown per row) — optional */
  variantOptionsByProduct?: Map<number, VariantOption[]>;
  disabled?: boolean;
  onDuplicateRow: (rowId: string) => void;
  onRemoveRow: (rowId: string) => void;
  onPaste?: (e: React.ClipboardEvent, startRowId: string) => void;
  onSubmit: () => void;
};

/**
 * Right panel: Editable Selected Items grid
 * - Product, Variant (display; change via Product Browser or Spreadsheet mode), Qty, Unit Cost, Lot, Mfg, Expiry, Remove
 * - Inline validation (qty>0, unit cost warning, expiry warning)
 * - Keyboard: Enter/Tab next cell, Ctrl+D duplicate, Ctrl+Enter submit
 * - Dedupe: same variant → focus + flash (handled by parent)
 */
export function SelectedReceiveGrid({
  rows,
  onRowsChange,
  onFocusRow,
  focusedRowId,
  flashRowId,
  disabled,
  onDuplicateRow,
  onRemoveRow,
  onPaste,
  onSubmit,
}: SelectedReceiveGridProps) {
  const updateRow = useCallback(
    (rowId: string, patch: Partial<SelectedRow>) => {
      onRowsChange(
        rows.map((r) => (r.id === rowId ? { ...r, ...patch, error: undefined } : r))
      );
    },
    [rows, onRowsChange]
  );

  const getValidation = (row: SelectedRow) => {
    const issues: string[] = [];
    const qty = parseFloat(row.quantity);
    if (row.variantId != null && (Number.isNaN(qty) || qty <= 0)) {
      issues.push("Qty must be > 0");
    }
    const cost = parseFloat(row.unitCost);
    const costWarn = !Number.isNaN(cost) && cost === 0 && row.variantId != null;
    const expDate = row.expDate ? new Date(row.expDate) : null;
    const expWarn = expDate && expDate <= new Date();
    return { hasError: issues.length > 0, error: issues[0], costWarn, expWarn };
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowId: string) => {
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      onSubmit();
      return;
    }
    if (e.ctrlKey && e.key === "d") {
      e.preventDefault();
      onDuplicateRow(rowId);
    }
  };

  return (
    <div className="table-responsive">
      <table className="table table-sm table-bordered">
        <thead>
          <tr>
            <th>Product</th>
            <th>Variant</th>
            <th style={{ width: 90 }}>Qty *</th>
            <th style={{ width: 100 }}>Unit cost</th>
            <th>Lot code</th>
            <th>Mfg date</th>
            <th>Expiry date</th>
            <th style={{ width: 70 }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const { hasError, error, costWarn, expWarn } = getValidation(row);
            const isFlash = flashRowId === row.id;
            return (
              <tr
                key={row.id}
                className={`${hasError ? "table-danger" : ""} ${isFlash ? "table-warning" : ""}`}
                onKeyDown={(e) => handleKeyDown(e, row.id)}
              >
                <td onPaste={onPaste ? (e) => onPaste(e, row.id) : undefined}>
                  <span className="small">
                    {row.productName || "—"} {row.sku && `(${row.sku})`}
                  </span>
                  {row.error && <div className="small text-danger">{row.error}</div>}
                  {error && <div className="small text-danger">{error}</div>}
                </td>
                <td>
                  <span className="small">{row.sku || "—"}</span>
                </td>
                <td>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    min={1}
                    value={row.quantity}
                    onChange={(e) => updateRow(row.id, { quantity: e.target.value })}
                    placeholder="0"
                    disabled={disabled}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control form-control-sm"
                    value={row.unitCost}
                    onChange={(e) => updateRow(row.id, { unitCost: e.target.value })}
                    placeholder="0"
                    disabled={disabled}
                  />
                  {costWarn && (
                    <span className="badge bg-warning text-dark ms-1" title="Unit cost is 0">
                      $0
                    </span>
                  )}
                </td>
                <td>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={row.lotCode}
                    onChange={(e) => updateRow(row.id, { lotCode: e.target.value })}
                    placeholder={row.requiresLot ? "Required" : "Optional"}
                    disabled={disabled}
                  />
                </td>
                <td>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={row.mfgDate}
                    onChange={(e) => updateRow(row.id, { mfgDate: e.target.value })}
                    disabled={disabled}
                  />
                </td>
                <td>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={row.expDate}
                    onChange={(e) => updateRow(row.id, { expDate: e.target.value })}
                    disabled={disabled}
                  />
                  {expWarn && (
                    <span className="badge bg-warning text-dark ms-1" title="Expiry is in the past">
                      Past
                    </span>
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm me-1"
                    title="Duplicate row (Ctrl+D)"
                    onClick={() => onDuplicateRow(row.id)}
                    disabled={disabled}
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => onRemoveRow(row.id)}
                    disabled={disabled || rows.length <= 1}
                  >
                    ×
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
