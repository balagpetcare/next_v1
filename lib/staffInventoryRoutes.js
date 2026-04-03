/**
 * Canonical path helpers for staff branch → inventory → stock requests.
 *
 * Consistent naming: stock-requests for both list and detail routes.
 * Detail URL: `.../inventory/stock-requests/[id]` (App Router page under that path).
 */

export function staffStockRequestListPath(branchId) {
  return `/staff/branch/${branchId}/inventory/stock-requests`;
}

export function staffStockRequestCreatePath(branchId) {
  return `/staff/branch/${branchId}/inventory/stock-request-create`;
}

/** Canonical detail path (matches `app/.../inventory/stock-requests/[id]/page.tsx`). */
export function staffStockRequestDetailPath(branchId, requestId) {
  return `/staff/branch/${branchId}/inventory/stock-requests/${requestId}`;
}
