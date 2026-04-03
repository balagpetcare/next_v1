"use client";

import type { ReactNode } from "react";
import { formatPaginationSummary } from "@/src/lib/paginationFormat";
import { PaginationControls } from "./PaginationControls";

export type PaginationBarProps = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
  summaryClassName?: string;
  ariaLabel?: string;
  /** Rendered on the right, before page controls (e.g. per-page select). */
  endBeforeNav?: ReactNode;
  siblingCount?: number;
};

const defaultBarClass = "mt-3 pt-3 border-top";

/**
 * Enterprise pagination row: left-aligned summary (“Showing x–y of z”), right-aligned controls.
 */
export function PaginationBar({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  disabled,
  className = defaultBarClass,
  summaryClassName = "small text-muted text-start mb-0 align-self-center",
  ariaLabel = "Pagination",
  endBeforeNav,
  siblingCount,
}: PaginationBarProps) {
  const summary = formatPaginationSummary({
    page,
    pageSize: pageSize > 0 ? pageSize : 1,
    total,
  });

  const tp = Math.max(1, Math.floor(totalPages) || 1);
  const safePage = Math.min(Math.max(1, page), tp);

  return (
    <div className={`d-flex justify-content-between align-items-center flex-wrap gap-3 ${className}`.trim()}>
      <p className={summaryClassName}>{summary}</p>
      {total > 0 ? (
        <div className="d-flex align-items-center gap-2 flex-wrap justify-content-end ms-md-auto">
          {endBeforeNav}
          <PaginationControls
            currentPage={safePage}
            totalPages={tp}
            onPageChange={onPageChange}
            disabled={disabled}
            ariaLabel={ariaLabel}
            siblingCount={siblingCount}
          />
        </div>
      ) : null}
    </div>
  );
}
