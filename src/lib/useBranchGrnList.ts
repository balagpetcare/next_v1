"use client";

import { useCallback, useEffect, useState } from "react";
import type { VendorReceiptGrnRow } from "@/src/lib/vendorReceiptTypes";
import { fetchBranchVendorReceiptGrns, type VendorReceiptTab } from "@/src/lib/vendorReceipt/queries";

export type { VendorReceiptTab };

export function useBranchGrnList(opts: {
  orgId: number | null;
  branchId: string;
  tab: VendorReceiptTab;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  limit?: number;
  enabled: boolean;
}) {
  const [items, setItems] = useState<VendorReceiptGrnRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!opts.enabled || opts.orgId == null || !opts.branchId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchBranchVendorReceiptGrns({
        orgId: opts.orgId,
        branchId: Number(opts.branchId),
        tab: opts.tab,
        dateFrom: opts.dateFrom,
        dateTo: opts.dateTo,
        page: opts.page,
        limit: opts.limit ?? 20,
      });
      setItems(res.items);
      setPagination(res.pagination);
    } catch (e: unknown) {
      setItems([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [
    opts.enabled,
    opts.orgId,
    opts.branchId,
    opts.tab,
    opts.dateFrom,
    opts.dateTo,
    opts.page,
    opts.limit,
  ]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { items, pagination, loading, error, refetch };
}
