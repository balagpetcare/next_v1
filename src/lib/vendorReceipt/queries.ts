/**
 * Shared GRN list fetch for vendor receipts / inventory UIs (branch-scoped).
 * Prefer this + hooks over ad-hoc fetch to keep filters consistent.
 */
import { grnList, type GrnListPagination } from "@/lib/api";
import type { VendorReceiptGrnRow } from "@/src/lib/vendorReceiptTypes";
import { isVendorReceiptRow } from "@/src/lib/vendorReceiptTypes";

export type VendorReceiptTab = "pending" | "draft" | "history";

export async function fetchBranchVendorReceiptGrns(params: {
  orgId: number;
  branchId: number;
  tab: VendorReceiptTab;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: VendorReceiptGrnRow[]; pagination: GrnListPagination }> {
  let status: string | undefined;
  let sessionStatus: string | undefined;
  if (params.tab === "pending") {
    status = "DRAFT";
    sessionStatus = "AWAITING_CONFIRMATION";
  } else if (params.tab === "draft") {
    status = "DRAFT";
    sessionStatus = "DRAFT";
  } else {
    status = "RECEIVED";
  }
  const res = await grnList({
    orgId: params.orgId,
    branchId: params.branchId,
    status,
    sessionStatus,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    page: params.page ?? 1,
    limit: params.limit ?? 20,
  });
  return {
    items: res.items.filter(isVendorReceiptRow),
    pagination: res.pagination,
  };
}
