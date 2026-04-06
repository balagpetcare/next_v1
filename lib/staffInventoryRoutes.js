/**
 * Canonical path helpers for staff branch → inventory → stock requests.
 *
 * List: .../inventory/stock-requests
 * Detail (canonical, flat segment): .../inventory/stock-request-detail/[requestId]
 * Legacy .../inventory/stock-requests/[id] redirects to stock-request-detail (next.config + proxy.ts).
 */

export function staffStockRequestListPath(branchId) {
  return `/staff/branch/${branchId}/inventory/stock-requests`;
}

export function staffStockRequestCreatePath(branchId) {
  return `/staff/branch/${branchId}/inventory/stock-request-create`;
}

/** Canonical detail path (filesystem: `inventory/stock-request-detail/[requestId]/page.tsx`). */
export function staffStockRequestDetailPath(branchId, requestId) {
  return `/staff/branch/${branchId}/inventory/stock-request-detail/${requestId}`;
}
