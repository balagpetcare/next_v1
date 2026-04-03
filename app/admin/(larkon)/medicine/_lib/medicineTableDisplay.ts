/**
 * Pagination-aware 1-based serial for medicine workspace tables.
 * Raw database ids stay off primary columns; use this for human-facing row order.
 */
export function medicineTableSl(page: number, limit: number, rowIndexZeroBased: number): number {
  const p = Math.max(1, Math.floor(Number(page)) || 1);
  const l = Math.max(1, Math.floor(Number(limit)) || 1);
  const i = Math.max(0, Math.floor(Number(rowIndexZeroBased)) || 0);
  return (p - 1) * l + i + 1;
}

/** Default page size for master-data list endpoints in this workspace. */
export const MEDICINE_MASTER_PAGE_LIMIT = 40;
