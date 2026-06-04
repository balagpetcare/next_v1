"use client";

import { useCallback, useEffect, useState } from "react";
import { grnList, grnPendingVendorReceiveCount } from "@/lib/api";
import type { VendorReceiptGrnRow } from "@/src/lib/vendorReceiptTypes";
import { grnRowHasLineDiscrepancy, isVendorReceiptRow } from "@/src/lib/vendorReceiptTypes";

function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function countDiscrepancyGrns(rows: VendorReceiptGrnRow[]): number {
  return rows.filter((g) => grnRowHasLineDiscrepancy(g)).length;
}

export function useVendorReceiptDashboardStats(opts: {
  orgId: number | null;
  branchId: string;
  enabled: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(0);
  const [draftVendorReceives, setDraftVendorReceives] = useState(0);
  const [receivedToday, setReceivedToday] = useState(0);
  const [discrepancyGrns, setDiscrepancyGrns] = useState(0);

  const refetch = useCallback(async () => {
    if (!opts.enabled || opts.orgId == null || !opts.branchId) return;
    setLoading(true);
    setError(null);
    const bid = Number(opts.branchId);
    const today = localYmd(new Date());
    try {
      const [counts, todayRes, draftRows, pendRows] = await Promise.all([
        grnPendingVendorReceiveCount({ orgId: opts.orgId, branchId: bid }),
        grnList({
          orgId: opts.orgId,
          branchId: bid,
          status: "RECEIVED",
          dateFrom: today,
          dateTo: today,
          page: 1,
          limit: 1,
        }),
        grnList({
          orgId: opts.orgId,
          branchId: bid,
          status: "DRAFT",
          sessionStatus: "DRAFT",
          page: 1,
          limit: 100,
        }),
        grnList({
          orgId: opts.orgId,
          branchId: bid,
          status: "DRAFT",
          sessionStatus: "AWAITING_CONFIRMATION",
          page: 1,
          limit: 100,
        }),
      ]);
      setAwaitingConfirmation(counts.awaitingConfirmation);
      setDraftVendorReceives(counts.draftVendorReceives);
      setReceivedToday(Number(todayRes.pagination?.total) || 0);
      const d1 = draftRows.items.filter(isVendorReceiptRow);
      const d2 = pendRows.items.filter(isVendorReceiptRow);
      const seen = new Set<number>();
      const merged: VendorReceiptGrnRow[] = [];
      for (const g of [...d2, ...d1]) {
        if (seen.has(g.id)) continue;
        seen.add(g.id);
        merged.push(g);
      }
      setDiscrepancyGrns(countDiscrepancyGrns(merged));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [opts.enabled, opts.orgId, opts.branchId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    loading,
    error,
    awaitingConfirmation,
    draftVendorReceives,
    receivedToday,
    discrepancyGrns,
    refetch,
  };
}
