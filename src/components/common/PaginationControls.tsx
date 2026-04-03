"use client";

import { getPaginationPageItems } from "@/src/lib/paginationFormat";

export type PaginationControlsProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  /** Pages adjacent to current on each side (default 1). */
  siblingCount?: number;
};

/**
 * Previous · page numbers (with ellipsis) · Next. Compact rounded buttons; active page uses primary.
 */
export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  disabled,
  ariaLabel = "Page navigation",
  className = "",
  siblingCount = 1,
}: PaginationControlsProps) {
  const tp = Math.max(1, Math.floor(totalPages) || 1);
  const cur = Math.min(Math.max(1, currentPage), tp);
  const items = getPaginationPageItems(cur, tp, { siblingCount });

  return (
    <nav aria-label={ariaLabel} className={className}>
      <div className="d-flex flex-wrap align-items-center gap-1">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary radius-8"
          disabled={disabled || cur <= 1}
          onClick={() => cur > 1 && onPageChange(cur - 1)}
          aria-label="Previous page"
        >
          Previous
        </button>
        {items.map((item, idx) =>
          item === "ellipsis" ? (
            <span key={`e-${idx}`} className="px-1 small text-muted user-select-none" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={`btn btn-sm radius-8 ${item === cur ? "btn-primary" : "btn-outline-secondary"}`}
              style={{ minWidth: "2.25rem" }}
              disabled={disabled}
              onClick={() => onPageChange(item)}
              aria-label={`Page ${item}`}
              aria-current={item === cur ? "page" : undefined}
            >
              {item}
            </button>
          )
        )}
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary radius-8"
          disabled={disabled || cur >= tp}
          onClick={() => cur < tp && onPageChange(cur + 1)}
          aria-label="Next page"
        >
          Next
        </button>
      </div>
    </nav>
  );
}
