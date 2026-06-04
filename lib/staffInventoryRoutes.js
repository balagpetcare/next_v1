/**
 * Canonical path helpers for staff branch → inventory → stock requests.
 *
 * List: .../inventory/stock-requests
 * Create: .../inventory/stock-request-create (page: inventory/stock-request-create/page.jsx)
 * Detail: .../inventory/stock-request-detail/[requestId] (filesystem matches URL; no rewrite).
 * Legacy .../inventory/stock-requests/[id] and .../stock-request-detail-page/[id] redirect to stock-request-detail (next.config + proxy.ts).
 *
 * Dispatch receive: .../inventory/receive-dispatch/[dispatchId] (filesystem matches URL; no rewrite).
 * Legacy .../receive/dispatch/:id and .../receive-dispatch-page/:id redirect to receive-dispatch (next.config + proxy.ts).
 */

/* global URLSearchParams */

export function staffStockRequestListPath(branchId) {
  return `/staff/branch/${branchId}/inventory/stock-requests`;
}

export function staffStockRequestCreatePath(branchId) {
  return `/staff/branch/${branchId}/inventory/stock-request-create`;
}

/** Canonical detail URL; page file is `inventory/stock-request-detail/[requestId]/page.tsx`. */
export function staffStockRequestDetailPath(branchId, requestId) {
  return `/staff/branch/${branchId}/inventory/stock-request-detail/${requestId}`;
}

/**
 * Canonical enterprise branch receive workspace for a StockDispatch (full page).
 * Page file: inventory/receive-dispatch/[dispatchId]/page.jsx.
 *
 * @param {string|number} branchId
 * @param {string|number} dispatchId
 * @param {{ from?: string }|undefined} [query] — e.g. `{ from: "inbound" }` for breadcrumb context
 */
export function staffDispatchReceiveWorkspacePath(branchId, dispatchId, query) {
  const base = `/staff/branch/${branchId}/inventory/receive-dispatch/${dispatchId}`;
  if (query && typeof query === "object" && query.from) {
    return `${base}?from=${encodeURIComponent(String(query.from))}`;
  }
  return base;
}

/** Warehouse inbound queue (canonical). */
export function staffInboundTransfersPath(branchId) {
  return `/staff/branch/${branchId}/warehouse/inbound-transfers`;
}

/** Receive Center (unified incoming + legacy UI). */
export function staffReceiveCenterPath(branchId) {
  return `/staff/branch/${branchId}/inventory/receive`;
}

/** Receive center with legacy transfer drawer deep-link. */
export function staffReceiveCenterWithTransferPath(branchId, transferId) {
  return `${staffReceiveCenterPath(branchId)}?transfer=${encodeURIComponent(String(transferId))}`;
}

/** Branch inventory root (list / overview). */
export function staffBranchInventoryPath(branchId) {
  return `/staff/branch/${branchId}/inventory`;
}

/**
 * Warehouse receive PO with query params.
 * @param {string|number} branchId
 * @param {{ purchaseOrderId: string|number, vendorId?: string|number|null }} query
 */
export function staffWarehouseReceivePoQueryPath(branchId, query) {
  const base = staffWarehouseReceivePoPath(branchId);
  if (!query || query.purchaseOrderId == null) return base;
  const q = new URLSearchParams({ purchaseOrderId: String(query.purchaseOrderId) });
  if (query.vendorId != null && String(query.vendorId) !== "") q.set("vendorId", String(query.vendorId));
  return `${base}?${q.toString()}`;
}

/** Incoming shipments list (subset UI). */
export function staffIncomingShipmentsPath(branchId) {
  return `/staff/branch/${branchId}/inventory/incoming`;
}

/** Dispatch print preview tabs (canonical browser URL). */
export function staffDispatchPrintPath(branchId, dispatchId, docKind) {
  const id = encodeURIComponent(String(dispatchId));
  const base = `/staff/branch/${branchId}/inventory/dispatch-print/${id}`;
  if (docKind != null && String(docKind).length > 0) {
    return `${base}?doc=${encodeURIComponent(String(docKind))}`;
  }
  return `${base}?doc=challan`;
}

/** Legacy stock transfers, incoming tab. */
export function staffLegacyTransfersIncomingPath(branchId) {
  return `/staff/branch/${branchId}/inventory/transfers?tab=incoming`;
}

/** Staff warehouse dashboard root. */
export function staffWarehouseDashboardPath(branchId) {
  return `/staff/branch/${branchId}/warehouse`;
}

/** Vendor / PO receive at branch warehouse. */
export function staffWarehouseReceivePoPath(branchId) {
  return `/staff/branch/${branchId}/warehouse/receive-po`;
}

/** Request branch selling price override (manager approval). */
export function staffPriceOverrideRequestPath(branchId) {
  return `/staff/branch/${branchId}/inventory/price-override-request`;
}

/** Staff branch picker (no `:branchId` segment). */
export function staffBranchPickerPath() {
  return "/staff/branch";
}

/**
 * Staff warehouse vendor receipt (GRN) detail.
 * Canonical browser URL: .../warehouse/vendor-receipts/[grnId]
 * Physical page: warehouse/vendor-receipt-grn-detail-page/[grnId]/page.tsx
 * — next.config.js beforeFiles rewrites public vendor-receipts/:grnId → vendor-receipt-grn-detail-page/:grnId (Turbopack stability).
 * — proxy.ts also rewrites the canonical URL for authenticated requests (harder routing).
 *
 * @param {string|number} branchId
 * @param {string|number} grnId
 * @param {{ focus?: string, tab?: string }|undefined} [query]
 */
export function staffVendorReceiptDetailPath(branchId, grnId, query) {
  const b = String(branchId);
  const id = encodeURIComponent(String(grnId));
  const base = `/staff/branch/${b}/warehouse/vendor-receipts/${id}`;
  if (!query || typeof query !== "object") return base;
  const q = new URLSearchParams();
  if (query.focus != null && String(query.focus) !== "") q.set("focus", String(query.focus));
  if (query.tab != null && String(query.tab) !== "") q.set("tab", String(query.tab));
  const qs = q.toString();
  return qs ? `${base}?${qs}` : base;
}
