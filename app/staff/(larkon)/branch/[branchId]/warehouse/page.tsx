"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  warehouseAccessible,
  warehouseOperationsDashboard,
} from "@/lib/api";
import { useToast } from "@/src/hooks/useToast";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";
import { useBranchContext } from "@/lib/useBranchContext";
import StaffBranchLayout from "@/src/components/branch/StaffBranchLayout";
import {
  WarehouseStaffDashboardData,
  MyTaskItem,
  RequestQueueItem,
  TransferQueueItem,
  ReceivingQueueItem,
  DispatchQueueItem,
} from "@/types/warehouse-dashboard";
import {
  ConfirmActionModal,
  PaginationControls,
  PriorityBadge,
  QueueStatusBadge,
  SectionHeader,
  WarehouseEmptyState,
  WarehouseKpiCard,
} from "./_components/WarehouseStaffDashboardWidgets";
import WarehouseAccessFallback from "./_components/WarehouseAccessFallback";
import { getWarehouseCapabilities } from "@/src/lib/warehouseRbac";

function lowStockItemRowKey(row: any, index: number): string {
  const primary = row?.id ?? row?.stockLotId ?? row?.variantId ?? row?.variant?.id;
  if (primary != null && primary !== "") {
    return `${String(primary)}-${index}`;
  }
  return `${String(row?.variant?.sku || "item")}-${index}`;
}

function queueTableRowKey(activeQueue: string, row: any, index: number): string {
  const primary =
    row?.id ?? row?.taskId ?? row?.dispatchId ?? row?.transferId ?? row?.stockRequest?.id;
  if (primary != null && primary !== "") {
    return `${activeQueue}-${String(primary)}-${index}`;
  }
  return `${activeQueue}-row-${index}`;
}

function handoverNoteKey(note: any, index: number): string {
  return note?.id != null && note?.id !== "" ? `handover-${String(note.id)}-${index}` : `handover-${index}`;
}

function activityEventKey(event: any, index: number): string {
  return event?.id != null && event?.id !== "" ? `activity-${String(event.id)}-${index}` : `activity-${index}`;
}

export default function StaffWarehouseDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const branchId = String(params?.branchId ?? "");
  const deliveryTab = searchParams.get("tab") === "deliveries";
  const { branch, myAccess } = useBranchContext(branchId);
  const branchInfo = (branch ?? null) as any;

  const [warehouses, setWarehouses] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedWhId, setSelectedWhId] = useState<number | null>(null);
  const [dashboard, setDashboard] = useState<WarehouseStaffDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [activeQueue, setActiveQueue] = useState<"tasks" | "requests" | "transfers" | "receiving" | "dispatch">(
    deliveryTab ? "tasks" : "requests"
  );
  const [confirmAction, setConfirmAction] = useState<{ label: string; href: string } | null>(null);

  const whCtx = (branchInfo as { warehouseContext?: { linkedWarehouseCount?: number; userHasWarehouseAssignment?: boolean } } | null)
    ?.warehouseContext;
  const warehousePerms = useMemo(
    () =>
      getWarehouseCapabilities(Array.isArray(myAccess?.permissions) ? myAccess.permissions : [], {
        hasWarehouseStaffAssignmentForBranch: whCtx?.userHasWarehouseAssignment === true,
      }),
    [myAccess?.permissions, whCtx?.userHasWarehouseAssignment]
  );

  // Auth / branch access via StaffBranchLayout (default: no in-page sidebar; Larkon shell owns branch nav).

  useEffect(() => {
    if (!warehousePerms.hasAnyWarehouseAccess) {
      setWarehouses([]);
      setSelectedWhId(null);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await warehouseAccessible().catch(() => []);
        if (cancelled) return;
        const normalized = (Array.isArray(list) ? list : [])
          .map((row: any) => ({ id: Number(row?.id), name: String(row?.name || `Warehouse #${row?.id || ""}`) }))
          .filter((row: any) => Number.isFinite(row.id) && row.id > 0);
        setWarehouses(normalized);
        const firstId = normalized[0]?.id ? Number(normalized[0].id) : null;
        setSelectedWhId((prev) => prev ?? firstId);
      } catch (e: any) {
        if (!cancelled) {
          const msg = e?.message || "Failed to load warehouse access";
          setError(msg);
          toast.error(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [branchId, toast, warehousePerms.hasAnyWarehouseAccess]);

  useEffect(() => {
    if (!warehousePerms.canViewDashboard) {
      setDashboard(null);
      return;
    }
    if (!selectedWhId) {
      setDashboard(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const dash = await warehouseOperationsDashboard(selectedWhId, {
          page,
          limitPerQueue: 10,
          q: query || undefined,
          sortBy,
          sortDir,
        });
        if (!cancelled) setDashboard(dash);
      } catch (e: any) {
        if (!cancelled) {
          const message = getMessageFromApiError(e);
          setError(message);
          setDashboard(null);
          toast.error(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedWhId, page, query, sortBy, sortDir, toast, warehousePerms.canViewDashboard]);

  const queueItems = useMemo(() => {
    if (!dashboard?.queues) return { items: [] as unknown[], total: 0, page: 1, pageSize: 10 };
    if (activeQueue === "tasks") return dashboard.queues.myTasks || { items: [] as MyTaskItem[], total: 0, page: 1, pageSize: 10 };
    if (activeQueue === "requests") return dashboard.queues.pendingRequests || { items: [] as RequestQueueItem[], total: 0, page: 1, pageSize: 10 };
    if (activeQueue === "transfers") return dashboard.queues.transferQueue || { items: [] as TransferQueueItem[], total: 0, page: 1, pageSize: 10 };
    if (activeQueue === "receiving") return dashboard.queues.receivingQueue || { items: [] as ReceivingQueueItem[], total: 0, page: 1, pageSize: 10 };
    return dashboard.queues.dispatchQueue || { items: [] as DispatchQueueItem[], total: 0, page: 1, pageSize: 10 };
  }, [dashboard, activeQueue]);

  const queueTableHeaders = useMemo(() => {
    if (activeQueue === "tasks") return ["Task", "Route", "Items", "Priority", "Status", "Action"];
    if (activeQueue === "requests") return ["Request", "Branch", "Status", "Lines", "Dispatches", "Action"];
    if (activeQueue === "transfers") return ["Transfer", "From", "To", "Lines", "Status", "Action"];
    if (activeQueue === "receiving") return ["GRN", "Location", "Status", "Lines", "Vendor", "Action"];
    return ["Dispatch", "To", "Status", "Lines", "Request", "Action"];
  }, [activeQueue]);

  const queueRows = useMemo(() => {
    const rows = Array.isArray(queueItems?.items) ? queueItems.items : [];
    return rows;
  }, [queueItems]);

  const quickActions = useMemo(() => {
    const actions = Array.isArray(dashboard?.quickActions) ? dashboard.quickActions : [];
    return actions.filter((x: { allowed: boolean; href: string | null }) => x.allowed && x.href);
  }, [dashboard?.quickActions]);

  // Check warehouse permissions for content access
  if (!warehousePerms.hasAnyWarehouseAccess) {
    return (
      <StaffBranchLayout branchId={branchId} requiredPermission={null}>
        <WarehouseAccessFallback
          branchId={branchId}
          title="Warehouse workspace is available, but no feature permission is assigned"
          message="Your sidebar remains visible so you can discover warehouse modules. Ask a manager to grant warehouse access."
        />
      </StaffBranchLayout>
    );
  }

  if (loading) {
    return (
      <StaffBranchLayout branchId={branchId} requiredPermission={null}>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2 text-muted">Loading warehouse dashboard…</p>
        </div>
      </StaffBranchLayout>
    );
  }

  return (
    <StaffBranchLayout branchId={branchId} requiredPermission={null}>
      {/* Page title + breadcrumb */}
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
        <div>
          <nav aria-label="breadcrumb" className="mb-2">
            <ol className="breadcrumb mb-0 small">
              <li className="breadcrumb-item"><Link href="/staff">Staff</Link></li>
              <li className="breadcrumb-item"><Link href="/staff/branch">Branches</Link></li>
              <li className="breadcrumb-item"><Link href={`/staff/branch/${branchId}`}>Branch #{branchId}</Link></li>
              <li className="breadcrumb-item active">Warehouse</li>
            </ol>
          </nav>
          <h5 className="mb-1 fw-semibold">Warehouse Operations Dashboard</h5>
          <p className="text-muted small mb-0">
            {dashboard?.userContext?.roleLabel || "Warehouse Staff"}
            {dashboard?.branchContext?.branchType ? ` • ${dashboard.branchContext.branchType}` : ""}
          </p>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <span className="badge bg-light text-dark border">{branchInfo?.name || `Branch #${branchId}`}</span>
          {warehouses.length > 0 && (
            <select
              className="form-select form-select-sm"
              style={{ minWidth: 180 }}
              value={selectedWhId ?? ""}
              onChange={(e) => setSelectedWhId(Number(e.target.value) || null)}
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} (#{w.id})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Search and actions */}
      <div className="d-flex flex-wrap gap-2 mb-3">
        <input
          className="form-control form-control-sm"
          style={{ minWidth: 220 }}
          placeholder="Search SKU / barcode / batch / request / transfer"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setPage(1);
              setQuery(searchText.trim());
            }
          }}
        />
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary radius-12"
          onClick={() => {
            setPage(1);
            setQuery(searchText.trim());
          }}
        >
          Search
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary radius-12"
          onClick={() => {
            setSearchText("");
            setQuery("");
            setPage(1);
          }}
        >
          Clear
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-primary radius-12"
          onClick={() => {
            setPage(1);
            setQuery(searchText.trim());
            toast.success("Dashboard refreshed");
          }}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-danger radius-12 d-flex align-items-center justify-content-between mb-3">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {warehouses.length === 0 && !error && (
        <div className="alert alert-info radius-12 mb-3">
          {(whCtx?.linkedWarehouseCount ?? 0) > 0
            ? "Warehouses exist for this branch, but none are visible to your account yet. Try refreshing; if this persists, ask an org admin to confirm your warehouse assignment."
            : "No warehouse is linked to this branch yet. Ask an org owner to create or link a warehouse record for this location."}
        </div>
      )}

      {warehousePerms.canViewDashboard && selectedWhId && dashboard && (
        <>
          <div className="row g-3 mb-3">
            <div className="col-6 col-md-4 col-xl-2">
              <WarehouseKpiCard title="Locations" value={dashboard?.kpis?.totalLocations ?? 0} icon="ri-map-pin-line" tone="primary" />
            </div>
            <div className="col-6 col-md-4 col-xl-2">
              <WarehouseKpiCard title="My Tasks" value={dashboard?.kpis?.myOpenTasks ?? 0} icon="ri-task-line" tone="info" />
            </div>
            <div className="col-6 col-md-4 col-xl-2">
              <WarehouseKpiCard title="Stock Requests" value={dashboard?.kpis?.pendingStockRequests ?? 0} icon="ri-file-list-3-line" tone="warning" />
            </div>
            <div className="col-6 col-md-4 col-xl-2">
              <WarehouseKpiCard title="Transfer Queue" value={dashboard?.kpis?.transferQueue ?? 0} icon="ri-swap-line" tone="secondary" />
            </div>
            <div className="col-6 col-md-4 col-xl-2">
              <WarehouseKpiCard title="Receiving Queue" value={dashboard?.kpis?.receivingQueue ?? 0} icon="ri-download-cloud-2-line" tone="success" />
            </div>
            <div className="col-6 col-md-4 col-xl-2">
              <WarehouseKpiCard title="Dispatch Queue" value={dashboard?.kpis?.dispatchQueue ?? 0} icon="ri-truck-line" tone="danger" />
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-12 col-xl-8">
              <div className="card border h-100">
                <SectionHeader
                  title="Quick Actions"
                  right={<QueueStatusBadge label={dashboard?.userContext?.roleLabel || "Staff"} tone="primary" />}
                />
                <div className="card-body">
                  {quickActions.length === 0 ? (
                    <WarehouseEmptyState
                      title="No quick actions available"
                      description="Your current role does not have quick action permissions for this warehouse."
                    />
                  ) : (
                    <div className="d-flex flex-wrap gap-2">
                      {quickActions.map((action: any, actionIndex: number) => (
                        <button
                          key={action.key != null && action.key !== "" ? `${String(action.key)}-${actionIndex}` : `qa-${actionIndex}`}
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => setConfirmAction({ label: action.label, href: action.href })}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="col-12 col-xl-4">
              <div className="card border h-100">
                <SectionHeader title="Alerts" count={Array.isArray(dashboard?.alerts) ? dashboard.alerts.length : 0} />
                <div className="card-body p-0">
                  {Array.isArray(dashboard?.alerts) && dashboard.alerts.length > 0 ? (
                    <ul className="list-group list-group-flush">
                      {dashboard.alerts.map((alert: any, alertIndex: number) => (
                        <li
                          key={
                            alert.key != null && alert.key !== ""
                              ? `alert-${String(alert.key)}-${alertIndex}`
                              : `alert-${alertIndex}`
                          }
                          className="list-group-item d-flex align-items-center justify-content-between"
                        >
                          <div>
                            <div className="fw-medium">{alert.label}</div>
                            <small className="text-muted text-capitalize">{alert.severity}</small>
                          </div>
                          <PriorityBadge priority={alert.severity} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <WarehouseEmptyState title="No active alerts" description="Alert queues are currently clear." />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-12 col-xl-8">
              <div className="card border">
                <SectionHeader
                  title="Queue Explorer"
                  count={Number(queueItems?.total || 0)}
                  right={
                    <select
                      className="form-select form-select-sm"
                      value={activeQueue}
                      onChange={(e) => {
                        setActiveQueue(e.target.value as any);
                        setPage(1);
                      }}
                    >
                      <option value="tasks">My Tasks</option>
                      <option value="requests">Pending Requests</option>
                      <option value="transfers">Transfer Queue</option>
                      <option value="receiving">Receiving Queue</option>
                      <option value="dispatch">Dispatch Queue</option>
                    </select>
                  }
                />
                <div className="card-body p-0">
                  {queueRows.length === 0 ? (
                    <WarehouseEmptyState
                      title="Queue is empty"
                      description="There are no records for the selected queue and filters."
                      actionHref={`/staff/branch/${branchId}/warehouse/operations${selectedWhId ? `?wh=${selectedWhId}` : ""}`}
                      actionLabel="Open Operations Hub"
                    />
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm table-hover mb-0">
                        <thead className="table-light">
                          <tr>
                            {queueTableHeaders.map((header) => (
                              <th key={header}>{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {queueRows.map((row: any, rowIndex: number) => (
                            <tr key={queueTableRowKey(activeQueue, row, rowIndex)}>
                              {activeQueue === "tasks" ? (
                                <>
                                  <td>
                                    <div className="fw-medium">{row.title || `Task #${row.id}`}</div>
                                    <small className="text-muted">{row.reference || "Delivery task"}</small>
                                  </td>
                                  <td className="small">{row.from && row.to ? `${row.from} → ${row.to}` : "—"}</td>
                                  <td>{row.itemCount ?? "—"}</td>
                                  <td>
                                    <PriorityBadge priority={row.priority || "low"} />
                                  </td>
                                  <td>
                                    <QueueStatusBadge label={String(row.status || "ASSIGNED")} tone={statusTone(row.status)} />
                                  </td>
                                  <td>
                                    {row.href ? (
                                      <Link href={row.href} className="btn btn-sm btn-outline-primary">
                                        Open
                                      </Link>
                                    ) : "—"}
                                  </td>
                                </>
                              ) : activeQueue === "requests" ? (
                                <>
                                  <td>#{row.id}</td>
                                  <td>{row.branch?.name || "—"}</td>
                                  <td><QueueStatusBadge label={String(row.status || "DRAFT")} tone={statusTone(row.status)} /></td>
                                  <td>{row._meta?.lineCount ?? row.items?.length ?? 0}</td>
                                  <td>{row._meta?.dispatchCount ?? row.dispatches?.length ?? 0}</td>
                                  <td>
                                    <Link href={`/staff/branch/${branchId}/inventory/stock-requests`} className="btn btn-sm btn-outline-secondary">
                                      Open
                                    </Link>
                                  </td>
                                </>
                              ) : activeQueue === "transfers" ? (
                                <>
                                  <td>#{row.id}</td>
                                  <td>{row.fromLocation || "—"}</td>
                                  <td>{row.toLocation || "—"}</td>
                                  <td>{row.lineCount ?? 0}</td>
                                  <td><QueueStatusBadge label={String(row.status || "DRAFT")} tone={statusTone(row.status)} /></td>
                                  <td>
                                    <Link href={`/staff/branch/${branchId}/warehouse/operations${selectedWhId ? `?wh=${selectedWhId}` : ""}`} className="btn btn-sm btn-outline-secondary">
                                      Open
                                    </Link>
                                  </td>
                                </>
                              ) : activeQueue === "receiving" ? (
                                <>
                                  <td>#{row.id}</td>
                                  <td>{row.location?.name || row.locationName || "—"}</td>
                                  <td><QueueStatusBadge label={String(row.status || "DRAFT")} tone={statusTone(row.status)} /></td>
                                  <td>{row.lines?.length ?? 0}</td>
                                  <td>{row.vendor?.name || "—"}</td>
                                  <td>
                                    <Link href={`/staff/branch/${branchId}/inventory/receive`} className="btn btn-sm btn-outline-primary">
                                      Receive
                                    </Link>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td>#{row.id}</td>
                                  <td>{row.toLocation?.name || row.toLocation || "—"}</td>
                                  <td><QueueStatusBadge label={String(row.status || "CREATED")} tone={statusTone(row.status)} /></td>
                                  <td>{row.items?.length ?? 0}</td>
                                  <td>{row.stockRequest?.id ? `#${row.stockRequest.id}` : "—"}</td>
                                  <td>
                                    <Link href={`/staff/branch/${branchId}/warehouse?tab=deliveries`} className="btn btn-sm btn-outline-primary">
                                      Dispatch
                                    </Link>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <PaginationControls
                  page={page}
                  pageSize={Number(queueItems?.pageSize || 10)}
                  total={Number(queueItems?.total || 0)}
                  onChange={(nextPage) => setPage(nextPage)}
                />
              </div>
            </div>
            <div className="col-12 col-xl-4">
              <div className="card border mb-3">
                <SectionHeader title="Inventory Health" />
                <div className="card-body">
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    <span className="badge bg-warning text-dark">Near expiry: {dashboard?.inventoryHealth?.nearExpiryCount ?? 0}</span>
                    <span className="badge bg-danger">Expired: {dashboard?.inventoryHealth?.expiredCount ?? 0}</span>
                    <span className="badge bg-secondary">Hold stock: {dashboard?.inventoryHealth?.quarantineOnHand ?? 0}</span>
                    <span className="badge bg-info text-dark">Write-offs 30d: {dashboard?.inventoryHealth?.writeOffsLast30d ?? 0}</span>
                  </div>
                  {Array.isArray(dashboard?.inventoryHealth?.lowStockItems) && dashboard.inventoryHealth.lowStockItems.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-sm mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>SKU</th>
                            <th>Product</th>
                            <th>Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboard.inventoryHealth.lowStockItems.slice(0, 6).map((row: any, rowIndex: number) => (
                            <tr key={lowStockItemRowKey(row, rowIndex)}>
                              <td className="small">{row.variant?.sku || "—"}</td>
                              <td className="small">{row.variant?.title || "—"}</td>
                              <td>{row.onHandQty}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <WarehouseEmptyState title="No low stock rows" description="Low stock thresholds are currently healthy." />
                  )}
                </div>
              </div>
              <div className="card border">
                <SectionHeader title="Shift Handover Notes" />
                <div className="card-body p-0">
                  {Array.isArray(dashboard?.shiftHandoverNotes) && dashboard.shiftHandoverNotes.length > 0 ? (
                    <ul className="list-group list-group-flush">
                      {dashboard.shiftHandoverNotes.map((note: any, noteIndex: number) => (
                        <li key={handoverNoteKey(note, noteIndex)} className="list-group-item">
                          <div className="fw-medium">{note.action}</div>
                          <small className="text-muted">{new Date(note.createdAt).toLocaleString()} • {note.actorName}</small>
                          {note.note ? <div className="small mt-1">{note.note}</div> : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <WarehouseEmptyState title="No handover notes" description="Shift handover logs will appear here." />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-12 col-xl-7">
              <div className="card border">
                <SectionHeader title="Activity Timeline" count={Array.isArray(dashboard?.activityTimeline) ? dashboard.activityTimeline.length : 0} />
                <div className="card-body p-0">
                  {Array.isArray(dashboard?.activityTimeline) && dashboard.activityTimeline.length > 0 ? (
                    <ul className="list-group list-group-flush">
                      {dashboard.activityTimeline.slice(0, 15).map((event: any, eventIndex: number) => (
                        <li key={activityEventKey(event, eventIndex)} className="list-group-item">
                          <div className="d-flex align-items-center justify-content-between">
                            <div>
                              <div className="fw-medium">{event.action}</div>
                              <small className="text-muted">{event.category}</small>
                            </div>
                            <small className="text-muted">{new Date(event.timestamp).toLocaleString()}</small>
                          </div>
                          <small className="text-muted">By {event.actorName}</small>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <WarehouseEmptyState title="No recent activity" description="Operational activity will appear here." />
                  )}
                </div>
              </div>
            </div>
            <div className="col-12 col-xl-5">
              <div className="card border">
                <SectionHeader title="Search Results" count={query ? 1 : 0} />
                <div className="card-body">
                  {query ? (
                    <>
                      <div className="mb-2 small text-muted">Showing matches for "{query}"</div>
                      <div className="d-flex flex-column gap-2">
                        <ResultLine label="Products" count={dashboard?.searchResults?.products?.length ?? 0} />
                        <ResultLine label="Batches" count={dashboard?.searchResults?.batches?.length ?? 0} />
                        <ResultLine label="Locations" count={dashboard?.searchResults?.locations?.length ?? 0} />
                        <ResultLine label="Requests" count={dashboard?.searchResults?.requests?.length ?? 0} />
                        <ResultLine label="Transfers" count={dashboard?.searchResults?.transfers?.length ?? 0} />
                      </div>
                    </>
                  ) : (
                    <WarehouseEmptyState
                      title="Search warehouse entities"
                      description="Search by product, SKU, barcode, batch, location, request ID, or transfer ID."
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {!warehousePerms.canViewDashboard && (
        <WarehouseAccessFallback
          branchId={branchId}
          title="Dashboard permission required"
          message="You have some warehouse permissions, but not dashboard visibility. Use sidebar features you can access or request dashboard access."
        />
      )}

      <ConfirmActionModal
        open={!!confirmAction}
        title="Confirm action"
        body={confirmAction ? `Do you want to open "${confirmAction.label}"?` : ""}
        confirmLabel="Continue"
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          if (confirmAction?.href) {
            router.push(confirmAction.href);
          }
          setConfirmAction(null);
        }}
      />
    </StaffBranchLayout>
  );
}

function statusTone(s: string): "success" | "warning" | "danger" | "primary" | "secondary" | "info" {
  const u = (s || "").toUpperCase();
  if (["ASSIGNED", "SUBMITTED", "OWNER_REVIEW", "PICKING"].includes(u)) return "info";
  if (["EN_ROUTE", "PACKED", "IN_TRANSIT", "APPROVED"].includes(u)) return "warning";
  if (["COMPLETED", "RECEIVED", "FULFILLED_FULL"].includes(u)) return "success";
  if (["FAILED", "REJECTED", "CANCELLED"].includes(u)) return "danger";
  if (["ARRIVED", "CREATED", "DRAFT"].includes(u)) return "primary";
  return "secondary";
}

function ResultLine({ label, count }: { label: string; count: number }) {
  return (
    <div className="d-flex align-items-center justify-content-between border rounded px-2 py-1">
      <span className="small">{label}</span>
      <span className="badge bg-light text-dark">{count}</span>
    </div>
  );
}
