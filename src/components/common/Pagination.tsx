"use client";

import { PaginationControls } from "./PaginationControls";

export type PaginationAlign = "center" | "end";

type Props = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  align?: PaginationAlign;
  /** Interpreted as sibling count on each side of the active page (default 2). */
  maxVisible?: number;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
};

/**
 * Page controls only (no summary). Prefer {@link PaginationBar} for full table footers.
 * Returns null when there is only one page.
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  align = "end",
  maxVisible = 2,
  ariaLabel = "Page navigation",
  className = "",
  disabled,
}: Props) {
  if (totalPages < 2) return null;
  const siblingCount = Math.max(0, maxVisible);
  const wrap = align === "center" ? "d-flex justify-content-center w-100" : "d-flex justify-content-end w-100";
  return (
    <div className={`${wrap} ${className}`.trim()}>
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        ariaLabel={ariaLabel}
        siblingCount={siblingCount}
        disabled={disabled}
      />
    </div>
  );
}
