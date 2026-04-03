/**
 * Shared copy and page-number window for enterprise pagination bars.
 */

export function formatPaginationSummary(params: { page: number; pageSize: number; total: number }): string {
  const { page, pageSize, total } = params;
  if (total <= 0) return "No results";
  const size = Math.max(1, Math.floor(Number(pageSize)) || 1);
  const p = Math.max(1, Math.floor(Number(page)) || 1);
  const start = (p - 1) * size + 1;
  const end = Math.min(p * size, total);
  if (!Number.isFinite(pageSize) || pageSize <= 0) {
    return `${total.toLocaleString()} total`;
  }
  return `Showing ${start.toLocaleString()}–${end.toLocaleString()} of ${total.toLocaleString()}`;
}

export type PaginationPageItem = number | "ellipsis";

/**
 * Page indices to render with ellipsis (1-based). Merges boundary pages, current ± siblings, dedupes gaps.
 */
export function getPaginationPageItems(
  currentPage: number,
  totalPages: number,
  options?: { siblingCount?: number; boundaryCount?: number }
): PaginationPageItem[] {
  const total = Math.max(1, Math.floor(Number(totalPages)) || 1);
  const current = Math.min(Math.max(1, Math.floor(Number(currentPage)) || 1), total);
  const sibling = Math.max(0, Math.floor(options?.siblingCount ?? 1));
  const boundary = Math.max(1, Math.floor(options?.boundaryCount ?? 1));

  const maxCompact = boundary * 2 + sibling * 2 + 2;
  if (total <= maxCompact) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  for (let i = 1; i <= Math.min(boundary, total); i++) pages.add(i);
  for (let i = Math.max(1, total - boundary + 1); i <= total; i++) pages.add(i);
  for (let i = current - sibling; i <= current + sibling; i++) {
    if (i >= 1 && i <= total) pages.add(i);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const out: PaginationPageItem[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push("ellipsis");
    out.push(p);
    prev = p;
  }
  return out;
}
