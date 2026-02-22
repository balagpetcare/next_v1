"use client";

import type { ReactNode } from "react";

type InventoryItemGridProps<T> = {
  title?: string;
  lines: T[];
  onAddLine: () => void;
  renderLine: (line: T, index: number) => ReactNode;
  addLabel?: string;
  className?: string;
};

export function InventoryItemGrid<T>({
  title = "Items",
  lines,
  onAddLine,
  renderLine,
  addLabel = "+ Add line",
  className = "",
}: InventoryItemGridProps<T>) {
  return (
    <div className={className}>
      <div className="d-flex align-items-center justify-content-between mb-8">
        <span className="form-label text-sm mb-0">{title}</span>
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={onAddLine}>
          {addLabel}
        </button>
      </div>
      {lines.map((line, idx) => (
        <div key={idx} className="mb-12">
          {renderLine(line, idx)}
        </div>
      ))}
    </div>
  );
}
