/** Typings for staffInventoryRoutes.js (JS module consumed from TSX). */

export function staffStockRequestListPath(branchId: string | number): string;
export function staffStockRequestCreatePath(branchId: string | number): string;
export function staffStockRequestDetailPath(branchId: string | number, requestId: string | number): string;
export function staffDispatchReceiveWorkspacePath(
  branchId: string | number,
  dispatchId: string | number,
  query?: { from?: string }
): string;
export function staffInboundTransfersPath(branchId: string | number): string;
export function staffReceiveCenterPath(branchId: string | number): string;
export function staffReceiveCenterWithTransferPath(branchId: string | number, transferId: string | number): string;
export function staffBranchInventoryPath(branchId: string | number): string;
export function staffWarehouseReceivePoQueryPath(
  branchId: string | number,
  query: { purchaseOrderId: string | number; vendorId?: string | number | null }
): string;
export function staffIncomingShipmentsPath(branchId: string | number): string;
export function staffDispatchPrintPath(branchId: string | number, dispatchId: string | number, docKind?: string): string;
export function staffLegacyTransfersIncomingPath(branchId: string | number): string;
export function staffWarehouseDashboardPath(branchId: string | number): string;
export function staffWarehouseReceivePoPath(branchId: string | number): string;
export function staffPriceOverrideRequestPath(branchId: string | number): string;
export function staffBranchPickerPath(): string;
export function staffVendorReceiptDetailPath(
  branchId: string | number,
  grnId: string | number,
  query?: { focus?: string; tab?: string }
): string;
