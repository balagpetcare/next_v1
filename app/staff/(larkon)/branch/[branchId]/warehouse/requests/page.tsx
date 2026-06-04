"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { warehouseAccessible, warehouseOperationsRequisitions, warehouseOperationsSummary } from "@/lib/api";
import { useBranchContext } from "@/lib/useBranchContext";
import StaffBranchLayout from "@/src/components/branch/StaffBranchLayout";
import { getWarehouseCapabilities } from "@/src/lib/warehouseRbac";
import WarehouseAccessFallback from "../_components/WarehouseAccessFallback";
import {
  FulfillmentRequestEmptyState,
  FulfillmentRequestFilters,
  FulfillmentRequestSummaryCards,
  FulfillmentRequestTable,
} from "@/src/components/warehouse/fulfillment-requests";
import type { FulfillmentQueueTab, FulfillmentRequestQueueRow } from "@/src/lib/staffFulfillmentRequestsUi";
import { queueTabToStatusParam } from "@/src/lib/staffFulfillmentRequestsUi";
import { useToast } from "@/src/hooks/useToast";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

type Breakdown = {
  actionRequired?: number;
  approvedReady?: number;
  partialCases?: number;
  openDispatchUnits?: number;
  totalQueue?: number;
};

export default function StaffWarehouseFulfillmentRequestsPage() {
  const params = useParams();
  const branchId = String(params?.branchId ?? "");
  const toast = useToast();
  const { myAccess, refetch: refetchBranch } = useBranchContext(branchId);
  const caps = getWarehouseCapabilities(myAccess?.permissions ?? []);

  const [whId, setWhId] = useState<number | null>(null);
  const [items, setItems] = useState<FulfillmentRequestQueueRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [queueTab, setQueueTab] = useState<FulfillmentQueueTab>("all");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [statusExtra, setStatusExtra] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [urgency, setUrgency] = useState("");
  const [hasDispatch, setHasDispatch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [activeCardFilter, setActiveCardFilter] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search.trim()), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const branchOptions = useMemo(() => {
    const m = new Map<number, string>();
    for (const r of items) {
      const id = r.branch?.id;
      const name = r.branch?.name;
      if (id != null && name) m.set(id, name);
    }
    return [...m.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const effectiveStatus = useMemo(() => {
    if (statusExtra.trim()) return statusExtra.trim();
    return queueTabToStatusParam(queueTab);
  }, [queueTab, statusExtra]);

  const hasActiveFilters = useMemo(() => {
    return (
      queueTab !== "all" ||
      !!searchDebounced ||
      !!statusExtra.trim() ||
      !!branchFilter ||
      !!dateFrom ||
      !!dateTo ||
      !!urgency ||
      !!hasDispatch
    );
  }, [queueTab, searchDebounced, statusExtra, branchFilter, dateFrom, dateTo, urgency, hasDispatch]);

  const resolveWarehouseId = useCallback(async () => {
    if (!caps.hasAnyWarehouseAccess) {
      setWhId(null);
      return;
    }
    try {
      const list = await warehouseAccessible().catch(() => []);
      const first = Array.isArray(list) && list.length ? Number((list[0] as { id?: number })?.id) : null;
      setWhId(first && Number.isFinite(first) ? first : null);
    } catch {
      setWhId(null);
    }
  }, [caps.hasAnyWarehouseAccess]);

  useEffect(() => {
    void resolveWarehouseId();
  }, [resolveWarehouseId]);

  const loadSummary = useCallback(async (warehouseId: number) => {
    setSummaryLoading(true);
    try {
      const sum = (await warehouseOperationsSummary(warehouseId)) as { warehouseRequisitionBreakdown?: Breakdown | null };
      setBreakdown(sum?.warehouseRequisitionBreakdown ?? null);
    } catch {
      setBreakdown(null);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!whId) return;
    void loadSummary(whId);
  }, [whId, loadSummary]);

  const loadList = useCallback(async () => {
    if (!caps.hasAnyWarehouseAccess || !whId) {
      setLoading(false);
      setItems([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await warehouseOperationsRequisitions(whId, {
        page,
        limit: 25,
        q: searchDebounced || undefined,
        status: effectiveStatus,
        branchId: branchFilter ? Number(branchFilter) : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sortBy,
        sortDir,
        hasDispatch: hasDispatch === "true" || hasDispatch === "false" ? (hasDispatch as "true" | "false") : undefined,
        urgency: urgency || undefined,
      });
      setItems((Array.isArray(res.items) ? res.items : []) as FulfillmentRequestQueueRow[]);
      const p = res.pagination as { page?: number; limit?: number; total?: number; totalPages?: number } | undefined;
      setPagination({
        page: Number(p?.page ?? page),
        limit: Number(p?.limit ?? 25),
        total: Number(p?.total ?? 0),
        totalPages: Math.max(1, Number(p?.totalPages ?? 1)),
      });
    } catch (e: unknown) {
      setError(getMessageFromApiError(e instanceof Error ? e : new Error(String(e))));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [
    caps.hasAnyWarehouseAccess,
    whId,
    page,
    searchDebounced,
    effectiveStatus,
    branchFilter,
    dateFrom,
    dateTo,
    sortBy,
    sortDir,
    hasDispatch,
    urgency,
  ]);

  useEffect(() => {
    if (!whId) {
      setLoading(false);
      return;
    }
    void loadList();
  }, [whId, loadList]);

  const clearFilters = useCallback(() => {
    setQueueTab("all");
    setSearch("");
    setSearchDebounced("");
    setStatusExtra("");
    setBranchFilter("");
    setDateFrom("");
    setDateTo("");
    setUrgency("");
    setHasDispatch("");
    setSortBy("createdAt");
    setSortDir("desc");
    setPage(1);
    setActiveCardFilter(null);
  }, []);

  const onCardClick = useCallback((kind: "action" | "approved" | "partial" | "dispatch" | "all") => {
    setActiveCardFilter(kind);
    setStatusExtra("");
    setPage(1);
    if (kind === "all") setQueueTab("all");
    if (kind === "action") setQueueTab("action");
    if (kind === "approved") setQueueTab("approved");
    if (kind === "partial") setQueueTab("partial");
    if (kind === "dispatch") setQueueTab("dispatch");
  }, []);

  const exportCsv = useCallback(() => {
    if (!items.length) {
      toast.info("Nothing to export on this page.");
      return;
    }
    const headers = ["id", "status", "branch", "lines", "qty", "next", "createdAt"];
    const rows = items.map((r) => [
      r.id,
      r.status ?? "",
      r.branch?.name ?? "",
      String(r._meta?.lineCount ?? ""),
      String(r.items?.reduce((a, it) => a + Number(it.requestedQty ?? 0), 0) ?? ""),
      r.warehouseAction?.nextActionLabel ?? "",
      r.createdAt ?? "",
    ]);
    const body = [headers.join(","), ...rows.map((c) => c.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fulfillment-requests-${branchId}-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export started.");
  }, [items, branchId, page, toast]);

  const refreshAll = useCallback(() => {
    if (whId) void loadSummary(whId);
    void loadList();
    void refetchBranch?.();
  }, [whId, loadSummary, loadList, refetchBranch]);

  if (!caps.hasAnyWarehouseAccess) {
    return (
      <StaffBranchLayout branchId={branchId} requiredPermission={null}>
        <WarehouseAccessFallback
          branchId={branchId}
          title="Warehouse access required"
          message="Fulfillment requests are available when you have warehouse permissions."
        />
      </StaffBranchLayout>
    );
  }

  const filteredEmpty = !loading && !!whId && pagination.total === 0 && hasActiveFilters;
  const totallyEmpty = !loading && !!whId && pagination.total === 0 && !hasActiveFilters;

  return (
    <StaffBranchLayout branchId={branchId} requiredPermission={null}>
      <div className="container-fluid py-3 px-2 px-sm-3">
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
                <li className="breadcrumb-item active">Fulfillment requests</li>
              </ol>
            </nav>
            <h5 className="mb-2 fw-semibold">Fulfillment requests</h5>
            <p className="text-muted small mb-0">
              Central warehouse work queue — approvals, allocation, picking, and dispatch for branch stock requests.
              {whId ? <span className="ms-1">Warehouse #{whId}</span> : null}
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            {hasActiveFilters ? (
              <button type="button" className="btn btn-sm btn-outline-secondary radius-12" onClick={clearFilters}>
                Clear filters
              </button>
            ) : null}
            <button type="button" className="btn btn-sm btn-outline-secondary radius-12" onClick={() => exportCsv()}>
              Export CSV
            </button>
            <button type="button" className="btn btn-sm btn-outline-primary radius-12" onClick={() => refreshAll()}>
              <i className="ri-refresh-line me-1" />
              Refresh
            </button>
          </div>
        </div>

        <FulfillmentRequestSummaryCards
          loading={summaryLoading}
          breakdown={breakdown}
          onCardClick={onCardClick}
          activeFilter={activeCardFilter}
        />

        <FulfillmentRequestFilters
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          statusExtra={statusExtra}
          onStatusExtraChange={(v) => {
            setStatusExtra(v);
            setPage(1);
            setActiveCardFilter(null);
          }}
          branchId={branchFilter}
          onBranchIdChange={(v) => {
            setBranchFilter(v);
            setPage(1);
          }}
          branchOptions={branchOptions}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={(v) => {
            setDateFrom(v);
            setPage(1);
          }}
          onDateToChange={(v) => {
            setDateTo(v);
            setPage(1);
          }}
          urgency={urgency}
          onUrgencyChange={(v) => {
            setUrgency(v);
            setPage(1);
          }}
          hasDispatch={hasDispatch}
          onHasDispatchChange={(v) => {
            setHasDispatch(v);
            setPage(1);
          }}
          sortBy={sortBy}
          sortDir={sortDir}
          onSortChange={(sb, sd) => {
            setSortBy(sb);
            setSortDir(sd);
            setPage(1);
          }}
          queueTab={queueTab}
          onQueueTab={(t) => {
            setQueueTab(t);
            setStatusExtra("");
            setPage(1);
            setActiveCardFilter(t === "all" ? null : t);
          }}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {error ? (
          <div className="alert alert-danger radius-12 d-flex align-items-center justify-content-between" role="alert">
            <span>{error}</span>
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => void loadList()}>
              Retry
            </button>
          </div>
        ) : null}

        {!whId && !loading ? (
          <div className="alert alert-warning radius-12">No accessible warehouse linked to this account.</div>
        ) : null}

        {filteredEmpty ? (
          <FulfillmentRequestEmptyState filtered branchId={branchId} />
        ) : totallyEmpty ? (
          <FulfillmentRequestEmptyState filtered={false} branchId={branchId} />
        ) : (
          <FulfillmentRequestTable
            branchId={branchId}
            items={items}
            loading={loading}
            page={pagination.page}
            limit={pagination.limit}
            totalPages={pagination.totalPages}
            totalCount={pagination.total}
            onPageChange={(p) => setPage(p)}
            onCopyRequest={async (id) => {
              try {
                await navigator.clipboard.writeText(String(id));
                toast.success(`Copied #${id}`);
              } catch {
                toast.error("Could not copy");
              }
            }}
          />
        )}
      </div>
    </StaffBranchLayout>
  );
}
