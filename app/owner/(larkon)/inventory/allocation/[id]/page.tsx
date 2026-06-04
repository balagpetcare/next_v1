"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import {
  allocationPlanCancel,
  allocationPlanConfirm,
  allocationPlanGet,
  allocationPlanManualLine,
  allocationPlanReallocate,
  allocationPlanRunFefo,
  pickListComplete,
  pickListFromPlan,
  pickListHandoff,
  pickListStart,
  pickListUpdateLine,
} from "@/lib/api";
import { HandoffDestinationSelect } from "../_components/HandoffDestinationSelect";
import { formatAllocationApiError } from "../_utils/allocationErrors";

type AllocLine = {
  id: number;
  variantId?: number;
  quantityAllocated?: number;
  demandQty?: number | null;
  quantityShort?: number;
  lineStatus?: string | null;
  allocationMethod?: string | null;
  variant?: { sku?: string | null; title?: string | null };
  lot?: { lotCode?: string | null; expDate?: string | null };
  location?: { id?: number; name?: string | null };
};

type PickLine = {
  id: number;
  quantityToPick?: number;
  quantityPicked?: number;
  variant?: { sku?: string | null; title?: string | null };
  lot?: { lotCode?: string | null; expDate?: string | null };
  location?: { name?: string | null };
};

type PlanEvent = {
  id: number;
  action?: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  createdAt?: string;
  metadata?: unknown;
  performedBy?: { profile?: { displayName?: string | null } | null } | null;
};

type PickListSummary = {
  id: number;
  status?: string;
  lines?: PickLine[];
  dispatch?: { id: number; status?: string } | null;
  stockDispatchId?: number | null;
};

type AllocationPlanDetail = {
  id: number;
  orgId?: number;
  status?: string;
  version?: number;
  totalDemandQty?: number | null;
  totalAllocatedQty?: number | null;
  shortageQty?: number | null;
  allocationMethod?: string | null;
  stockRequestId?: number | null;
  medicineRequisitionId?: number | null;
  stockRequest?: { status?: string | null } | null;
  fromLocationId?: number;
  fromLocation?: {
    id?: number;
    name?: string | null;
    warehouse?: { name?: string | null } | null;
    branch?: { name?: string | null } | null;
  } | null;
  lines?: AllocLine[];
  /** All pick waves for this plan (newest first from API). */
  pickLists?: PickListSummary[];
  /** @deprecated Prefer pickLists */
  pickList?: PickListSummary | null;
  events?: PlanEvent[];
};

function selectPrimaryPickListForPlan(pickLists: PickListSummary[] | null | undefined): PickListSummary | null {
  if (!pickLists?.length) return null;
  const list = [...pickLists].sort((a, b) => b.id - a.id);
  const open = list.filter((p) => ["DRAFT", "IN_PROGRESS"].includes((p.status || "").toUpperCase()));
  if (open.length) return open[0];
  const completedNoDispatch = list.filter(
    (p) => (p.status || "").toUpperCase() === "COMPLETED" && p.stockDispatchId == null && !p.dispatch
  );
  if (completedNoDispatch.length) return completedNoDispatch[0];
  return list[0];
}

const PRE_CONFIRM = new Set(["DRAFT", "ALLOCATED", "PARTIALLY_ALLOCATED", "FAILED"]);

/** Stock request states where outbound dispatch handoff must not be offered */
const SR_STATUS_BLOCKS_HANDOFF = new Set(["CANCELLED", "REJECTED", "CLOSED"]);

function statusBadgeClass(status: string): string {
  const s = (status || "").toUpperCase();
  if (s === "ALLOCATED" || s === "CONFIRMED" || s === "PICKED") return "bg-success";
  if (s === "PARTIALLY_ALLOCATED" || s === "PICKING" || s === "ON_HOLD") return "bg-warning text-dark";
  if (s === "FAILED" || s === "CANCELLED") return "bg-danger";
  if (s === "DISPATCHED") return "bg-primary";
  if (s === "PARTIALLY_DISPATCHED") return "bg-info text-dark";
  return "bg-secondary";
}

export default function OwnerAllocationPlanDetailPage() {
  const params = useParams();
  const id = Number(params?.id);
  const [plan, setPlan] = useState<AllocationPlanDetail | null>(null);
  const [handoffDestinationId, setHandoffDestinationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [acting, setActing] = useState(false);

  const [manualVariant, setManualVariant] = useState("");
  const [manualLot, setManualLot] = useState("");
  const [manualLoc, setManualLoc] = useState("");
  const [manualQty, setManualQty] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [showManual, setShowManual] = useState(false);

  const load = useCallback(async () => {
    if (!id || Number.isNaN(id)) return;
    setLoading(true);
    setError("");
    try {
      const p = (await allocationPlanGet(id)) as AllocationPlanDetail | null;
      setPlan(p);
      setHandoffDestinationId(null);
      if (p?.fromLocationId) setManualLoc(String(p.fromLocationId));
    } catch (e: unknown) {
      setError(formatAllocationApiError(e, "detail"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  /** @returns false if the action was aborted (e.g. user dismissed confirm); otherwise reloads and shows success */
  async function runAction(fn: () => Promise<boolean | void>, successMessage = "Updated.") {
    setActing(true);
    setError("");
    setMsg("");
    try {
      const cont = await fn();
      if (cont === false) return;
      await load();
      setMsg(successMessage);
    } catch (e: unknown) {
      setError(formatAllocationApiError(e, "action"));
    } finally {
      setActing(false);
    }
  }

  if (loading && !plan) {
    return (
      <div className="container-fluid py-5 text-center">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger">{error || "Not found"}</div>
      </div>
    );
  }

  const st = (plan.status || "").toUpperCase();
  const pickListsRaw = plan.pickLists?.length
    ? plan.pickLists
    : plan.pickList
      ? [plan.pickList]
      : [];
  const pick = selectPrimaryPickListForPlan(pickListsRaw);
  const pickSt = pick ? (pick.status || "").toUpperCase() : "";
  const blockingOpenPick = pickListsRaw.some((p) => ["DRAFT", "IN_PROGRESS"].includes((p.status || "").toUpperCase()));
  const blockingCompletedNoDispatch = pickListsRaw.some(
    (p) =>
      (p.status || "").toUpperCase() === "COMPLETED" && p.stockDispatchId == null && p.dispatch == null
  );
  const canGeneratePickList =
    ["CONFIRMED", "PICKING", "PICKED", "PARTIALLY_DISPATCHED"].includes(st) &&
    !blockingOpenPick &&
    !blockingCompletedNoDispatch &&
    !["CANCELLED", "DISPATCHED"].includes(st);
  const canPreConfirm = PRE_CONFIRM.has(st);
  const shortage = plan.shortageQty ?? 0;
  const hasShortage = shortage > 0;
  const version = plan.version ?? 0;
  const hasAllocLines = (plan.lines || []).some((l) => (l.quantityAllocated ?? 0) > 0);
  const srStatus = (plan.stockRequest?.status || "").toUpperCase();
  const handoffBlockedBySr =
    Boolean(plan.stockRequestId) && srStatus !== "" && SR_STATUS_BLOCKS_HANDOFF.has(srStatus);

  return (
    <div className="container-fluid py-4">
      <PageHeader
        title={`Allocation plan #${plan.id}`}
        subtitle={
          <span>
            Status: <span className={`badge ${statusBadgeClass(st)}`}>{plan.status}</span>
            {plan.allocationMethod ? (
              <span className="text-muted small ms-2">Method: {plan.allocationMethod}</span>
            ) : null}
          </span>
        }
      />
      <Link href="/owner/inventory/allocation" className="btn btn-outline-secondary btn-sm mb-2">
        ← Board
      </Link>
      {error && <div className="alert alert-danger">{error}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      {hasShortage && (
        <div className="alert alert-warning">
          <strong>Shortage:</strong> {shortage} units unmet vs demand. Confirm is still allowed if you accept partial
          fulfillment; adjust stock or add manual lines at the source location.
        </div>
      )}

      <div className="row g-3 mb-3">
        <div className="col-6 col-md-3">
          <div className="card border h-100">
            <div className="card-body py-2">
              <div className="text-muted small">Total demand</div>
              <div className="fs-5">{plan.totalDemandQty ?? "—"}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border h-100">
            <div className="card-body py-2">
              <div className="text-muted small">Allocated</div>
              <div className="fs-5">{plan.totalAllocatedQty ?? "—"}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border h-100">
            <div className="card-body py-2">
              <div className="text-muted small">Shortage</div>
              <div className="fs-5">{plan.shortageQty ?? "—"}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border h-100">
            <div className="card-body py-2">
              <div className="text-muted small">Version (confirm)</div>
              <div className="fs-5">{version}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border mb-3">
        <div className="card-body py-2 small">
          <strong>Source location:</strong> {plan.fromLocation?.name || "—"}{" "}
          {plan.fromLocation?.warehouse?.name ? `· ${plan.fromLocation.warehouse.name}` : ""}{" "}
          {plan.fromLocation?.branch?.name ? `· ${plan.fromLocation.branch.name}` : ""}
          {plan.stockRequestId ? (
            <>
              {" "}
              ·{" "}
              <Link href={`/owner/inventory/stock-requests/${plan.stockRequestId}`}>
                Stock request #{plan.stockRequestId}
              </Link>
            </>
          ) : null}
          {plan.medicineRequisitionId ? <span> · Medicine requisition #{plan.medicineRequisitionId}</span> : null}
        </div>
      </div>

      <div className="card border mb-3">
        <div className="card-header py-2">Actions</div>
        <div className="card-body d-flex flex-wrap gap-2">
          {canPreConfirm && (
            <>
              <button
                className="btn btn-sm btn-primary"
                disabled={acting}
                type="button"
                onClick={() =>
                  runAction(async () => {
                    await allocationPlanRunFefo(id);
                  })
                }
              >
                Run FEFO / Recalculate
              </button>
              <button
                className="btn btn-sm btn-outline-primary"
                disabled={acting}
                type="button"
                onClick={() =>
                  runAction(async () => {
                    if (
                      !window.confirm(
                        "Reallocate: releases reservations if confirmed, clears lines, and re-runs FEFO. Continue?"
                      )
                    ) {
                      return false;
                    }
                    await allocationPlanReallocate(id);
                  })
                }
              >
                Reallocate
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                type="button"
                onClick={() => setShowManual((v) => !v)}
              >
                {showManual ? "Hide manual line" : "Manual allocate"}
              </button>
              <button
                className="btn btn-sm btn-success"
                disabled={acting || !hasAllocLines}
                title={!hasAllocLines ? "Run FEFO or add a manual line with quantity before confirming" : undefined}
                type="button"
                onClick={() =>
                  runAction(async () => {
                    await allocationPlanConfirm(id, undefined, { expectedVersion: version });
                  })
                }
              >
                Confirm plan (reserve)
              </button>
            </>
          )}

          {canGeneratePickList && (
            <button
              className="btn btn-sm btn-primary"
              disabled={acting}
              type="button"
              title={
                pickListsRaw.length
                  ? "Creates the next pick wave for any remaining allocated quantity (after prior pick lists are handed off)."
                  : "Creates the first pick list from the confirmed allocation."
              }
              onClick={() =>
                runAction(async () => {
                  await pickListFromPlan(id);
                })
              }
            >
              {pickListsRaw.length ? "Generate next pick list (wave)" : "Generate pick list"}
            </button>
          )}

          {pick && pickSt === "DRAFT" && (
            <button
              className="btn btn-sm btn-warning"
              disabled={acting}
              type="button"
              onClick={() =>
                runAction(async () => {
                  await pickListStart(pick.id);
                })
              }
            >
              Start picking
            </button>
          )}
          {pick && ["DRAFT", "IN_PROGRESS"].includes(pickSt) && (
            <button
              className="btn btn-sm btn-success"
              disabled={acting}
              type="button"
              onClick={() =>
                runAction(async () => {
                  await pickListComplete(pick.id);
                })
              }
            >
              Complete picking
            </button>
          )}
          {pick && pickSt === "COMPLETED" && !pick.dispatch && handoffBlockedBySr && (
            <div className="alert alert-warning py-2 small mb-0 w-100">
              Handoff is not available: stock request is <strong>{srStatus || "—"}</strong>. Open dispatch from existing
              records or contact support if this is unexpected.
            </div>
          )}
          {pick && pickSt === "COMPLETED" && !pick.dispatch && !handoffBlockedBySr && (
            <div className="w-100">
              <label className="form-label small mb-1" htmlFor="handoff-destination-select">
                Branch destination location
              </label>
              <div className="d-flex flex-wrap align-items-start gap-2">
                <div style={{ minWidth: 280, maxWidth: 480 }} className="flex-grow-1">
                  <HandoffDestinationSelect
                    id="handoff-destination-select"
                    orgId={plan.orgId}
                    sourceLocationId={plan.fromLocationId}
                    value={handoffDestinationId}
                    onChange={(locId) => {
                      setHandoffDestinationId(locId);
                      setError("");
                    }}
                    disabled={acting}
                  />
                </div>
                <button
                  className="btn btn-sm btn-dark align-self-start mt-1"
                  disabled={
                    acting ||
                    handoffDestinationId == null ||
                    handoffDestinationId === plan.fromLocationId
                  }
                  type="button"
                  title={
                    handoffDestinationId === plan.fromLocationId
                      ? "Choose a different location than the source warehouse location"
                      : undefined
                  }
                  onClick={() =>
                    runAction(
                      async () => {
                        if (handoffDestinationId == null) {
                          throw new Error("Select a branch destination location");
                        }
                        if (handoffDestinationId === plan.fromLocationId) {
                          throw new Error("Destination must differ from the source allocation location");
                        }
                        await pickListHandoff(pick.id, { toLocationId: handoffDestinationId });
                      },
                      "Dispatch created. Open challan from the stock request or pick list when ready."
                    )
                  }
                >
                  Handoff → dispatch
                </button>
              </div>
              {handoffDestinationId === plan.fromLocationId && (
                <div className="small text-warning mt-1">Select a destination other than the source location.</div>
              )}
              {handoffDestinationId == null && (
                <div className="small text-muted mt-1">Select where stock is being sent (branch receiving location).</div>
              )}
            </div>
          )}

          {!["CANCELLED", "DISPATCHED"].includes(st) && (
            <div className="w-100 border-top pt-2 mt-1">
              <div className="input-group input-group-sm" style={{ maxWidth: 420 }}>
                <input
                  className="form-control"
                  placeholder="Cancel reason (optional)"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                <button
                  className="btn btn-outline-danger"
                  disabled={acting}
                  type="button"
                  onClick={() =>
                    runAction(async () => {
                      if (!window.confirm("Cancel this allocation plan? Reservations will be released if held.")) {
                        return false;
                      }
                      await allocationPlanCancel(id, undefined, cancelReason.trim() || undefined);
                      setCancelReason("");
                    })
                  }
                >
                  Cancel plan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showManual && canPreConfirm && (
        <div className="card border mb-3">
          <div className="card-header py-2">Manual allocation line</div>
          <div className="card-body">
            <p className="small text-muted">
              Lot must exist at the source location. <code>locationId</code> must match the plan source (
              {plan.fromLocationId}).
            </p>
            <div className="row g-2 align-items-end">
              <div className="col-6 col-md-2">
                <label className="form-label small mb-0">Variant ID</label>
                <input
                  className="form-control form-control-sm"
                  value={manualVariant}
                  onChange={(e) => setManualVariant(e.target.value)}
                />
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label small mb-0">Lot ID</label>
                <input
                  className="form-control form-control-sm"
                  value={manualLot}
                  onChange={(e) => setManualLot(e.target.value)}
                />
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label small mb-0">Location ID</label>
                <input
                  className="form-control form-control-sm"
                  value={manualLoc}
                  onChange={(e) => setManualLoc(e.target.value)}
                />
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label small mb-0">Qty</label>
                <input
                  className="form-control form-control-sm"
                  value={manualQty}
                  onChange={(e) => setManualQty(e.target.value)}
                />
              </div>
              <div className="col-12 col-md-auto">
                <button
                  className="btn btn-sm btn-primary"
                  disabled={acting}
                  type="button"
                  onClick={() =>
                    runAction(async () => {
                      const variantId = Number(manualVariant);
                      const lotId = Number(manualLot);
                      const locationId = Number(manualLoc);
                      const quantity = Number(manualQty);
                      if (!variantId || !lotId || !locationId || !quantity) {
                        throw new Error("Enter variant, lot, location, and quantity");
                      }
                      await allocationPlanManualLine(id, { variantId, lotId, locationId, quantity });
                    })
                  }
                >
                  Add / increment line
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row g-3">
        <div className="col-lg-7">
          <div className="card border">
            <div className="card-header py-2">Allocation lines</div>
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Variant</th>
                    <th>Location</th>
                    <th>Lot / expiry</th>
                    <th className="text-end">Demand</th>
                    <th className="text-end">Allocated</th>
                    <th className="text-end">Short</th>
                    <th>Line</th>
                  </tr>
                </thead>
                <tbody>
                  {(plan.lines || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-muted text-center py-3">
                        No lines yet. Run FEFO or add a manual line. New plans auto-run FEFO unless created with{" "}
                        <code>skipAutoAllocation</code>.
                      </td>
                    </tr>
                  ) : (
                    (plan.lines || []).map((l) => (
                      <tr key={l.id}>
                        <td className="small">
                          <div>{l.variant?.sku || "—"}</div>
                          <div className="text-muted">{l.variant?.title || ""}</div>
                        </td>
                        <td className="small">{l.location?.name || l.location?.id || "—"}</td>
                        <td className="small">
                          {l.lot?.lotCode || "—"}
                          {l.lot?.expDate ? (
                            <div className="text-muted">{String(l.lot.expDate).slice(0, 10)}</div>
                          ) : null}
                        </td>
                        <td className="text-end">{l.demandQty ?? "—"}</td>
                        <td className="text-end">{l.quantityAllocated ?? 0}</td>
                        <td className="text-end">{l.quantityShort ?? 0}</td>
                        <td className="small">
                          {l.lineStatus || "—"}
                          {l.allocationMethod ? <div className="text-muted">{l.allocationMethod}</div> : null}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card border mb-3">
            <div className="card-header py-2">Pick lists</div>
            <div className="card-body">
              {pickListsRaw.length > 1 && (
                <div className="table-responsive mb-2">
                  <table className="table table-sm mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Pick #</th>
                        <th>Status</th>
                        <th>Dispatch</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pickListsRaw.map((pl) => (
                        <tr key={pl.id}>
                          <td className="small">{pl.id}</td>
                          <td className="small">{pl.status ?? "—"}</td>
                          <td className="small">
                            {pl.dispatch ? `#${pl.dispatch.id}` : pl.stockDispatchId ? `#${pl.stockDispatchId}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {!pick ? (
                <p className="text-muted small mb-0">No pick list yet. Confirm the plan, then generate a pick list.</p>
              ) : (
                <>
                  <p className="small mb-1 text-muted">Primary (active) pick for actions:</p>
                  <p className="small mb-2">
                    Pick #{pick.id} — <span className="badge bg-secondary">{pick.status}</span>
                  </p>
                  {plan.stockRequestId && pick.dispatch ? (
                    <Link
                      href={`/owner/inventory/stock-requests/${plan.stockRequestId}/challan/${pick.dispatch.id}`}
                      className="btn btn-sm btn-outline-primary mb-2"
                    >
                      Open dispatch / challan
                    </Link>
                  ) : pick.dispatch ? (
                    <p className="small text-muted mb-2">Dispatch #{pick.dispatch.id}</p>
                  ) : null}

                  <div className="table-responsive">
                    <table className="table table-sm mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>SKU</th>
                          <th className="text-end">To pick</th>
                          <th className="text-end">Picked</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {(pick.lines || []).map((ln) => (
                          <PickRowEditor
                            key={ln.id}
                            line={ln}
                            pickListId={pick.id}
                            editable={["DRAFT", "IN_PROGRESS"].includes(pickSt)}
                            acting={acting}
                            onSaved={load}
                            onError={setError}
                            onActing={setActing}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="card border">
            <div className="card-header py-2">Recent events</div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>When</th>
                      <th>Action</th>
                      <th>Actor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(plan.events || []).length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-muted text-center py-2">
                          No events
                        </td>
                      </tr>
                    ) : (
                      (plan.events || []).map((ev) => (
                        <tr key={ev.id}>
                          <td className="small text-nowrap">
                            {ev.createdAt ? new Date(ev.createdAt).toLocaleString() : "—"}
                          </td>
                          <td className="small">
                            {ev.action}
                            {ev.fromStatus || ev.toStatus ? (
                              <div className="text-muted">
                                {ev.fromStatus} → {ev.toStatus}
                              </div>
                            ) : null}
                          </td>
                          <td className="small">{ev.performedBy?.profile?.displayName || "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PickRowEditor({
  line,
  pickListId,
  editable,
  acting,
  onSaved,
  onError,
  onActing,
}: {
  line: PickLine;
  pickListId: number;
  editable: boolean;
  acting: boolean;
  onSaved: () => Promise<void>;
  onError: (s: string) => void;
  onActing: (v: boolean) => void;
}) {
  const maxPick = Math.max(0, Number(line.quantityToPick ?? 0));
  const [qty, setQty] = useState(String(line.quantityPicked ?? 0));

  useEffect(() => {
    setQty(String(line.quantityPicked ?? 0));
  }, [line.id, line.quantityPicked, line.quantityToPick]);

  async function save() {
    const n = Number(qty);
    if (!Number.isFinite(n) || n < 0) {
      onError("Picked quantity must be a non-negative number");
      return;
    }
    if (n > maxPick) {
      onError(`Picked quantity cannot exceed ${maxPick} for line ${line.id} (${line.variant?.sku ?? "SKU"})`);
      setQty(String(maxPick));
      return;
    }
    if (n === Number(line.quantityPicked ?? 0)) return;
    onActing(true);
    onError("");
    try {
      await pickListUpdateLine(pickListId, line.id, { quantityPicked: n });
      await onSaved();
    } catch (e: unknown) {
      onError(formatAllocationApiError(e, "action"));
    } finally {
      onActing(false);
    }
  }

  return (
    <tr>
      <td className="small">{line.variant?.sku || "—"}</td>
      <td className="text-end">{maxPick}</td>
      <td className="text-end" style={{ maxWidth: 100 }}>
        {editable ? (
          <input
            className="form-control form-control-sm text-end"
            type="number"
            min={0}
            max={maxPick}
            step={1}
            inputMode="numeric"
            value={qty}
            disabled={acting}
            onChange={(e) => setQty(e.target.value)}
            onBlur={() => void save()}
          />
        ) : (
          line.quantityPicked ?? 0
        )}
      </td>
      <td className="text-end">
        {editable && (
          <button type="button" className="btn btn-link btn-sm p-0" disabled={acting} onClick={() => void save()}>
            Save
          </button>
        )}
      </td>
    </tr>
  );
}
