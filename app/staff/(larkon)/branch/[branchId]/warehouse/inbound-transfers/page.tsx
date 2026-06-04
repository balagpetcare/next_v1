"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { dispatchPrintUrl, staffInboundQueue } from "@/lib/api";
import { useBranchContext } from "@/lib/useBranchContext";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import Card from "@/src/bpa/components/ui/Card";
import { isWarehouseHubBranch } from "@/src/lib/branchSidebarConfig";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";
import {
  staffBranchPickerPath,
  staffDispatchPrintPath,
  staffDispatchReceiveWorkspacePath,
  staffIncomingShipmentsPath,
  staffInboundTransfersPath,
  staffLegacyTransfersIncomingPath,
  staffReceiveCenterPath,
  staffStockRequestDetailPath,
  staffStockRequestListPath,
  staffWarehouseDashboardPath,
  staffWarehouseReceivePoPath,
} from "@/lib/staffInventoryRoutes";
import {
  canReceiveStockAtBranch,
  canSeeDispatchPrintMenu,
  canViewInboundTransfersQueue,
  dispatchStatusBadgeClass,
  formatInboundTimestamp,
  inboundDispatchPrimaryLabel,
  nextReceiveActionHint,
  receiveSessionStatusBadgeClass,
  receiveSessionStatusLabel,
} from "@/lib/inboundTransfersUi";

type InboundRow = {
  kind: "DISPATCH" | "TRANSFER";
  inboundId: number;
  status: string;
  fromLocation: { id: number; name: string };
  toLocation: { id: number; name: string; branchId: number };
  quantitiesExpected: number;
  quantitiesReceived: number;
  lineCount?: number;
  linkedStockRequestId: number | null;
  effectiveStatus?: string;
  effectiveStatusDisplay?: { label: string; color?: string };
  dispatchReceiveSession: { id: number; status: string; submittedAt?: string | null; confirmedAt?: string | null } | null;
  nextReceiveAction: string;
  createdAt?: string;
};

const KPI_LABEL_CLASS = "text-muted text-uppercase small mb-8";
const KPI_LABEL_STYLE = { fontSize: "0.65rem", letterSpacing: "0.04em" } as const;

function InboundKpiCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: number;
  valueClassName?: string;
}) {
  return (
    <div className="col-6 col-md-3">
      <Card className="h-100 mb-0">
        <div className={KPI_LABEL_CLASS} style={KPI_LABEL_STYLE}>
          {label}
        </div>
        <div className={`fs-4 fw-semibold ${valueClassName ?? ""}`.trim()}>{value}</div>
      </Card>
    </div>
  );
}

export default function StaffWarehouseInboundTransfersPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = String(params?.branchId ?? "");
  const { branch, myAccess, isLoading: ctxLoading, errorCode, hasViewPermission } = useBranchContext(branchId);
  const [rows, setRows] = useState<InboundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"ALL" | "DISPATCH" | "TRANSFER">("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const permissions = myAccess?.permissions ?? [];
  const isHub = useMemo(() => isWarehouseHubBranch(branch as { types?: unknown[]; type?: string }), [branch]);
  const canViewQueue = useMemo(() => canViewInboundTransfersQueue(permissions, isHub), [permissions, isHub]);
  const canReceive = useMemo(() => canReceiveStockAtBranch(permissions), [permissions]);
  const canPrint = useMemo(() => canSeeDispatchPrintMenu(permissions), [permissions]);

  const load = useCallback(async () => {
    if (!branchId || !canViewQueue) return;
    setLoading(true);
    setError("");
    try {
      const data = await staffInboundQueue(branchId);
      setRows((data || []) as InboundRow[]);
    } catch (e: unknown) {
      const msg = getMessageFromApiError(e);
      setError(msg === "Forbidden" || msg === "403" ? "You do not have access to this branch inbound queue." : msg);
    } finally {
      setLoading(false);
    }
  }, [branchId, canViewQueue]);

  useEffect(() => {
    if (errorCode === "unauthorized") router.replace("/staff/login");
  }, [errorCode, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (kindFilter !== "ALL" && r.kind !== kindFilter) return false;
      if (statusFilter !== "ALL" && String(r.status) !== statusFilter) return false;
      if (!q) return true;
      const idMatch = String(r.inboundId).includes(q);
      const sr = r.linkedStockRequestId != null ? String(r.linkedStockRequestId) : "";
      const from = (r.fromLocation?.name ?? "").toLowerCase();
      const to = (r.toLocation?.name ?? "").toLowerCase();
      return idMatch || sr.includes(q) || from.includes(q) || to.includes(q);
    });
  }, [rows, search, kindFilter, statusFilter]);

  const statusOptions = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => s.add(String(r.status)));
    return Array.from(s).sort();
  }, [rows]);

  const kpis = useMemo(() => {
    let inTransit = 0;
    let awaitingManager = 0;
    let openReceive = 0;
    for (const r of filteredRows) {
      if (r.status === "IN_TRANSIT") inTransit += 1;
      if (r.dispatchReceiveSession?.status === "AWAITING_CONFIRMATION") awaitingManager += 1;
      if (r.kind === "DISPATCH" && r.nextReceiveAction !== "COMPLETED") openReceive += 1;
      if (r.kind === "TRANSFER") openReceive += 1;
    }
    return { total: filteredRows.length, inTransit, awaitingManager, openReceive };
  }, [filteredRows]);

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light small">Loading branch…</p>
      </div>
    );
  }

  if (errorCode === "forbidden" || !hasViewPermission) {
    return (
      <AccessDenied
        title="Branch access required"
        message="You cannot open this branch, or your membership is not active. Pick another branch or contact an administrator."
        onBack={() => router.push(staffBranchPickerPath())}
      />
    );
  }

  if (!canViewQueue) {
    return (
      <AccessDenied
        title="Inbound transfers unavailable"
        message="Your role does not include inbound visibility for this branch. Typical grants: inventory read, inbound read, dispatch view, or warehouse access at a hub branch."
        onBack={() => router.push(staffWarehouseDashboardPath(branchId))}
      />
    );
  }

  const dispatchHref = (r: InboundRow) => staffDispatchReceiveWorkspacePath(branchId, r.inboundId, { from: "inbound" });

  const legacyHref = () => staffLegacyTransfersIncomingPath(branchId);

  const primaryHref = (r: InboundRow) => (r.kind === "DISPATCH" ? dispatchHref(r) : legacyHref());

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />

      <nav aria-label="breadcrumb" className="mb-16">
        <ol className="breadcrumb mb-0 small">
          <li className="breadcrumb-item">
            <Link href={staffWarehouseDashboardPath(branchId)}>Warehouse</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Inbound transfers
          </li>
        </ol>
      </nav>

      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-24">
        <div>
          <h5 className="mb-8">Inbound to branch</h5>
          <p className="text-muted small mb-0">
            Stock dispatches and legacy transfers where this branch is the <strong>destination</strong>. Vendor receipts stay on{" "}
            <Link href={staffWarehouseReceivePoPath(branchId)}>Receive PO</Link>.
            {isHub ? (
              <span className="d-block mt-1">
                Warehouse hub — includes shipments addressed to this hub location.
              </span>
            ) : null}
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Link href={staffReceiveCenterPath(branchId)} className="btn btn-outline-secondary btn-sm">
            Receive center
          </Link>
          <Link href={staffIncomingShipmentsPath(branchId)} className="btn btn-outline-secondary btn-sm">
            Incoming list
          </Link>
          <Link href={staffWarehouseReceivePoPath(branchId)} className="btn btn-outline-dark btn-sm">
            Vendor / PO receive
          </Link>
          <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => void load()} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {!canReceive ? (
        <div className="alert alert-light border mb-24" role="status">
          <strong>View only.</strong> You can track inbound shipments and open dispatch details. To post receipts or save receive drafts, your role needs{" "}
          <span className="text-body">Receive stock</span> (<code className="small">inventory.receive</code> or <code className="small">inbound.receive</code>).
        </div>
      ) : null}

      <div className="row g-16 mb-24">
        <InboundKpiCard label="Rows in table" value={kpis.total} />
        <InboundKpiCard label="In transit" value={kpis.inTransit} valueClassName="text-info" />
        <InboundKpiCard label="Awaiting manager" value={kpis.awaitingManager} valueClassName="text-warning" />
        <InboundKpiCard label="Open items" value={kpis.openReceive} />
      </div>

      <Card title="Filters" className="mb-24">
        <div className="row g-12 align-items-end">
          <div className="col-12 col-md-4">
            <label className="form-label small text-muted mb-4">Search</label>
            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="Dispatch #, stock request #, location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search inbound rows"
            />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label small text-muted mb-4">Type</label>
            <select
              className="form-select form-select-sm"
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value as typeof kindFilter)}
            >
              <option value="ALL">All types</option>
              <option value="DISPATCH">Dispatch</option>
              <option value="TRANSFER">Legacy transfer</option>
            </select>
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label small text-muted mb-4">Shipment status</label>
            <select className="form-select form-select-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All statuses</option>
              {statusOptions.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary w-100"
              onClick={() => {
                setSearch("");
                setKindFilter("ALL");
                setStatusFilter("ALL");
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </Card>

      {error ? (
        <div className="alert alert-danger d-flex align-items-center justify-content-between mb-16" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="text-center py-40">
          <div className="spinner-border text-primary" role="status" />
          <p className="text-muted small mt-12 mb-0">Loading inbound queue…</p>
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <p className="text-secondary-light mb-8">Nothing is queued for inbound receiving at this branch.</p>
          <p className="small text-muted mb-0">
            When a warehouse dispatches stock to you, it appears here. You can also use the{" "}
            <Link href={staffReceiveCenterPath(branchId)}>Receive center</Link> or{" "}
            <Link href={staffStockRequestListPath(branchId)}>stock requests</Link> list.
          </p>
        </Card>
      ) : filteredRows.length === 0 ? (
        <Card>
          <p className="text-secondary-light mb-0">No rows match your filters. Try resetting filters or widening search.</p>
        </Card>
      ) : (
        <div className="table-responsive border rounded-2 bg-white">
          <table className="table table-hover table-sm align-middle mb-0">
            <caption className="py-12 px-16 text-muted small text-start border-bottom mb-0">
              Inbound queue for this branch (filtered).
            </caption>
            <thead className="table-light text-muted small">
              <tr>
                <th>Reference</th>
                <th>Route</th>
                <th>Status</th>
                <th className="text-end">Qty</th>
                <th>Stock request</th>
                <th>Session</th>
                <th>Next step</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => {
                const isDispatchDone = r.kind === "DISPATCH" && r.nextReceiveAction === "COMPLETED";
                const ctaLabel =
                  r.kind === "TRANSFER"
                    ? "Open transfers"
                    : !canReceive || isDispatchDone
                      ? "View dispatch"
                      : inboundDispatchPrimaryLabel(r, canReceive);
                const partial = r.quantitiesExpected > 0 && r.quantitiesReceived > 0 && r.quantitiesReceived < r.quantitiesExpected;
                return (
                  <tr key={`${r.kind}-${r.inboundId}`}>
                    <td>
                      <div className="d-flex flex-column gap-4">
                        <span className={`badge ${r.kind === "DISPATCH" ? "bg-primary" : "bg-secondary"} align-self-start`}>
                          {r.kind === "DISPATCH" ? "Dispatch" : "Transfer"}
                        </span>
                        <span className="fw-semibold">#{r.inboundId}</span>
                        <span className="text-muted small">{formatInboundTimestamp(r.createdAt)}</span>
                        {typeof r.lineCount === "number" ? (
                          <span className="text-muted small">{r.lineCount} lines</span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <div className="small fw-medium">{r.fromLocation?.name ?? "—"}</div>
                      <div className="text-muted small">→ {r.toLocation?.name ?? "—"}</div>
                    </td>
                    <td>
                      <span className={`badge ${dispatchStatusBadgeClass(r.status)}`}>{r.status}</span>
                      {partial ? (
                        <div className="small text-warning mt-4">Partial receive</div>
                      ) : null}
                    </td>
                    <td className="text-end text-nowrap">
                      <span className="fw-medium">{r.quantitiesReceived}</span>
                      <span className="text-muted"> / {r.quantitiesExpected}</span>
                    </td>
                    <td>
                      {r.linkedStockRequestId ? (
                        <Link href={staffStockRequestDetailPath(branchId, r.linkedStockRequestId)} className="fw-medium">
                          #{r.linkedStockRequestId}
                        </Link>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                      {r.effectiveStatusDisplay?.label ? (
                        <div className="mt-4">
                          <span className="badge rounded-pill bg-light text-dark border small fw-normal">
                            {r.effectiveStatusDisplay.label}
                          </span>
                        </div>
                      ) : null}
                    </td>
                    <td className="small">
                      {r.kind === "DISPATCH" ? (
                        <>
                          <span className={`badge ${receiveSessionStatusBadgeClass(r.dispatchReceiveSession?.status)}`}>
                            {r.dispatchReceiveSession?.status
                              ? receiveSessionStatusLabel(r.dispatchReceiveSession.status)
                              : "—"}
                          </span>
                          {r.dispatchReceiveSession?.submittedAt ? (
                            <div className="text-muted mt-4">Submitted {formatInboundTimestamp(r.dispatchReceiveSession.submittedAt)}</div>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="small text-muted" style={{ maxWidth: 220 }}>
                      {nextReceiveActionHint(r.nextReceiveAction)}
                    </td>
                    <td className="text-end">
                      <div className="d-flex flex-column align-items-end gap-6">
                        {r.kind === "DISPATCH" ? (
                          <>
                            <Link className="btn btn-sm btn-primary" href={primaryHref(r)}>
                              {ctaLabel}
                            </Link>
                            {canPrint ? (
                              <div className="btn-group btn-group-sm" role="group" aria-label="Print dispatch documents">
                                <a
                                  href={dispatchPrintUrl(r.inboundId, "challan")}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-outline-secondary"
                                >
                                  Challan
                                </a>
                                <a
                                  href={dispatchPrintUrl(r.inboundId, "delivery-note")}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-outline-secondary text-nowrap"
                                >
                                  Delivery note
                                </a>
                                <Link
                                  href={staffDispatchPrintPath(branchId, r.inboundId, "challan")}
                                  className="btn btn-outline-primary"
                                  title="In-app print preview"
                                >
                                  Print preview
                                </Link>
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <Link className="btn btn-sm btn-outline-dark" href={legacyHref()}>
                            {ctaLabel}
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
