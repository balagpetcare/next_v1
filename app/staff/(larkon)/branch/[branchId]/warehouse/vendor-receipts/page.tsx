"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import StaffBranchLayout from "@/src/components/branch/StaffBranchLayout";
import { useBranchContext } from "@/lib/useBranchContext";
import WarehouseAccessFallback from "../_components/WarehouseAccessFallback";
import { canConfirmGrn, canExecuteVendorReceive } from "@/src/lib/vendorReceipt/permissions";
import { useToast } from "@/src/hooks/useToast";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";
import {
  VendorReceiptSummaryCards,
  VendorReceiptFilters,
  VendorReceiptTable,
  VendorReceiptEmptyState,
  VendorReceiptPageSkeleton,
  VendorReceiptFilterChips,
} from "@/src/components/warehouse/vendor-receipts";
import { useBranchGrnList, type VendorReceiptTab } from "@/src/lib/useBranchGrnList";
import { useVendorReceiptDashboardStats } from "@/src/lib/useVendorReceiptDashboardStats";
import { grnRowHasLineDiscrepancy, type VendorReceiptGrnRow } from "@/src/lib/vendorReceiptTypes";

function tabFromQuery(q: string | null): VendorReceiptTab {
  if (q === "draft" || q === "history" || q === "pending") return q;
  return "pending";
}

export default function StaffWarehouseVendorReceiptsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = String(params?.branchId ?? "");
  const toast = useToast();
  const { branch, myAccess, isLoading } = useBranchContext(branchId);
  const perms = myAccess?.permissions ?? [];
  const canReceive = useMemo(() => canExecuteVendorReceive(perms), [perms]);
  const isManager = useMemo(() => canConfirmGrn(perms), [perms]);

  const rawOrg = branch && typeof branch === "object" && "orgId" in branch ? (branch as { orgId?: number }).orgId : undefined;
  const fallbackOrgId = rawOrg != null && Number.isFinite(Number(rawOrg)) ? Number(rawOrg) : null;

  const tab = tabFromQuery(searchParams.get("tab"));
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [discrepancyOnly, setDiscrepancyOnly] = useState(false);
  const [vendorFilter, setVendorFilter] = useState("");

  const [postedBanner, setPostedBanner] = useState(false);
  useEffect(() => {
    if (searchParams.get("posted") === "1") {
      setPostedBanner(true);
      const next = new URLSearchParams(searchParams.toString());
      next.delete("posted");
      router.replace(`/staff/branch/${branchId}/warehouse/vendor-receipts?${next.toString()}`, { scroll: false });
    }
  }, [branchId, router, searchParams]);

  const setTab = useCallback(
    (next: VendorReceiptTab) => {
      setPage(1);
      setDiscrepancyOnly(false);
      const q = new URLSearchParams(searchParams.toString());
      q.set("tab", next);
      router.replace(`/staff/branch/${branchId}/warehouse/vendor-receipts?${q.toString()}`, { scroll: false });
    },
    [branchId, router, searchParams]
  );

  const { items, pagination, loading, error, refetch } = useBranchGrnList({
    orgId: fallbackOrgId,
    branchId,
    tab,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    limit: 20,
    enabled: canReceive && !!fallbackOrgId && !!branchId,
  });

  const stats = useVendorReceiptDashboardStats({
    orgId: fallbackOrgId,
    branchId,
    enabled: canReceive && !!fallbackOrgId && !!branchId,
  });

  const displayedItems: VendorReceiptGrnRow[] = useMemo(() => {
    if (!discrepancyOnly) return items;
    return items.filter((g) => grnRowHasLineDiscrepancy(g));
  }, [items, discrepancyOnly]);

  const vendorNames = useMemo(() => {
    const s = new Set<string>();
    for (const g of items) {
      const n = g.vendor?.name;
      if (n) s.add(n);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const vendorScopedItems = useMemo(() => {
    if (!vendorFilter) return displayedItems;
    return displayedItems.filter((g) => (g.vendor?.name ?? "") === vendorFilter);
  }, [displayedItems, vendorFilter]);

  if (isLoading) {
    return (
      <StaffBranchLayout branchId={branchId} requiredPermission={null}>
        <VendorReceiptPageSkeleton />
      </StaffBranchLayout>
    );
  }

  if (!canReceive) {
    return (
      <StaffBranchLayout branchId={branchId} requiredPermission={null}>
        <WarehouseAccessFallback
          branchId={branchId}
          title="Receiving permission required"
          message="Purchase receive / GRN permissions are required to view vendor receipts. Ask an administrator to assign purchase.receive, grn.post, or grn.create."
        />
      </StaffBranchLayout>
    );
  }

  return (
    <StaffBranchLayout branchId={branchId} requiredPermission={null}>
      <div className="container-fluid py-3 px-2 px-sm-3">
        {postedBanner && (
          <div className="alert alert-success radius-12 py-2 px-3 d-flex align-items-center justify-content-between mb-4" role="status">
            <span className="small">
              <i className="ri-checkbox-circle-line me-1" />
              Stock posted — this GRN is now in <strong>History</strong>.
            </span>
            <button type="button" className="btn-close" aria-label="Dismiss" onClick={() => setPostedBanner(false)} />
          </div>
        )}
        <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
          <div>
            <nav aria-label="breadcrumb" className="mb-2">
              <ol className="breadcrumb mb-0 small">
                <li className="breadcrumb-item">
                  <Link href="/staff">Staff</Link>
                </li>
                <li className="breadcrumb-item">
                  <Link href="/staff/branch">Branches</Link>
                </li>
                <li className="breadcrumb-item">
                  <Link href={`/staff/branch/${branchId}`}>Branch #{branchId}</Link>
                </li>
                <li className="breadcrumb-item">
                  <Link href={`/staff/branch/${branchId}/warehouse`}>Warehouse</Link>
                </li>
                <li className="breadcrumb-item active">Vendor receipts</li>
              </ol>
            </nav>
            <h5 className="mb-2 fw-semibold">Vendor receipts</h5>
            <p className="text-muted small mb-0">Goods received notes (GRN) for this warehouse branch.</p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <Link href={`/staff/branch/${branchId}/warehouse/receive-po`} className="btn btn-primary btn-sm">
              <i className="ri-add-line me-1" />
              Create new receive
            </Link>
            <Link href={`/staff/branch/${branchId}/warehouse/receive-po`} className="btn btn-outline-secondary btn-sm">
              Receive workspace
            </Link>
          </div>
        </div>

        <VendorReceiptSummaryCards
          loading={stats.loading}
          error={stats.error}
          awaitingConfirmation={stats.awaitingConfirmation}
          draftVendorReceives={stats.draftVendorReceives}
          receivedToday={stats.receivedToday}
          discrepancyGrns={stats.discrepancyGrns}
          activeTab={tab}
          onSelectTab={setTab}
          onSelectDiscrepancyFilter={() => {
            setTab("pending");
            setDiscrepancyOnly(true);
            setPage(1);
            toast.info("Filtered to GRNs with line discrepancies on this page.");
          }}
        />

        <ul className="nav nav-tabs nav-bordered mb-4">
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${tab === "pending" ? "active" : ""}`}
              onClick={() => setTab("pending")}
            >
              Pending
            </button>
          </li>
          <li className="nav-item">
            <button type="button" className={`nav-link ${tab === "draft" ? "active" : ""}`} onClick={() => setTab("draft")}>
              Draft
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${tab === "history" ? "active" : ""}`}
              onClick={() => setTab("history")}
            >
              History
            </button>
          </li>
        </ul>

        {discrepancyOnly && (
          <div className="alert alert-info radius-12 py-2 px-3 small d-flex align-items-center justify-content-between mb-3">
            <span>Discrepancy filter is on (current page only).</span>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setDiscrepancyOnly(false)}>
              Clear filter
            </button>
          </div>
        )}

        <VendorReceiptFilterChips
          discrepancyOnly={discrepancyOnly}
          onToggleDiscrepancy={() => {
            setDiscrepancyOnly((v) => {
              const next = !v;
              if (next) toast.info("Showing GRNs with line discrepancies on this page.");
              return next;
            });
            setPage(1);
          }}
          onToday={() => {
            const t = new Date().toISOString().slice(0, 10);
            setDateFrom(t);
            setDateTo(t);
            setPage(1);
            toast.info("Date range set to today (server filter).");
          }}
          onClearAll={() => {
            setSearch("");
            setVendorFilter("");
            setDateFrom("");
            setDateTo("");
            setDiscrepancyOnly(false);
            setPage(1);
            toast.info("Filters cleared.");
          }}
        />

        <VendorReceiptFilters
          search={search}
          onSearchChange={setSearch}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onClearDates={() => {
            setDateFrom("");
            setDateTo("");
            toast.info("Date filters cleared.");
          }}
          vendorNames={vendorNames}
          vendorFilter={vendorFilter}
          onVendorFilterChange={(v) => {
            setVendorFilter(v);
            setPage(1);
          }}
        />

        {error && (
          <div className="alert alert-danger radius-12 py-2 px-3 d-flex align-items-center justify-content-between mb-4">
            <span className="small">{error}</span>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => {
                Promise.all([refetch(), stats.refetch()])
                  .then(() => {
                    toast.success("List refreshed.");
                  })
                  .catch((e) => toast.error(getMessageFromApiError(e instanceof Error ? e : new Error(String(e)))));
              }}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && displayedItems.length === 0 ? (
          <VendorReceiptEmptyState
            branchId={branchId}
            tabLabel={tab === "pending" ? "Pending" : tab === "draft" ? "Draft" : "History"}
          />
        ) : !loading && vendorScopedItems.length === 0 ? (
          <div className="card radius-12 border">
            <div className="card-body text-center py-5 px-4">
              <h6 className="fw-semibold mb-2">No vendor receipts match filters</h6>
              <p className="text-muted small mb-3">
                Try another vendor, clear the vendor filter, or widen the date range. Search only applies to rows on this page.
              </p>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={() => {
                  setVendorFilter("");
                  setSearch("");
                  setDiscrepancyOnly(false);
                  toast.info("Vendor and search filters cleared.");
                }}
              >
                Clear vendor &amp; search
              </button>
            </div>
          </div>
        ) : (
          <VendorReceiptTable
            branchId={branchId}
            items={vendorScopedItems}
            loading={loading}
            search={search}
            tab={tab}
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalCount={pagination.total}
            onPageChange={(p) => setPage(p)}
            isManager={isManager}
          />
        )}
      </div>
    </StaffBranchLayout>
  );
}
