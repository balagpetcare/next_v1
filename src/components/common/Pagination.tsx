"use client";

export type PaginationAlign = "center" | "end";

type Props = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** "center" => justify-content-center; "end" => justify-content-end mb-0 */
  align?: PaginationAlign;
  /** Max page numbers to show around current (e.g. 2 => show current ± 2) */
  maxVisible?: number;
  ariaLabel?: string;
  className?: string;
};

/**
 * Standard Bootstrap-style pagination used across the project.
 * Markup: <nav><ul class="pagination ..."><li class="page-item">...</ul></nav>
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  align = "end",
  maxVisible = 2,
  ariaLabel = "Page navigation example",
  className = "",
}: Props) {
  if (totalPages < 2) return null;

  const ulClass =
    align === "center"
      ? "pagination justify-content-center"
      : "pagination justify-content-end mb-0";

  const low = Math.max(1, currentPage - maxVisible);
  const high = Math.min(totalPages, currentPage + maxVisible);
  const pages = Array.from({ length: high - low + 1 }, (_, i) => low + i);

  return (
    <nav aria-label={ariaLabel} className={className}>
      <ul className={ulClass}>
        <li className={`page-item ${currentPage <= 1 ? "disabled" : ""}`}>
          <button
            type="button"
            className="page-link"
            onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Previous page"
          >
            Previous
          </button>
        </li>
        {pages.map((p) => (
          <li key={p} className={`page-item ${p === currentPage ? "active" : ""}`}>
            <button
              type="button"
              className="page-link"
              onClick={() => onPageChange(p)}
              aria-label={`Page ${p}`}
              aria-current={p === currentPage ? "page" : undefined}
            >
              {p}
            </button>
          </li>
        ))}
        <li className={`page-item ${currentPage >= totalPages ? "disabled" : ""}`}>
          <button
            type="button"
            className="page-link"
            onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            aria-label="Next page"
          >
            Next
          </button>
        </li>
      </ul>
    </nav>
  );
}
