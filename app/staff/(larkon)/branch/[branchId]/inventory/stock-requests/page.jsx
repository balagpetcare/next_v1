"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import LkFormGroup from "@larkon-ui/components/LkFormGroup";
import LkInput from "@larkon-ui/components/LkInput";
import LkSelect from "@larkon-ui/components/LkSelect";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffStockRequestCreatePath, staffStockRequestDetailPath } from "@/lib/staffInventoryRoutes";
import { staffStockRequestsList } from "@/lib/api";
import {
  computeStockRequestListKpis,
  formatStockRequestStatusLabel,
  getStockRequestIntentBadgeProps,
  stockRequestListCompletedAt,
  stockRequestMatchesLifecycleBucket,
  stockRequestNeedsAttention,
  stockRequestStatusBadgeClass,
} from "@/src/lib/stockRequestUi";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";

const REQUIRED_PERM = "inventory.read";
const LIST_LIMIT = 100;
const SR_BUCKET_PARAM = "srBucket";
const VALID_BUCKETS = ["attention", "progress", "received"];

const INTENT_OPTIONS = [
  { value: "", label: "All intents" },
  { value: "INTERNAL_TRANSFER", label: "Internal transfer" },
  { value: "PROCUREMENT", label: "Procurement" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "OWNER_REVIEW", label: "Owner review" },
  { value: "FULFILLED_PARTIAL", label: "Fulfilled (partial)" },
  { value: "FULFILLED_FULL", label: "Fulfilled (full)" },
  { value: "DISPATCHED", label: "Dispatched" },
  { value: "RECEIVED_PARTIAL", label: "Received (partial)" },
  { value: "RECEIVED_FULL", label: "Received (full)" },
  { value: "CLOSED", label: "Closed" },
  { value: "CANCELLED", label: "Cancelled" },
];

function formatListDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

function formatListTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function matchesSearch(row, qRaw) {
  const q = qRaw.trim().toLowerCase();
  if (!q) return true;
  if (String(row.id).includes(q)) return true;
  const name = (row.requester?.profile?.displayName || "").toLowerCase();
  if (name.includes(q)) return true;
  const note = (row.procurementNote || "").toLowerCase();
  if (note.includes(q)) return true;
  const items = row.items || [];
  return items.some((it) => {
    const n = (it.note || "").toLowerCase();
    const pn = (it.product?.name || "").toLowerCase();
    const sku = (it.variant?.sku || "").toLowerCase();
    const title = (it.variant?.title || "").toLowerCase();
    return n.includes(q) || pn.includes(q) || sku.includes(q) || title.includes(q);
  });
}

/**
 * Compact KPI: plain template card, thin border; active = primary border.
 * @param {{ label: string; value: number; onClick: () => void; active: boolean; ariaPressed?: boolean }} props
 */
function StatFilter({ label, value, onClick, active, ariaPressed }) {
  return (
    <button
      type="button"
      className={`card h-100 radius-12 text-start w-100 border bg-body p-0 ${active ? "border-primary" : ""}`}
      onClick={onClick}
      aria-pressed={ariaPressed}
    >
      <div className="card-body py-10 px-12">
        <div className="small text-muted mb-0">{label}</div>
        <div className="fw-semibold fs-6 mb-0 tabular-nums">{value}</div>
      </div>
    </button>
  );
}

export default function StaffBranchStockRequestsPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading, errorCode, hasViewPermission } = useBranchContext(branchId);

  const intentFromUrl = useMemo(
    () => String(searchParams.get("intent") || searchParams.get("requestIntent") || ""),
    [searchParams]
  );

  const bucketFromUrl = useMemo(() => {
    const raw = String(searchParams.get(SR_BUCKET_PARAM) || "");
    return VALID_BUCKETS.includes(raw) ? raw : "";
  }, [searchParams]);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [intentFilter, setIntentFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const permissions = myAccess?.permissions ?? [];
  const canRead = permissions.includes(REQUIRED_PERM);
  const canCreate = permissions.includes("inventory.update") || permissions.includes("inventory.transfer");
  const canReceive = permissions.includes("inventory.receive");

  useEffect(() => {
    if (errorCode === "unauthorized") router.replace("/staff/login");
  }, [errorCode, router]);

  useEffect(() => {
    setIntentFilter(intentFromUrl || "");
  }, [intentFromUrl]);

  useEffect(() => {
    if (bucketFromUrl) setStatusFilter("");
  }, [bucketFromUrl]);

  const pushIntentToUrl = useCallback(
    (nextIntent) => {
      const u = new URLSearchParams(searchParams.toString());
      if (nextIntent) u.set("intent", nextIntent);
      else {
        u.delete("intent");
        u.delete("requestIntent");
      }
      const qs = u.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const pushBucketToUrl = useCallback(
    (bucket) => {
      const u = new URLSearchParams(searchParams.toString());
      if (bucket && VALID_BUCKETS.includes(bucket)) u.set(SR_BUCKET_PARAM, bucket);
      else u.delete(SR_BUCKET_PARAM);
      const qs = u.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const apiStatus = useMemo(() => {
    if (bucketFromUrl && VALID_BUCKETS.includes(bucketFromUrl)) return undefined;
    return statusFilter || undefined;
  }, [bucketFromUrl, statusFilter]);

  useEffect(() => {
    if (!branchId || !canRead) return;
    let cancelled = false;
    setLoading(true);
    staffStockRequestsList({
      branchId,
      status: apiStatus,
      requestIntent: intentFilter || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      limit: LIST_LIMIT,
    })
      .then((r) => {
        if (!cancelled) setRequests(r.items ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Failed to load stock requests.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, canRead, apiStatus, intentFilter, dateFrom, dateTo]);

  const searchFiltered = useMemo(() => requests.filter((r) => matchesSearch(r, searchQuery)), [requests, searchQuery]);

  const kpis = useMemo(() => computeStockRequestListKpis(searchFiltered), [searchFiltered]);

  const tableRows = useMemo(() => {
    if (!bucketFromUrl || !VALID_BUCKETS.includes(bucketFromUrl)) return searchFiltered;
    return searchFiltered.filter((r) => stockRequestMatchesLifecycleBucket(r, bucketFromUrl));
  }, [searchFiltered, bucketFromUrl]);

  const resetFilters = useCallback(() => {
    setStatusFilter("");
    setIntentFilter("");
    setDateFrom("");
    setDateTo("");
    setSearchQuery("");
    pushIntentToUrl("");
    pushBucketToUrl("");
  }, [pushIntentToUrl, pushBucketToUrl]);

  const onIntentChange = useCallback(
    (e) => {
      const v = e.target.value;
      setIntentFilter(v);
      pushIntentToUrl(v);
    },
    [pushIntentToUrl]
  );

  const onStatusSelectChange = useCallback(
    (e) => {
      setStatusFilter(e.target.value);
      pushBucketToUrl("");
    },
    [pushBucketToUrl]
  );

  const kpiTotalActive = !bucketFromUrl && !statusFilter;
  const kpiAttentionActive = bucketFromUrl === "attention";
  const kpiProgressActive = bucketFromUrl === "progress";
  const kpiReceivedActive = bucketFromUrl === "received";
  const kpiCancelledActive = !bucketFromUrl && statusFilter === "CANCELLED";

  const onKpiTotal = useCallback(() => {
    setStatusFilter("");
    pushBucketToUrl("");
  }, [pushBucketToUrl]);

  const onKpiAttention = useCallback(() => {
    setStatusFilter("");
    pushBucketToUrl("attention");
  }, [pushBucketToUrl]);

  const onKpiProgress = useCallback(() => {
    setStatusFilter("");
    pushBucketToUrl("progress");
  }, [pushBucketToUrl]);

  const onKpiReceived = useCallback(() => {
    setStatusFilter("");
    pushBucketToUrl("received");
  }, [pushBucketToUrl]);

  const onKpiCancelled = useCallback(() => {
    setStatusFilter("CANCELLED");
    pushBucketToUrl("");
  }, [pushBucketToUrl]);

  const hasActiveFilters =
    Boolean(statusFilter) ||
    Boolean(intentFilter) ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    Boolean(searchQuery.trim()) ||
    Boolean(bucketFromUrl);

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" aria-label="Loading" />
        <p className="mt-16 text-secondary-light mb-0">Loading...</p>
      </div>
    );
  }
  if (errorCode === "forbidden" || !hasViewPermission || !canRead) {
    return (
      <AccessDenied
        missingPerm={REQUIRED_PERM}
        onBack={() => router.push(`/staff/branch/${branchId}`)}
      />
    );
  }

  const emptyApi = !loading && requests.length === 0;
  const emptyTable = !loading && tableRows.length === 0;
  const hadRowsBeforeClientFilter = requests.length > 0;
  const searchOnlyBlock =
    hadRowsBeforeClientFilter && searchFiltered.length === 0 && Boolean(searchQuery.trim());
  const bucketBlock =
    hadRowsBeforeClientFilter &&
    searchFiltered.length > 0 &&
    tableRows.length === 0 &&
    Boolean(bucketFromUrl);
  const serverFilterBlock =
    hadRowsBeforeClientFilter && searchFiltered.length > 0 && tableRows.length === 0 && !bucketFromUrl;

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />

      <nav aria-label="breadcrumb" className="mb-16">
        <ol className="breadcrumb mb-0 small">
          <li className="breadcrumb-item">
            <Link href="/staff">Staff</Link>
          </li>
          <li className="breadcrumb-item">
            <Link href="/staff/branch">Branches</Link>
          </li>
          <li className="breadcrumb-item">
            <Link href={`/staff/branch/${branchId}`}>{branch?.name || `Branch #${branchId}`}</Link>
          </li>
          <li className="breadcrumb-item">
            <Link href={`/staff/branch/${branchId}/inventory`}>Inventory</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Stock requests
          </li>
        </ol>
      </nav>

      <div className="d-flex flex-wrap align-items-center justify-content-between gap-12 mb-24">
        <div>
          <h5 className="mb-0">Stock requests</h5>
          <p className="text-muted small mb-0 mt-4">Replenishment and transfers for this branch.</p>
        </div>
        <div className="d-flex flex-wrap gap-8">
          {canReceive ? (
            <Link href={`/staff/branch/${branchId}/inventory/incoming`} className="btn btn-outline-secondary btn-sm radius-12">
              Incoming
            </Link>
          ) : null}
          {canCreate ? (
            <Link href={staffStockRequestCreatePath(branchId)} className="btn btn-primary btn-sm radius-12">
              New request
            </Link>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="alert alert-danger d-flex align-items-center justify-content-between mb-16 radius-12">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      ) : null}

      <Card>
        <p className="small text-muted mb-16 mb-md-12">
          Up to {LIST_LIMIT} newest rows (server filters). Search applies to the loaded page only.
        </p>
        <div className="row row-cols-2 row-cols-md-3 row-cols-xl-5 g-8 mb-16">
          <div className="col">
            <StatFilter
              label="Total"
              value={kpis.total}
              onClick={onKpiTotal}
              active={kpiTotalActive}
              ariaPressed={kpiTotalActive}
            />
          </div>
          <div className="col">
            <StatFilter
              label="Pending action"
              value={kpis.attention}
              onClick={onKpiAttention}
              active={kpiAttentionActive}
              ariaPressed={kpiAttentionActive}
            />
          </div>
          <div className="col">
            <StatFilter
              label="In progress"
              value={kpis.progress}
              onClick={onKpiProgress}
              active={kpiProgressActive}
              ariaPressed={kpiProgressActive}
            />
          </div>
          <div className="col">
            <StatFilter
              label="Received"
              value={kpis.received}
              onClick={onKpiReceived}
              active={kpiReceivedActive}
              ariaPressed={kpiReceivedActive}
            />
          </div>
          <div className="col">
            <StatFilter
              label="Cancelled"
              value={kpis.cancelled}
              onClick={onKpiCancelled}
              active={kpiCancelledActive}
              ariaPressed={kpiCancelledActive}
            />
          </div>
        </div>

        {bucketFromUrl ? (
          <div className="alert alert-primary py-8 px-12 small mb-16 radius-12 d-flex flex-wrap align-items-center justify-content-between gap-8">
            <span className="text-muted mb-0">
              {bucketFromUrl === "attention" && "Filter: needs branch action."}
              {bucketFromUrl === "progress" && "Filter: owner / warehouse pipeline."}
              {bucketFromUrl === "received" && "Filter: received or closed."}
              <span className="ms-8">Status uses “All” while this filter is on.</span>
            </span>
            <button type="button" className="btn btn-link btn-sm p-0" onClick={onKpiTotal}>
              Clear
            </button>
          </div>
        ) : null}

        <div className="border-bottom pb-16 mb-16">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-8 mb-12">
            <span className="small text-muted fw-medium">Filters</span>
            <button
              type="button"
              className="btn btn-link btn-sm p-0"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
            >
              Reset
            </button>
          </div>
          <div className="row g-12 align-items-end">
            <div className="col-12 col-md-6 col-lg-3">
              <LkFormGroup label="Status" className="mb-0 text-sm">
                <LkSelect
                  size="sm"
                  className="radius-12 w-100"
                  value={statusFilter}
                  onChange={onStatusSelectChange}
                  disabled={Boolean(bucketFromUrl)}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value || "all"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </LkSelect>
              </LkFormGroup>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <LkFormGroup label="Intent" className="mb-0 text-sm">
                <LkSelect size="sm" className="radius-12 w-100" value={intentFilter} onChange={onIntentChange}>
                  {INTENT_OPTIONS.map((o) => (
                    <option key={o.value || "all-int"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </LkSelect>
              </LkFormGroup>
            </div>
            <div className="col-6 col-md-4 col-lg-2">
              <LkFormGroup label="From" className="mb-0 text-sm">
                <input
                  type="date"
                  className="form-control form-control-sm radius-12"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </LkFormGroup>
            </div>
            <div className="col-6 col-md-4 col-lg-2">
              <LkFormGroup label="To" className="mb-0 text-sm">
                <input
                  type="date"
                  className="form-control form-control-sm radius-12"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </LkFormGroup>
            </div>
            <div className="col-12 col-lg-10">
              <LkFormGroup label="Search" className="mb-0 text-sm">
                <LkInput
                  type="search"
                  size="sm"
                  className="radius-12"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ID, requester, SKU…"
                  aria-label="Search loaded rows"
                />
              </LkFormGroup>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-40 text-center text-secondary-light">
            <div className="spinner-border text-primary mb-12" role="status" aria-label="Loading" />
            <div>Loading requests…</div>
          </div>
        ) : emptyTable ? (
          <div className="py-40 text-center text-secondary-light">
            {emptyApi && <div className="mb-8">No stock requests for these filters.</div>}
            {!emptyApi && searchOnlyBlock && <div className="mb-8">No search matches on this page.</div>}
            {!emptyApi && bucketBlock && <div className="mb-8">No rows in this segment.</div>}
            {!emptyApi && serverFilterBlock && <div className="mb-8">No rows match the current filters.</div>}
            {hasActiveFilters ? (
              <button type="button" className="btn btn-sm btn-outline-secondary radius-12" onClick={resetFilters}>
                Reset filters
              </button>
            ) : null}
            {canCreate && emptyApi ? (
              <div className="mt-12">
                <Link href={staffStockRequestCreatePath(branchId)} className="btn btn-primary btn-sm radius-12">
                  New request
                </Link>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm table-hover mb-0">
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Created</th>
                  <th scope="col">Finalized</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-end">
                    Qty
                  </th>
                  <th scope="col">Requester</th>
                  <th scope="col" className="text-end">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r) => {
                  const totalQty = (r.items || []).reduce((sum, item) => sum + (item.requestedQty || 0), 0);
                  const lineCount = r.items?.length ?? 0;
                  const intent = getStockRequestIntentBadgeProps(r);
                  const requesterName =
                    r.requester?.profile?.displayName ?? (r.requesterUserId ? `User #${r.requesterUserId}` : "—");
                  const detailHref = staffStockRequestDetailPath(branchId, r.id);
                  const statusLabel = formatStockRequestStatusLabel(r);
                  const completedAt = stockRequestListCompletedAt(r);
                  const attention = stockRequestNeedsAttention(r);
                  return (
                    <tr key={r.id}>
                      <td className="lh-sm">
                        <Link href={detailHref} className="fw-semibold text-decoration-none">
                          #{r.id}
                        </Link>
                        <div className="text-muted small text-truncate" style={{ maxWidth: "10rem" }} title={intent.label}>
                          {intent.label}
                        </div>
                      </td>
                      <td className="lh-sm text-nowrap">
                        <div>{formatListDate(r.createdAt)}</div>
                        <div className="text-muted small">{formatListTime(r.createdAt) || "—"}</div>
                      </td>
                      <td className="lh-sm text-nowrap">
                        {completedAt ? (
                          <>
                            <div>{formatListDate(completedAt)}</div>
                            <div className="text-muted small">{formatListTime(completedAt) || "—"}</div>
                          </>
                        ) : (
                          <>
                            <div className="text-muted">—</div>
                            <div className="text-muted small">Not finalized</div>
                          </>
                        )}
                      </td>
                      <td className="lh-sm">
                        <span
                          className={`badge ${stockRequestStatusBadgeClass(r)}`}
                          title={
                            r.derivedStatus && r.derivedStatus !== r.status ? `Stored: ${r.status}` : undefined
                          }
                        >
                          {statusLabel}
                        </span>
                        {attention ? <div className="text-muted small mt-4">Action due</div> : null}
                      </td>
                      <td className="lh-sm text-end tabular-nums">
                        <div className="fw-medium">{totalQty}</div>
                        <div className="text-muted small">{lineCount} lines</div>
                      </td>
                      <td className="lh-sm">
                        <div className="text-truncate" style={{ maxWidth: "12rem" }} title={requesterName}>
                          {requesterName}
                        </div>
                      </td>
                      <td className="text-end text-nowrap">
                        <Link href={detailHref} className="btn btn-sm btn-outline-primary">
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
