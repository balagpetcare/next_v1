"use client";

/**
 * Branch dispatch receive workspace — canonical filesystem route (URL matches this path).
 * /staff/branch/[branchId]/inventory/receive-dispatch/[dispatchId]
 * Legacy .../receive/dispatch/:id and .../receive-dispatch-page/:id redirect here (next.config.js + proxy.ts).
 */

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import LkInput from "@larkon-ui/components/LkInput";
import LkSelect from "@larkon-ui/components/LkSelect";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffGetDispatch,
  staffReceiveDispatch,
  staffCancelDispatchReceiveSession,
  dispatchPrintUrl,
  grnPrintUrl,
} from "@/lib/api";
import { useToast } from "@/src/hooks/useToast";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import {
  getDispatchLineRemaining,
  parseNonNegInt,
  dispatchLineKey,
  acceptedFromDamageShort,
  lineDiscrepancyInputsOutOfRange,
  lineNeedsDetailPanel,
  batchFullyAccountsForRemaining,
  DISPATCH_RECEIVE_DISCREPANCY_REASON_OPTIONS,
} from "@/src/lib/dispatchReceiveLineMath";
import {
  canReceiveStockAtBranch,
  canViewReceiveDispatchWorkspace,
  dispatchStatusBadgeClass,
  formatInboundTimestamp,
  receiveSessionStatusBadgeClass,
  receiveSessionStatusLabel,
} from "@/lib/inboundTransfersUi";
import {
  staffBranchPickerPath,
  staffInboundTransfersPath,
  staffIncomingShipmentsPath,
  staffReceiveCenterPath,
} from "@/lib/staffInventoryRoutes";

const RECEIVING_NOTES_PLACEHOLDER =
  "Describe any overall receiving issue, shortage context, damaged packaging, follow-up action, or warehouse communication reference.";

const DISCREPANCY_DETAILS_HELPER =
  "Explain damage, shortage, or over-received units and what happens next (e.g. not received from vehicle, held for review, extra cartons segregated, awaiting warehouse confirmation).";

const EXCESS_FIELD_HELPER =
  "Count of units physically received beyond the dispatch remaining quantity for this line. Not posted to stock automatically; recorded for review / reconciliation.";

const ALLOWED_REASON_VALUES = new Set(
  DISPATCH_RECEIVE_DISCREPANCY_REASON_OPTIONS.filter((o) => o.value).map((o) => o.value)
);

export default function StaffDispatchReceiveWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const dispatchId = useMemo(() => parseInt(String(params?.dispatchId ?? "0"), 10), [params]);
  const fromParam = searchParams?.get("from") ?? "";
  const fromInbound = fromParam === "inbound";
  const fromIncoming = fromParam === "incoming";
  const { branch, myAccess, isLoading: ctxLoading, errorCode, hasViewPermission } = useBranchContext(branchId);
  const toast = useToast();

  const [dispatch, setDispatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [lineInputs, setLineInputs] = useState({});
  const [rowChecked, setRowChecked] = useState({});
  /** Which dispatch line keys have the discrepancy panel expanded */
  const [detailOpen, setDetailOpen] = useState({});

  const permissions = myAccess?.permissions ?? [];
  const canReceive = canReceiveStockAtBranch(permissions);
  const canViewWorkspace = canViewReceiveDispatchWorkspace(permissions);
  const readOnlyWorkspace = canViewWorkspace && !canReceive;
  const canManagerConfirm = permissions.includes("dispatch.receive.confirm.branch_manager");

  const loadDispatch = useCallback(() => {
    if (!dispatchId || dispatchId <= 0) return Promise.resolve();
    return staffGetDispatch(dispatchId).then((d) => {
      if (d) setDispatch(d);
      return d;
    });
  }, [dispatchId]);

  useEffect(() => {
    if (errorCode === "unauthorized") router.replace("/staff/login");
  }, [errorCode, router]);

  useEffect(() => {
    if (!dispatchId || dispatchId <= 0) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    staffGetDispatch(dispatchId)
      .then((d) => {
        if (cancelled || !d) return;
        setDispatch(d);
        setNotes(d.dispatchReceiveSession?.notes ?? "");
        const init = {};
        const checked = {};
        const sessLines = d.dispatchReceiveSession?.lines ?? [];
        const byItemId = new Map(sessLines.map((sl) => [sl.stockDispatchItemId, sl]));
        (d.items ?? []).forEach((line) => {
          const key = dispatchLineKey(line);
          const remaining = getDispatchLineRemaining(line);
          const sl = byItemId.get(line.id);
          if (sl) {
            init[key] = {
              damage: String(sl.quantityDamaged ?? 0),
              shortage: String(sl.quantityShort ?? 0),
              excess: String(sl.excessQty ?? 0),
              reasonCode: sl.reasonCode ? String(sl.reasonCode) : "",
              lineNote: sl.lineNote ?? "",
              followUpNote: sl.followUpNote ?? "",
            };
            checked[key] = true;
          } else {
            init[key] = {
              damage: "0",
              shortage: "0",
              excess: "0",
              reasonCode: "",
              lineNote: "",
              followUpNote: "",
            };
            checked[key] = remaining > 0;
          }
        });
        setLineInputs(init);
        setRowChecked(checked);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Failed to load dispatch");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dispatchId]);

  const updateLine = (key, field, value) => {
    setLineInputs((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? {}), [field]: value },
    }));
  };

  const toggleRow = (key) => {
    setRowChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const fillAllRemaining = () => {
    if (!dispatch?.items?.length) return;
    const next = { ...lineInputs };
    const chk = { ...rowChecked };
    dispatch.items.forEach((line) => {
      const key = dispatchLineKey(line);
      const rem = getDispatchLineRemaining(line);
      if (rem <= 0) return;
      chk[key] = true;
      next[key] = {
        ...(next[key] ?? {}),
        damage: "0",
        shortage: "0",
        excess: "0",
        reasonCode: next[key]?.reasonCode ?? "",
        lineNote: next[key]?.lineNote ?? "",
        followUpNote: next[key]?.followUpNote ?? "",
      };
    });
    setRowChecked(chk);
    setLineInputs(next);
  };

  const getRowError = (line) => {
    const key = dispatchLineKey(line);
    if (!rowChecked[key]) return null;
    const rem = getDispatchLineRemaining(line);
    const inp = lineInputs[key] ?? { damage: "0", shortage: "0", excess: "0", reasonCode: "", lineNote: "", followUpNote: "" };
    const dmg = parseNonNegInt(inp.damage);
    const sh = parseNonNegInt(inp.shortage);
    const ex = parseNonNegInt(inp.excess);
    if (rem <= 0 && ex <= 0) return null;
    if (rem > 0) {
      const accepted = acceptedFromDamageShort(rem, dmg, sh);
      if (lineDiscrepancyInputsOutOfRange(rem, dmg, sh)) {
        return `Damage + shortage (${dmg + sh}) cannot exceed remaining (${rem}).`;
      }
      if (!batchFullyAccountsForRemaining(rem, accepted, dmg, sh)) {
        return `Accepted + Damage + Shortage must equal Remaining (${rem}) for this line.`;
      }
    }
    const note = String(inp.lineNote ?? "").trim();
    const rc = String(inp.reasonCode ?? "").trim();
    if (lineNeedsDetailPanel(dmg, sh, ex)) {
      if (!rc || !ALLOWED_REASON_VALUES.has(rc)) return "Choose a discrepancy reason.";
      if (note.length < 5) return "Add discrepancy details (at least 5 characters).";
    }
    return null;
  };

  const canSubmitAny = useMemo(() => {
    if (!dispatch?.items?.length || submitting) return false;
    let any = false;
    for (const line of dispatch.items) {
      const key = dispatchLineKey(line);
      if (!rowChecked[key]) continue;
      const err = getRowError(line);
      if (err) return false;
      const rem = getDispatchLineRemaining(line);
      const inp = lineInputs[key] ?? {};
      const dmg = parseNonNegInt(inp.damage);
      const sh = parseNonNegInt(inp.shortage);
      const ex = parseNonNegInt(inp.excess);
      const a = rem > 0 ? acceptedFromDamageShort(rem, dmg, sh) : 0;
      if (rem > 0 && a + dmg + sh > 0) any = true;
      if (rem <= 0 && ex > 0) any = true;
    }
    return any;
  }, [dispatch, lineInputs, rowChecked, submitting]);  

  const summaryTotals = useMemo(() => {
    let remT = 0;
    let accT = 0;
    let dmgT = 0;
    let shT = 0;
    let exT = 0;
    for (const line of dispatch?.items ?? []) {
      const key = dispatchLineKey(line);
      if (!rowChecked[key]) continue;
      const r = getDispatchLineRemaining(line);
      remT += r;
      const inp = lineInputs[key] ?? {};
      const dmg = parseNonNegInt(inp.damage);
      const sh = parseNonNegInt(inp.shortage);
      const ex = parseNonNegInt(inp.excess);
      if (r > 0) {
        accT += acceptedFromDamageShort(r, dmg, sh);
        dmgT += dmg;
        shT += sh;
      }
      exT += ex;
    }
    return { remT, accT, dmgT, shT, exT };
  }, [dispatch, rowChecked, lineInputs]);

  const toggleDetail = useCallback((key) => {
    setDetailOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const buildItems = useCallback(() => {
    const items = [];
    (dispatch?.items ?? []).forEach((line) => {
      const key = dispatchLineKey(line);
      if (!rowChecked[key]) return;
      const rem = getDispatchLineRemaining(line);
      const inp = lineInputs[key];
      if (!inp) return;
      const dmg = parseNonNegInt(inp.damage);
      const sh = parseNonNegInt(inp.shortage);
      const ex = parseNonNegInt(inp.excess);
      const a = rem > 0 ? acceptedFromDamageShort(rem, dmg, sh) : 0;
      if (rem > 0 && a + dmg + sh <= 0 && ex <= 0) return;
      if (rem <= 0 && ex <= 0) return;
      const note = String(inp.lineNote ?? "").trim();
      const rc = String(inp.reasonCode ?? "").trim();
      const fu = String(inp.followUpNote ?? "").trim();
      items.push({
        variantId: line.variantId,
        lotId: line.lotId ?? undefined,
        quantityReceived: rem > 0 ? a : 0,
        quantityDamaged: rem > 0 ? dmg : 0,
        quantityShort: rem > 0 ? sh : 0,
        ...(ex > 0 ? { excessQty: ex } : {}),
        ...(lineNeedsDetailPanel(dmg, sh, ex) && rc ? { reasonCode: rc } : {}),
        lineNote: note || undefined,
        ...(fu ? { followUpNote: fu } : {}),
      });
    });
    return items;
  }, [dispatch, rowChecked, lineInputs]);

  const runReceive = async (body) => {
    setSubmitting(true);
    setError("");
    try {
      const res = await staffReceiveDispatch(dispatchId, body);
      await loadDispatch();
      return res;
    } catch (err) {
      const msg = getMessageFromApiError(err);
      setError(msg);
      toast.error(msg);
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveVerification = async () => {
    const items = buildItems();
    if (!items.length) {
      toast.warning("Select at least one line with quantities.");
      return;
    }
    const res = await runReceive({ items, notes, receiveMode: "verify" });
    if (res) toast.success("Verification saved");
  };

  const handleSubmitForManager = async () => {
    const res = await runReceive({ receiveMode: "submit" });
    if (res) toast.success("Submitted for manager confirmation");
  };

  const handleConfirm = async () => {
    if (!canManagerConfirm) return;
    const items = buildItems();
    const res = await runReceive({
      notes,
      receiveMode: "confirm",
      ...(items.length > 0 ? { items } : {}),
    });
    if (res) {
      toast.success("Receive posted");
      setTimeout(() => router.push(staffReceiveCenterPath(branchId)), 900);
    }
  };

  const handleLegacyImmediate = async () => {
    const items = buildItems();
    if (!items.length) {
      toast.warning("Select at least one line with quantities.");
      return;
    }
    const res = await runReceive({ items, notes });
    if (res) {
      toast.success("Received and posted");
      setTimeout(() => router.push(staffReceiveCenterPath(branchId)), 900);
    }
  };

  const handleCancelDraft = async () => {
    setSubmitting(true);
    try {
      await staffCancelDispatchReceiveSession(dispatchId);
      toast.success("Draft cancelled");
      await loadDispatch();
    } catch (err) {
      toast.error(getMessageFromApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }

  if (errorCode === "forbidden" || !hasViewPermission) {
    return (
      <AccessDenied
        title="Branch access required"
        message="You cannot open this branch, or your membership is not active."
        onBack={() => router.push(staffBranchPickerPath())}
      />
    );
  }

  if (!canViewWorkspace) {
    return (
      <AccessDenied
        title="Dispatch receive unavailable"
        message="You need receive stock (inventory.receive), inventory read, inbound read, or dispatch view to open this workspace."
        onBack={() => router.push(staffReceiveCenterPath(branchId))}
      />
    );
  }

  if (loading || !dispatch) {
    return (
      <div className="container py-24">
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        <div className="text-center py-40">
          {loading ? (
            <>
              <div className="spinner-border text-primary" role="status" />
              <p className="mt-16 text-secondary-light">Loading dispatch...</p>
            </>
          ) : (
            <p className="text-secondary-light">Dispatch not found.</p>
          )}
          <Link href={staffReceiveCenterPath(branchId)} className="btn btn-outline-primary btn-sm mt-16">
            Receive center
          </Link>
        </div>
      </div>
    );
  }

  const sessionStatus = dispatch.dispatchReceiveSession?.status;
  const isPosted = sessionStatus === "POSTED" || dispatch.status === "DELIVERED";
  const lineInputsLocked = isPosted || readOnlyWorkspace;
  const isAwaiting = sessionStatus === "AWAITING_CONFIRMATION";
  const canPrintDocuments = dispatch?.access?.canPrintDocuments !== false;
  const latestGrnId = dispatch?.grns?.[0]?.id ?? null;

  const totalDispatched = (dispatch.items ?? []).reduce((s, l) => s + (l.quantityDispatched ?? 0), 0);
  const totalRemaining = (dispatch.items ?? []).reduce((s, l) => s + getDispatchLineRemaining(l), 0);
  const sentAt = dispatch.inTransitAt ?? dispatch.packedAt ?? dispatch.createdAt;
  const stockRequestId = dispatch.stockRequestId ?? dispatch.stockRequest?.id;
  const destBranchName = dispatch.stockRequest?.branch?.name ?? "—";

  return (
    <div className="container py-24 pb-120">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />

      <nav aria-label="breadcrumb" className="mb-16 small">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link
              href={
                fromInbound
                  ? staffInboundTransfersPath(branchId)
                  : fromIncoming
                    ? staffIncomingShipmentsPath(branchId)
                    : staffReceiveCenterPath(branchId)
              }
            >
              {fromInbound ? "Inbound transfers" : fromIncoming ? "Incoming shipments" : "Receive center"}
            </Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Dispatch #{dispatch.id}
          </li>
        </ol>
      </nav>

      <div className="d-flex flex-wrap align-items-start justify-content-between gap-16 mb-24">
        <div>
          <h5 className="mb-8">Receive dispatch</h5>
          <p className="text-muted small mb-0">
            <strong>Remaining = Accepted + Damage + Shortage</strong> (envelope for this receipt). <strong>Excess</strong> is separate: units received beyond
            remaining; <strong>not posted to stock</strong> by default and logged for review. Only <strong>Accepted</strong> posts to branch inventory.
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Link href={staffReceiveCenterPath(branchId)} className="btn btn-outline-secondary btn-sm">
            Receive center
          </Link>
          <Link href={staffInboundTransfersPath(branchId)} className="btn btn-outline-secondary btn-sm">
            Inbound transfers
          </Link>
        </div>
      </div>

      {readOnlyWorkspace && !isPosted ? (
        <div className="alert alert-light border mb-16 small" role="status">
          <strong>Read-only.</strong> You can review this dispatch and open print previews. To enter quantities and post stock, your role needs{" "}
          <span className="text-body">Receive stock</span> (<code className="small">inventory.receive</code> or <code className="small">inbound.receive</code>).
        </div>
      ) : null}

      {sessionStatus && (
        <div className="alert alert-light border mb-16 small">
          <strong>Receive session</strong>{" "}
          <span className={`badge ${receiveSessionStatusBadgeClass(sessionStatus)}`}>{receiveSessionStatusLabel(sessionStatus)}</span>
          {isAwaiting && !canManagerConfirm ? (
            <span className="ms-2 text-muted">Awaiting branch manager confirmation to post stock.</span>
          ) : null}
        </div>
      )}

      {error && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between mb-16">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}

      <div className="row g-16 mb-24">
        <div className="col-md-4">
          <Card title="Summary" className="h-100">
            <dl className="row small mb-0">
              <dt className="col-5">Dispatch</dt>
              <dd className="col-7">#{dispatch.id}</dd>
              <dt className="col-5">Stock request</dt>
              <dd className="col-7">{stockRequestId ? `#${stockRequestId}` : "—"}</dd>
              <dt className="col-5">From</dt>
              <dd className="col-7">{dispatch.fromLocation?.name ?? "—"}</dd>
              <dt className="col-5">To</dt>
              <dd className="col-7">
                <div>{destBranchName}</div>
                <div className="text-muted">{dispatch.toLocation?.name ?? ""}</div>
              </dd>
              <dt className="col-5">Sent</dt>
              <dd className="col-7">{formatInboundTimestamp(sentAt)}</dd>
              <dt className="col-5">Sent by</dt>
              <dd className="col-7">
                {dispatch.createdBy?.profile?.displayName ??
                  dispatch.createdBy?.auth?.email ??
                  dispatch.createdBy?.profile?.username ??
                  (dispatch.createdBy?.id ? `User #${dispatch.createdBy.id}` : "—")}
              </dd>
              <dt className="col-5">Status</dt>
              <dd className="col-7">
                <span className={`badge ${dispatchStatusBadgeClass(dispatch.status)}`}>{dispatch.status}</span>
              </dd>
              <dt className="col-5">Lines / qty</dt>
              <dd className="col-7">
                {(dispatch.items ?? []).length} lines · {totalDispatched} sent · {totalRemaining} remaining
              </dd>
            </dl>
          </Card>
        </div>
        <div className="col-md-8">
          <Card title="Print documents" subtitle="Opens in a new tab (session cookie).">
            {canPrintDocuments ? (
              <div className="d-flex flex-wrap gap-2">
                <a href={dispatchPrintUrl(dispatchId, "challan")} target="_blank" rel="noopener noreferrer" className="btn btn-outline-secondary btn-sm">
                  Challan
                </a>
                <a href={dispatchPrintUrl(dispatchId, "delivery-note")} target="_blank" rel="noopener noreferrer" className="btn btn-outline-secondary btn-sm">
                  Delivery note
                </a>
                <a
                  href={dispatchPrintUrl(dispatchId, "branch-receiving-record")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-secondary btn-sm"
                >
                  Branch file copy
                </a>
                <a href={dispatchPrintUrl(dispatchId, "branch-worksheet")} target="_blank" rel="noopener noreferrer" className="btn btn-outline-secondary btn-sm">
                  Worksheet
                </a>
                {(isPosted || dispatch.status === "DELIVERED") && (
                  <>
                    <a
                      href={dispatchPrintUrl(dispatchId, "branch-confirmation")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline-secondary btn-sm"
                    >
                      Branch confirmation
                    </a>
                    <a href={dispatchPrintUrl(dispatchId, "discrepancy")} target="_blank" rel="noopener noreferrer" className="btn btn-outline-secondary btn-sm">
                      Discrepancy
                    </a>
                  </>
                )}
                {latestGrnId ? (
                  <a href={grnPrintUrl(latestGrnId, "grn")} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary btn-sm">
                    Print GRN
                  </a>
                ) : null}
              </div>
            ) : (
              <p className="text-muted small mb-0">Printing is not available for your role on this dispatch.</p>
            )}
          </Card>
        </div>
      </div>

      {dispatch.status === "DELIVERED" && (
        <div className="alert alert-success mb-16">This dispatch is fully received. The lines below are read-only.</div>
      )}

      {dispatch.status === "PACKED" && (
        <div className="alert alert-info small mb-16">
          Dispatch status is <strong>PACKED</strong>. Branch verification and posting require <strong>IN_TRANSIT</strong> (after the warehouse sends). You can
          still review lines and open prints.
        </div>
      )}

      <Card
        title="Receive lines"
        subtitle="Compact grid: quantities per line. Open Details for reason, discrepancy notes, and follow-up when damage, shortage, or excess is recorded. Excess is never auto-posted to stock."
      >
        <div className="row row-cols-2 row-cols-md-5 g-8 mb-20">
          {[
            { label: "Open remaining", value: summaryTotals.remT, className: "border bg-white" },
            { label: "Accepted (stock)", value: summaryTotals.accT, className: "border border-success bg-light" },
            { label: "Damage", value: summaryTotals.dmgT, className: "border bg-white" },
            { label: "Shortage", value: summaryTotals.shT, className: "border bg-white" },
            { label: "Excess (review)", value: summaryTotals.exT, className: "border border-primary bg-light" },
          ].map((chip) => (
            <div key={chip.label} className="col">
              <div className={`rounded-2 px-12 py-10 ${chip.className}`}>
                <div className="text-muted text-uppercase" style={{ fontSize: "0.65rem", letterSpacing: "0.04em" }}>
                  {chip.label}
                </div>
                <div className="fs-5 fw-semibold">{chip.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="table-responsive border rounded-2 mb-16">
          <table className="table table-sm table-hover align-middle mb-0">
            <thead className="table-light text-muted small">
              <tr>
                <th className="text-center" style={{ width: 40 }}>
                  Incl.
                </th>
                <th>Product</th>
                <th>Lot / expiry</th>
                <th className="text-end">Sent</th>
                <th className="text-end">Prior</th>
                <th className="text-end">Rem.</th>
                <th className="text-end text-warning">Dmg</th>
                <th className="text-end text-danger">Short</th>
                <th className="text-end text-success">Acc.</th>
                <th className="text-end text-primary">Excess</th>
                <th className="text-center" style={{ width: 88 }}>
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {(dispatch.items ?? []).map((line) => {
                const key = dispatchLineKey(line);
                const rem = getDispatchLineRemaining(line);
                const inp = lineInputs[key] ?? {
                  damage: "0",
                  shortage: "0",
                  excess: "0",
                  reasonCode: "",
                  lineNote: "",
                  followUpNote: "",
                };
                const dmg = parseNonNegInt(inp.damage);
                const sh = parseNonNegInt(inp.shortage);
                const ex = parseNonNegInt(inp.excess);
                const acceptedQty = rem > 0 ? acceptedFromDamageShort(rem, dmg, sh) : 0;
                const rowErr = getRowError(line);
                const checked = !!rowChecked[key];
                const needsPanel = lineNeedsDetailPanel(dmg, sh, ex);
                const flagged = needsPanel && checked;
                const open = !!detailOpen[key];
                const t = line.variant?.title ?? "";
                const sku = line.variant?.sku ?? "";
                const variantName = t && sku ? `${t} (${sku})` : t || sku || `Variant ${line.variantId}`;
                const lotDisplay = line.lot
                  ? `${line.lot.lotCode ?? line.lot.id}${line.lot.expDate ? " · " + new Date(line.lot.expDate).toLocaleDateString() : ""}`
                  : "—";
                const disp = line.quantityDispatched ?? 0;
                const ar = line.quantityReceived ?? 0;
                const ad = line.quantityDamaged ?? 0;
                const ass = line.quantityShort ?? 0;
                const rowCls = flagged ? "border-start border-primary border-3 bg-light bg-opacity-50" : "";
                return (
                  <Fragment key={key}>
                    <tr className={rowCls}>
                      <td className="text-center">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={checked}
                          onChange={() => toggleRow(key)}
                          disabled={lineInputsLocked}
                          aria-label={`Include line ${variantName}`}
                        />
                      </td>
                      <td>
                        <div className="fw-medium">{variantName}</div>
                        {rowErr ? <div className="small text-danger mt-4">{rowErr}</div> : null}
                      </td>
                      <td className="text-muted small">{lotDisplay}</td>
                      <td className="text-end">{disp}</td>
                      <td className="text-end small text-muted">
                        {ar}/{ad}/{ass}
                      </td>
                      <td className="text-end fw-medium">{rem}</td>
                      <td className="text-end">
                        <LkInput
                          type="number"
                          min={0}
                          size="sm"
                          className="text-end"
                          value={inp.damage ?? "0"}
                          onChange={(e) => updateLine(key, "damage", e.target.value)}
                          disabled={!checked || rem <= 0 || lineInputsLocked}
                        />
                      </td>
                      <td className="text-end">
                        <LkInput
                          type="number"
                          min={0}
                          size="sm"
                          className="text-end"
                          value={inp.shortage ?? "0"}
                          onChange={(e) => updateLine(key, "shortage", e.target.value)}
                          disabled={!checked || rem <= 0 || lineInputsLocked}
                        />
                      </td>
                      <td className="text-end fw-semibold text-success">{checked && rem > 0 ? acceptedQty : "—"}</td>
                      <td className="text-end">
                        <div className="d-flex flex-column align-items-end gap-4">
                          <LkInput
                            type="number"
                            min={0}
                            size="sm"
                            className="text-end"
                            style={{ maxWidth: 72 }}
                            value={inp.excess ?? "0"}
                            onChange={(e) => updateLine(key, "excess", e.target.value)}
                            disabled={!checked || lineInputsLocked}
                          />
                          {ex > 0 ? (
                            <span className="badge rounded-pill bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 small fw-normal">
                              Not auto-posted
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          className={`btn btn-sm ${needsPanel ? "btn-outline-primary" : "btn-link text-muted"}`}
                          onClick={() => toggleDetail(key)}
                          disabled={!checked || lineInputsLocked}
                          aria-expanded={open}
                        >
                          {open ? "Hide" : "Details"}
                        </button>
                      </td>
                    </tr>
                    {checked && open ? (
                      <tr className={`${rowCls} border-top-0`}>
                        <td colSpan={11} className="bg-light pt-0 pb-16 px-16">
                          <div className="border rounded-2 bg-white p-16 shadow-sm">
                            <div className="row g-16">
                              <div className="col-md-4">
                                <label className="form-label small text-muted mb-4">Discrepancy reason</label>
                                <LkSelect
                                  size="sm"
                                  className="w-100"
                                  value={inp.reasonCode ?? ""}
                                  onChange={(e) => updateLine(key, "reasonCode", e.target.value)}
                                  disabled={lineInputsLocked}
                                >
                                  {DISPATCH_RECEIVE_DISCREPANCY_REASON_OPTIONS.map((o) => (
                                    <option key={o.value || "none"} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </LkSelect>
                              </div>
                              <div className="col-md-8">
                                <label className="form-label small text-muted mb-4">Discrepancy details</label>
                                <textarea
                                  className="form-control form-control-sm"
                                  rows={2}
                                  value={inp.lineNote ?? ""}
                                  onChange={(e) => updateLine(key, "lineNote", e.target.value)}
                                  placeholder="Required when damage, shortage, or excess is recorded"
                                  disabled={lineInputsLocked}
                                />
                                <div className="form-text small mt-4">{DISCREPANCY_DETAILS_HELPER}</div>
                              </div>
                              <div className="col-12">
                                <label className="form-label small text-muted mb-4">Follow-up / disposition (optional)</label>
                                <LkInput
                                  type="text"
                                  size="sm"
                                  value={inp.followUpNote ?? ""}
                                  onChange={(e) => updateLine(key, "followUpNote", e.target.value)}
                                  placeholder="e.g. Segregated in quarantine bin; notify warehouse; awaiting return label"
                                  disabled={lineInputsLocked}
                                />
                              </div>
                              {ex > 0 ? (
                                <div className="col-12">
                                  <div className="alert alert-primary py-8 px-12 mb-0 small">
                                    <strong>Excess:</strong> {EXCESS_FIELD_HELPER}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mb-16">
          <label className="form-label">Receiving notes (optional)</label>
          <textarea
            className="form-control form-control-sm"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={RECEIVING_NOTES_PLACEHOLDER}
            disabled={lineInputsLocked}
          />
        </div>
      </Card>

      <div className="bg-white border-top shadow-sm py-12 px-16">
        <div className="container d-flex flex-wrap align-items-center justify-content-between gap-8">
          <div className="small text-muted">
            {dispatch.status !== "IN_TRANSIT" ? "Actions enabled when dispatch is IN_TRANSIT (except prints)." : null}
          </div>
          <div className="d-flex flex-wrap gap-2 justify-content-end">
            {dispatch.status === "IN_TRANSIT" && !isPosted && !readOnlyWorkspace && (
              <button type="button" className="btn btn-sm btn-outline-info" onClick={fillAllRemaining} disabled={submitting}>
                Full receive: clear damage, shortage, excess (all lines)
              </button>
            )}
            {dispatch.status === "IN_TRANSIT" && !isPosted && !readOnlyWorkspace && (
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={handleSaveVerification} disabled={submitting || !canSubmitAny}>
                Save verification
              </button>
            )}
            {dispatch.status === "IN_TRANSIT" && !isPosted && !readOnlyWorkspace && !isAwaiting && (
              <button type="button" className="btn btn-sm btn-warning text-dark" onClick={handleSubmitForManager} disabled={submitting || !canSubmitAny}>
                Submit for confirmation
              </button>
            )}
            {dispatch.status === "IN_TRANSIT" && canManagerConfirm && !isPosted && !readOnlyWorkspace && (
              <button
                type="button"
                className="btn btn-sm btn-success"
                onClick={handleConfirm}
                disabled={submitting || (!isAwaiting && !canSubmitAny)}
                title={isAwaiting ? "Post saved session to stock" : "Save valid lines first, or submit then confirm"}
              >
                {isAwaiting ? "Confirm & post stock" : "Confirm directly (from draft)"}
              </button>
            )}
            {dispatch.status === "IN_TRANSIT" && canManagerConfirm && !isPosted && !readOnlyWorkspace && (
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleLegacyImmediate} disabled={submitting || !canSubmitAny}>
                Receive now (legacy immediate)
              </button>
            )}
            {sessionStatus === "DRAFT" && !isPosted && !readOnlyWorkspace && (
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={handleCancelDraft} disabled={submitting}>
                Cancel draft
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
