"use client";

import type { ReactNode } from "react";

export type ColumnDef<T> = {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  thClass?: string;
};

type InventoryOpsTableProps<T> = {
  columns: ColumnDef<T>[];
  rows: T[];
  loading?: boolean;
  onRowClick?: (row: T, index: number) => void;
  keyExtractor: (row: T, index: number) => string | number;
  emptyMessage?: string;
  skeletonRows?: number;
  className?: string;
};

export function InventoryOpsTable<T>({
  columns,
  rows,
  loading = false,
  onRowClick,
  keyExtractor,
  emptyMessage = "No records found.",
  skeletonRows = 5,
  className = "",
}: InventoryOpsTableProps<T>) {
  return (
    <div className={`table-responsive ${className}`}>
      <table className="table table-sm table-hover mb-0">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.thClass ?? ""}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={`skeleton-${i}`}>
                {columns.map((col) => (
                  <td key={col.key}>
                    <span className="placeholder col-12" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center text-secondary-light py-24">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr
                key={keyExtractor(row, idx)}
                onClick={onRowClick ? () => onRowClick(row, idx) : undefined}
                role={onRowClick ? "button" : undefined}
                style={onRowClick ? { cursor: "pointer" } : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key}>{col.render(row)}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
