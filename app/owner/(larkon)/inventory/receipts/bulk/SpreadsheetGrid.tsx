"use client";

import { useEffect, useRef, useState } from "react";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import type { SelectedRow, VariantOption } from "./types";

type SpreadsheetGridProps = {
  rows: SelectedRow[];
  onRowsChange: (rows: SelectedRow[]) => void;
  disabled?: boolean;
  onDuplicateRow: (rowId: string) => void;
  onRemoveRow: (rowId: string) => void;
  onPaste: (e: React.ClipboardEvent, startRowId: string) => void;
  onSubmit: () => void;
};

/**
 * Spreadsheet mode grid: per-row variant search (original bulk receive UX).
 * Same grid state as Visual mode; supports paste and inline variant search.
 */
export function SpreadsheetGrid({
  rows,
  onRowsChange,
  disabled,
  onDuplicateRow,
  onRemoveRow,
  onPaste,
  onSubmit,
}: SpreadsheetGridProps) {
  const [variantSearch, setVariantSearch] = useState("");
  const [variantSearchRowId, setVariantSearchRowId] = useState<string | null>(null);
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>([]);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!variantSearchRowId || variantSearch.length < 2) {
      setVariantOptions([]);
      return;
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await ownerGet<{ data: VariantOption[] }>(
          `/api/v1/inventory/variants/search?q=${encodeURIComponent(variantSearch)}&limit=25`
        );
        setVariantOptions(Array.isArray(res?.data) ? res.data : []);
      } catch {
        setVariantOptions([]);
      }
    }, 200);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [variantSearch, variantSearchRowId]);

  const selectVariant = (rowId: string, v: VariantOption) => {
    onRowsChange(
      rows.map((r) =>
        r.id === rowId
          ? {
              ...r,
              variantId: v.id,
              sku: v.sku,
              productName: v.product?.name ?? v.title,
              requiresLot: v.requiresLot,
              requiresExpiry: v.requiresExpiry,
              requiresMfg: v.requiresMfg,
              error: undefined,
            }
          : r
      )
    );
    setVariantSearchRowId(null);
    setVariantSearch("");
  };

  const updateRow = (rowId: string, patch: Partial<SelectedRow>) => {
    onRowsChange(
      rows.map((r) => (r.id === rowId ? { ...r, ...patch, error: undefined } : r))
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowId: string) => {
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      onSubmit();
      return;
    }
    if (e.altKey && e.key === "n") {
      e.preventDefault();
      // Add row handled by parent
      return;
    }
    if (e.ctrlKey && e.key === "d") {
      e.preventDefault();
      onDuplicateRow(rowId);
    }
  };

  const getValidation = (row: SelectedRow) => {
    const qty = parseFloat(row.quantity);
    const hasError = row.variantId != null && (Number.isNaN(qty) || qty <= 0);
    const costWarn = !Number.isNaN(parseFloat(row.unitCost)) && parseFloat(row.unitCost) === 0 && row.variantId != null;
    const expDate = row.expDate ? new Date(row.expDate) : null;
    const expWarn = expDate && expDate <= new Date();
    return { hasError, costWarn, expWarn };
  };

  return (
    <div className="table-responsive">
      <table className="table table-sm table-bordered">
        <thead>
          <tr>
            <th>Product / Variant</th>
            <th style={{ width: 90 }}>Qty *</th>
            <th style={{ width: 90 }}>Unit cost</th>
            <th>Lot code</th>
            <th>Mfg date</th>
            <th>Expiry date</th>
            <th style={{ width: 90 }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const { hasError, costWarn, expWarn } = getValidation(row);
            return (
              <tr
                key={row.id}
                className={hasError ? "table-danger" : ""}
                onKeyDown={(e) => handleKeyDown(e, row.id)}
              >
                <td onPaste={(e) => onPaste(e, row.id)}>
                  {variantSearchRowId === row.id ? (
                    <div className="position-relative">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Search SKU, name, barcode..."
                        value={variantSearch}
                        onChange={(e) => setVariantSearch(e.target.value)}
                        onBlur={() => setTimeout(() => setVariantSearchRowId(null), 150)}
                        autoFocus
                      />
                      {variantOptions.length > 0 && (
                        <ul
                          className="list-group position-absolute mt-0 shadow"
                          style={{ zIndex: 20, maxHeight: 220, overflow: "auto" }}
                        >
                          {variantOptions.map((v) => (
                            <li
                              key={v.id}
                              className="list-group-item list-group-item-action py-1 small"
                              style={{ cursor: "pointer" }}
                              onMouseDown={() => selectVariant(row.id, v)}
                            >
                              {v.product?.name} — {v.sku} {v.title}
                              {(v.requiresLot || v.requiresExpiry) && (
                                <span className="badge bg-secondary ms-1">Lot/Exp</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm text-start w-100"
                      onClick={() => setVariantSearchRowId(row.id)}
                      disabled={disabled}
                    >
                      {row.sku || row.productName
                        ? `${row.productName || ""} ${row.sku}`.trim() || "Select variant"
                        : "Select variant"}
                    </button>
                  )}
                  {row.error && <div className="small text-danger mt-0">{row.error}</div>}
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
                    className="btn btn-outline-secondary btn-sm me-0"
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
