"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Offcanvas, Badge } from "react-bootstrap";
import LkInput from "@larkon-ui/components/LkInput";
import { staffGetDispatch, staffReceiveDispatch, dispatchPrintUrl } from "@/lib/api";
import { useToast } from "@/src/hooks/useToast";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";
import { useBranchContext } from "@/lib/useBranchContext";

function statusBadge(status) {
  const map = {
    IN_TRANSIT: "bg-info",
    DELIVERED: "bg-success",
    CREATED: "bg-secondary",
    PACKED: "bg-warning text-dark",
  };
  return map[status] ?? "bg-secondary";
}

function sessionStatusBadge(status) {
  if (!status) return null;
  const map = {
    DRAFT: { cls: "bg-secondary", label: "Draft" },
    AWAITING_CONFIRMATION: { cls: "bg-warning text-dark", label: "Awaiting confirmation" },
    POSTED: { cls: "bg-success", label: "Posted" },
    CANCELLED: { cls: "bg-danger", label: "Cancelled" },
  };
  const s = map[status] ?? { cls: "bg-secondary", label: status };
  return <Badge className={s.cls}>{s.label}</Badge>;
}

function formatSentDate(dispatch) {
  const d = dispatch?.inTransitAt ?? dispatch?.createdAt;
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString(undefined, { dateStyle: "medium" }) + " " + date.toLocaleTimeString(undefined, { timeStyle: "short" });
}

export default function DispatchReceiveDrawer({ show, onHide, dispatchId, branchId, onSuccess }) {
  const toast = useToast();
  const { myAccess } = useBranchContext(branchId);
  const perms = useMemo(() => new Set(myAccess?.permissions ?? []), [myAccess]);
  const canConfirm = perms.has("dispatch.receive.confirm.branch_manager");

  const [dispatch, setDispatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receiveSuccess, setReceiveSuccess] = useState(false);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [lineInputs, setLineInputs] = useState({});
  const [rowChecked, setRowChecked] = useState({});

  const getLineKey = (line) => `${line.variantId}-${line.lotId ?? 0}`;

  const getRemaining = useCallback((line) => {
    const dispatched = line.quantityDispatched ?? 0;
    const alreadyR = line.quantityReceived ?? 0;
    const alreadyD = line.quantityDamaged ?? 0;
    const alreadyS = line.quantityShort ?? 0;
    return dispatched - alreadyR - alreadyD - alreadyS;
  }, []);

  const updateLine = (key, field, value) => {
    setLineInputs((prev) => ({ ...prev, [key]: { ...(prev[key] ?? {}), [field]: value } }));
  };

  const toggleRow = (key) => {
    setRowChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const receiveAll = () => {
    if (!dispatch?.items?.length) return;
    const nextChecked = { ...rowChecked };
    const nextInputs = { ...lineInputs };
    dispatch.items.forEach((line) => {
      const key = getLineKey(line);
      const remaining = getRemaining(line);
      if (remaining > 0) {
        nextChecked[key] = true;
        nextInputs[key] = { ...(nextInputs[key] ?? {}), received: String(remaining), damaged: "0", short: "0" };
      }
    });
    setRowChecked(nextChecked);
    setLineInputs(nextInputs);
  };

  const getRowTotal = (key) => {
    const inp = lineInputs[key] ?? { received: "0", damaged: "0", short: "0" };
    return Math.max(0, parseInt(inp.received ?? "0", 10)) + Math.max(0, parseInt(inp.damaged ?? "0", 10)) + Math.max(0, parseInt(inp.short ?? "0", 10));
  };

  const getRowError = (line) => {
    const key = getLineKey(line);
    if (!rowChecked[key]) return null;
    const remaining = getRemaining(line);
    const total = getRowTotal(key);
    if (total > remaining) return `Total cannot exceed ${remaining}`;
    return null;
  };

  const hasDiscrepancy = (line) => {
    const key = getLineKey(line);
    if (!rowChecked[key]) return false;
    const inp = lineInputs[key] ?? {};
    const dam = parseInt(inp.damaged ?? "0", 10);
    const sh = parseInt(inp.short ?? "0", 10);
    const recv = parseInt(inp.received ?? "0", 10);
    const remaining = getRemaining(line);
    return dam > 0 || sh > 0 || recv < remaining;
  };

  const canSubmitAny = useMemo(() => {
    if (!dispatch?.items?.length || receiveSuccess || submitting) return false;
    let hasAnyChecked = false;
    let allValid = true;
    for (const line of dispatch.items) {
      const key = getLineKey(line);
      if (!rowChecked[key]) continue;
      hasAnyChecked = true;
      const total = getRowTotal(key);
      if (total <= 0) allValid = false;
      if (total > getRemaining(line)) allValid = false;
    }
    return hasAnyChecked && allValid;
  }, [dispatch?.items, lineInputs, rowChecked, receiveSuccess, submitting, getRemaining]);

  const buildItems = useCallback(() => {
    const items = [];
    (dispatch?.items ?? []).forEach((line) => {
      const key = getLineKey(line);
      if (!rowChecked[key]) return;
      const inp = lineInputs[key];
      if (!inp) return;
      const received = Math.max(0, parseInt(inp.received ?? "0", 10));
      const damaged = Math.max(0, parseInt(inp.damaged ?? "0", 10));
      const short = Math.max(0, parseInt(inp.short ?? "0", 10));
      if (received + damaged + short <= 0) return;
      const remaining = getRemaining(line);
      if (received + damaged + short > remaining) return;
      items.push({ variantId: line.variantId, lotId: line.lotId ?? undefined, quantityReceived: received, quantityDamaged: damaged, quantityShort: short });
    });
    return items;
  }, [dispatch?.items, rowChecked, lineInputs, getRemaining]);

  const sessionStatus = dispatch?.dispatchReceiveSession?.status;
  const isAwaitingConfirmation = sessionStatus === "AWAITING_CONFIRMATION";
  const isPosted = sessionStatus === "POSTED";

  const handleAction = async (mode) => {
    if (!dispatch) return;
    const items = mode === "submit" ? undefined : buildItems();
    if (mode === "verify" && (!items || items.length === 0)) {
      toast.warning("Select at least one line with quantity.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await staffReceiveDispatch(dispatchId, { items, notes, receiveMode: mode });
      const labels = { verify: "Verification saved", submit: "Submitted for confirmation", confirm: "Confirmed & posted" };
      toast.success(labels[mode] || "Done", { duration: 5000 });
      if (mode === "confirm") {
        setReceiveSuccess(true);
        onSuccess?.();
        setTimeout(onHide, 800);
      } else {
        onSuccess?.();
        setLoading(true);
        staffGetDispatch(dispatchId)
          .then((d) => d && setDispatch(d))
          .finally(() => setLoading(false));
      }
    } catch (err) {
      const msg = getMessageFromApiError(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLegacyReceive = (e) => {
    e.preventDefault();
    if (!canConfirm) {
      handleAction("verify");
      return;
    }
    const items = buildItems();
    if (items.length === 0) {
      toast.warning("Select at least one line with quantity to receive.");
      return;
    }
    setSubmitting(true);
    setError("");
    staffReceiveDispatch(dispatchId, { items, notes })
      .then(() => {
        setReceiveSuccess(true);
        toast.success("Received successfully", { duration: 5000 });
        onSuccess?.();
        setTimeout(onHide, 800);
      })
      .catch((err) => {
        const msg = getMessageFromApiError(err);
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setSubmitting(false));
  };

  useEffect(() => {
    if (!show || !dispatchId || dispatchId <= 0) {
      setDispatch(null);
      setLineInputs({});
      setRowChecked({});
      setError("");
      setReceiveSuccess(false);
      setNotes("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    staffGetDispatch(dispatchId)
      .then((d) => {
        if (cancelled) return;
        if (d) {
          setDispatch(d);
          const init = {};
          const checked = {};
          const sess = d.dispatchReceiveSession;
          (d.items ?? []).forEach((line) => {
            const key = `${line.variantId}-${line.lotId ?? 0}`;
            const dispatched = line.quantityDispatched ?? 0;
            const alreadyR = line.quantityReceived ?? 0;
            const alreadyD = line.quantityDamaged ?? 0;
            const alreadyS = line.quantityShort ?? 0;
            const remaining = dispatched - alreadyR - alreadyD - alreadyS;
            const sessLine = sess?.lines?.find((sl) => sl.stockDispatchItemId === line.id);
            init[key] = {
              received: sessLine ? String(sessLine.quantityReceived ?? 0) : remaining > 0 ? String(remaining) : "0",
              damaged: sessLine ? String(sessLine.quantityDamaged ?? 0) : "0",
              short: sessLine ? String(sessLine.quantityShort ?? 0) : "0",
            };
            checked[key] = !!sessLine;
          });
          setLineInputs(init);
          setRowChecked(checked);
        }
      })
      .catch((e) => !cancelled && setError(e?.message ?? "Failed to load dispatch"))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [show, dispatchId]);

  const fromName = dispatch?.fromLocation?.name ?? "—";
  const toName = dispatch?.toLocation?.name ?? "—";
  const sentDate = formatSentDate(dispatch);
  const hasRemaining = dispatch?.items?.some((line) => getRemaining(line) > 0);

  return (
    <Offcanvas show={show} onHide={onHide} placement="end" className="border-0 shadow-lg" style={{ width: "min(100%, 700px)" }}>
      <Offcanvas.Header closeButton className="border-bottom">
        <Offcanvas.Title className="d-flex align-items-center gap-2">
          Receive Dispatch #{dispatchId ?? ""}
          {sessionStatus && <span className="ms-2">{sessionStatusBadge(sessionStatus)}</span>}
        </Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        {loading && <p className="text-muted small">Loading dispatch…</p>}
        {!loading && !dispatch && <p className="text-muted small">Dispatch not found.</p>}
        {!loading && dispatch && dispatch.status !== "IN_TRANSIT" && dispatch.status !== "DELIVERED" && (
          <div className="alert alert-info small">
            Status: <span className={`badge ${statusBadge(dispatch.status)}`}>{dispatch.status}</span>. Receive only when IN_TRANSIT.
          </div>
        )}
        {!loading && dispatch && (dispatch.status === "IN_TRANSIT" || dispatch.status === "DELIVERED") && (
          <>
            <div className="mb-3 small">
              <div><strong>From:</strong> {fromName}</div>
              <div><strong>To:</strong> {toName}</div>
              <div><strong>Sent:</strong> {sentDate}</div>
              {dispatch.vehicleNo && <div><strong>Vehicle:</strong> {dispatch.vehicleNo}</div>}
              {dispatch.driverName && <div><strong>Driver:</strong> {dispatch.driverName}</div>}
            </div>

            {/* Print actions */}
            <div className="d-flex flex-wrap gap-1 mb-3">
              <a href={dispatchPrintUrl(dispatchId, "challan")} target="_blank" rel="noopener" className="btn btn-outline-secondary btn-sm">
                <i className="ri-printer-line me-1" />Challan
              </a>
              <a href={dispatchPrintUrl(dispatchId, "branch-worksheet")} target="_blank" rel="noopener" className="btn btn-outline-secondary btn-sm">
                <i className="ri-file-list-3-line me-1" />Worksheet
              </a>
              {(isPosted || dispatch.status === "DELIVERED") && (
                <>
                  <a href={dispatchPrintUrl(dispatchId, "branch-confirmation")} target="_blank" rel="noopener" className="btn btn-outline-secondary btn-sm">
                    <i className="ri-file-check-line me-1" />Confirmation
                  </a>
                  <a href={dispatchPrintUrl(dispatchId, "discrepancy")} target="_blank" rel="noopener" className="btn btn-outline-secondary btn-sm">
                    <i className="ri-error-warning-line me-1" />Discrepancy
                  </a>
                </>
              )}
            </div>

            {error && (
              <div className="alert alert-danger small d-flex align-items-center justify-content-between mb-3">
                <span>{error}</span>
                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setError("")}>Dismiss</button>
              </div>
            )}

            {isPosted && (
              <div className="alert alert-success small mb-3">
                This dispatch has been received and confirmed. Stock has been posted.
              </div>
            )}

            {isAwaitingConfirmation && !canConfirm && (
              <div className="alert alert-warning small mb-3">
                Verification is saved and awaiting branch manager confirmation. Only a manager can confirm and post stock.
              </div>
            )}

            {isAwaitingConfirmation && canConfirm && (
              <div className="alert alert-info small mb-3">
                Staff has verified quantities. Review and confirm to post stock to branch inventory.
              </div>
            )}

            {!isPosted && dispatch.status === "IN_TRANSIT" && (
              <form onSubmit={handleLegacyReceive}>
                <div className="d-flex justify-content-end mb-2">
                  <button type="button" className="btn btn-sm btn-outline-info" onClick={receiveAll} disabled={!hasRemaining || submitting}>
                    Fill all remaining
                  </button>
                </div>
                <div className="table-responsive mb-3" style={{ maxHeight: 320, overflow: "auto" }}>
                  <table className="table table-sm table-bordered">
                    <thead>
                      <tr>
                        <th style={{ width: 36 }}></th>
                        <th>Product</th>
                        <th className="text-end">Sent</th>
                        <th className="text-end">Rem</th>
                        <th className="text-end" style={{ width: 70 }}>Recv</th>
                        <th className="text-end" style={{ width: 60 }}>Dmg</th>
                        <th className="text-end" style={{ width: 60 }}>Short</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(dispatch.items ?? []).map((line) => {
                        const key = getLineKey(line);
                        const remaining = getRemaining(line);
                        const inp = lineInputs[key] ?? { received: "0", damaged: "0", short: "0" };
                        const variantName = line.variant ? `${line.variant.title ?? ""} (${line.variant.sku ?? ""})`.trim() || `Variant ${line.variantId}` : `Variant ${line.variantId}`;
                        const rowErr = getRowError(line);
                        const checked = rowChecked[key];
                        const disc = hasDiscrepancy(line);
                        return (
                          <tr key={key} className={rowErr ? "table-danger" : disc ? "table-warning" : ""} onClick={() => remaining > 0 && toggleRow(key)} style={{ cursor: remaining > 0 ? "pointer" : "" }}>
                            <td onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" className="form-check-input" checked={!!checked} onChange={() => toggleRow(key)} disabled={remaining <= 0} />
                            </td>
                            <td className="small">
                              {variantName}
                              {line.lot?.lotCode && <span className="text-muted ms-1">Lot: {line.lot.lotCode}</span>}
                              {rowErr && <div className="text-danger small">{rowErr}</div>}
                              {disc && !rowErr && <div className="text-warning small">Discrepancy</div>}
                            </td>
                            <td className="text-end">{line.quantityDispatched}</td>
                            <td className="text-end">{remaining}</td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <LkInput type="number" min={0} size="sm" value={inp.received ?? "0"} onChange={(e) => updateLine(key, "received", e.target.value)} disabled={!checked || remaining <= 0} />
                            </td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <LkInput type="number" min={0} size="sm" value={inp.damaged ?? "0"} onChange={(e) => updateLine(key, "damaged", e.target.value)} disabled={!checked || remaining <= 0} />
                            </td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <LkInput type="number" min={0} size="sm" value={inp.short ?? "0"} onChange={(e) => updateLine(key, "short", e.target.value)} disabled={!checked || remaining <= 0} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mb-2">
                  <label className="form-label small">Receiving notes / discrepancy details (optional)</label>
                  <LkInput
                    type="text"
                    size="sm"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Stored on GRN; use for shortage/damage context"
                  />
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {/* Controlled receive workflow */}
                  {!isAwaitingConfirmation && (
                    <button type="button" className="btn btn-outline-primary btn-sm" disabled={submitting || receiveSuccess || !canSubmitAny} onClick={() => handleAction("verify")}>
                      Save verification
                    </button>
                  )}
                  {!isAwaitingConfirmation && (
                    <button type="button" className="btn btn-warning btn-sm" disabled={submitting || receiveSuccess || !canSubmitAny} onClick={() => handleAction("submit")}>
                      Submit for confirmation
                    </button>
                  )}
                  {canConfirm && (
                    <button type="button" className="btn btn-success btn-sm" disabled={submitting || receiveSuccess || (!isAwaitingConfirmation && !canSubmitAny)} onClick={() => handleAction("confirm")}>
                      {isAwaitingConfirmation ? "Confirm & post stock" : "Confirm directly"}
                    </button>
                  )}
                  {canConfirm && !isAwaitingConfirmation && (
                    <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || receiveSuccess || !canSubmitAny}>
                      Legacy receive (immediate)
                    </button>
                  )}
                </div>
                {!canConfirm && (
                  <p className="text-muted small mt-2 mb-0">
                    You can save or submit verification. A branch manager must confirm to post stock.
                  </p>
                )}
              </form>
            )}
          </>
        )}
      </Offcanvas.Body>
    </Offcanvas>
  );
}
