"use client";

import { Fragment, useMemo, useState, useEffect, useCallback } from "react";
import { Dropdown } from "react-bootstrap";
import { grnConfirm, grnPrintUrl, grnSaveVendorReceiveDraft, vendorReceiptPrintUrl } from "@/lib/api";
import { useToast } from "@/src/hooks/useToast";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";
import type { LineQtyField } from "@/src/lib/warehouseReceiveReconcile";
import {
  applyQuantityEdit,
  autoBalanceLine,
  fixInvalidLine,
  isLineBalanced,
  recalculateShort,
  setAllShort,
  setExactReceive,
  type LineQuantities,
} from "@/src/lib/warehouseReceiveReconcile";

export type ManagerLineState = LineQuantities & {
  lineId: number;
  variantSku: string;
  variantTitle: string;
  /** Fixed reconciliation anchor: PO ordered qty, else GRN line quantity */
  expectedRef: number;
  /** PO ordered for display; null if non-PO */
  orderedQty: number | null;
  lastQtyEdit: LineQtyField | null;
  lot: string;
  expiry: string;
  note: string;
};

type LineError = { lineId: number; message: string };

function toDateInput(d: string | Date | null | undefined): string {
  if (!d) return "";
  try {
    const x = typeof d === "string" ? new Date(d) : d;
    if (isNaN(x.getTime())) return "";
    return x.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function buildInitialLines(grn: any): ManagerLineState[] {
  const rows = Array.isArray(grn?.lines) ? grn.lines : [];
  return rows.map((l: any) => {
    const orderedQty = l.purchaseOrderLine?.orderedQty != null ? Math.floor(Number(l.purchaseOrderLine.orderedQty)) : null;
    const q = Math.max(0, Math.floor(Number(l.quantity ?? 0)));
    const expectedRef = orderedQty ?? q;
    return {
      lineId: l.id,
      variantSku: l.variant?.sku ?? "",
      variantTitle: l.variant?.title ?? "",
      expectedRef,
      orderedQty,
      acceptedQty: Math.max(0, Math.floor(Number(l.quantity ?? 0))),
      damagedQty: Math.max(0, Math.floor(Number(l.quantityDamaged ?? 0))),
      shortQty: Math.max(0, Math.floor(Number(l.quantityShort ?? 0))),
      extraQty: Math.max(0, Math.floor(Number(l.quantityExtra ?? 0))),
      lastQtyEdit: null,
      lot: (l.lot?.lotCode ?? l.lotCode ?? "").toString(),
      expiry: toDateInput(l.lot?.expDate ?? l.expDate),
      note: (l.lineDiscrepancyNote ?? "").toString(),
    };
  });
}

function validateLines(rows: ManagerLineState[], allowFinal: boolean): LineError[] {
  const errors: LineError[] = [];
  for (const r of rows) {
    if (r.acceptedQty < 0 || r.damagedQty < 0 || r.shortQty < 0 || r.extraQty < 0) {
      errors.push({ lineId: r.lineId, message: "Quantities cannot be negative." });
      continue;
    }
    if (allowFinal) {
      const lhs = r.acceptedQty + r.damagedQty + r.shortQty;
      const rhs = r.expectedRef + r.extraQty;
      if (lhs !== rhs) {
        errors.push({
          lineId: r.lineId,
          message: `accepted (${r.acceptedQty}) + damaged (${r.damagedQty}) + short (${r.shortQty}) = ${lhs}, but expected (${r.expectedRef}) + extra (${r.extraQty}) = ${rhs}. Adjust to balance.`,
        });
      }
    }
  }
  return errors;
}

function qtySlice(r: ManagerLineState): LineQuantities {
  return {
    acceptedQty: r.acceptedQty,
    damagedQty: r.damagedQty,
    shortQty: r.shortQty,
    extraQty: r.extraQty,
  };
}

function helperText(autoDerived: LineQtyField): string {
  if (autoDerived === "accepted") return "Accepted auto-adjusted from damaged / short / extra.";
  return "Short auto-adjusted from accepted / damaged / extra.";
}

function ConfirmModal({
  onConfirm,
  onCancel,
  busy,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  return (
    <div
      className="modal show d-block"
      style={{ background: "rgba(0,0,0,0.5)" }}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title fw-semibold">Confirm final warehouse receive</h5>
          </div>
          <div className="modal-body">
            <p className="mb-2">
              You are about to <strong>confirm the final warehouse receive</strong> and post stock based on actual counted
              quantities.
            </p>
            <p className="mb-2 text-muted small">
              Stock will be posted using: <strong>accepted qty + extra qty</strong> per line. Damaged quantities are excluded
              from stock. Discrepancy records will be created for damaged, short, and extra lines.
            </p>
            <p className="text-danger fw-semibold small mb-0">This action cannot be undone.</p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="btn btn-success" onClick={onConfirm} disabled={busy}>
              {busy ? "Posting stock…" : "Confirm & post stock"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ManagerReceiveEditor({
  grn,
  onDone,
  onDraftSaved,
  suppressSuccessToast,
}: {
  grn: any;
  onDone: () => void;
  onDraftSaved?: () => void;
  /** When true, parent handles success toast (e.g. vendor receipts detail + redirect). */
  suppressSuccessToast?: boolean;
}) {
  const toast = useToast();
  const [lines, setLines] = useState<ManagerLineState[]>(() => buildInitialLines(grn));
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState(typeof grn?.notes === "string" ? grn.notes : "");
  const [deliveryConditionNote, setDeliveryConditionNote] = useState("");
  const [vendorHandoverNote, setVendorHandoverNote] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [lineErrors, setLineErrors] = useState<LineError[]>([]);
  /** Brief highlight on auto-derived cell */
  const [pulse, setPulse] = useState<{ lineId: number; field: LineQtyField } | null>(null);

  useEffect(() => {
    setLines(buildInitialLines(grn));
    setNotes(typeof grn?.notes === "string" ? grn.notes : "");
  }, [grn]);

  useEffect(() => {
    if (!pulse) return;
    const t = window.setTimeout(() => setPulse(null), 1400);
    return () => window.clearTimeout(t);
  }, [pulse]);

  const summary = useMemo(() => {
    let exp = 0,
      acc = 0,
      dmg = 0,
      sho = 0,
      ext = 0,
      disc = 0;
    for (const r of lines) {
      exp += r.expectedRef;
      acc += r.acceptedQty;
      dmg += r.damagedQty;
      sho += r.shortQty;
      ext += r.extraQty;
      if (r.damagedQty > 0 || r.shortQty > 0 || r.extraQty > 0) disc++;
    }
    return { exp, acc, dmg, sho, ext, disc, stockToPost: acc + ext };
  }, [lines]);

  const finalLineErrors = useMemo(() => validateLines(lines, true), [lines]);
  const hasDiscrepancy = useMemo(
    () => lines.some((r) => r.damagedQty > 0 || r.shortQty > 0 || r.extraQty > 0),
    [lines]
  );
  const confirmBlocked = finalLineErrors.length > 0 || summary.stockToPost <= 0;

  const onQtyFieldChange = useCallback((lineId: number, field: LineQtyField, rawValue: number) => {
    setLines((prev) => {
      let derived: LineQtyField | null = null;
      const nextLines = prev.map((r) => {
        if (r.lineId !== lineId) return r;
        const { next, autoDerived } = applyQuantityEdit(r.expectedRef, qtySlice(r), field, rawValue);
        derived = autoDerived;
        return {
          ...r,
          ...next,
          lastQtyEdit: field,
        };
      });
      if (derived) {
        queueMicrotask(() => setPulse({ lineId, field: derived! }));
      }
      return nextLines;
    });
    setLineErrors([]);
  }, []);

  const autoFillExpected = useCallback(() => {
    setLines((prev) =>
      prev.map((r) => {
        const x = setExactReceive(r.expectedRef);
        return { ...r, ...x, lastQtyEdit: null };
      })
    );
    setLineErrors([]);
  }, []);

  const autoShortAll = useCallback(() => {
    setLines((prev) =>
      prev.map((r) => ({
        ...r,
        ...recalculateShort(r.expectedRef, qtySlice(r)),
        lastQtyEdit: "short" as const,
      }))
    );
    setLineErrors([]);
  }, []);

  const fixInvalidRows = useCallback(() => {
    setLines((prev) =>
      prev.map((r) => ({
        ...r,
        ...fixInvalidLine(r.expectedRef, qtySlice(r)),
        lastQtyEdit: null,
      }))
    );
    setLineErrors([]);
  }, []);

  const autoBalanceAll = useCallback(() => {
    setLines((prev) =>
      prev.map((r) => ({
        ...r,
        ...autoBalanceLine(r.expectedRef, qtySlice(r), r.lastQtyEdit),
        lastQtyEdit: null,
      }))
    );
    setLineErrors([]);
  }, []);

  const rowAutoBalance = useCallback((lineId: number) => {
    setLines((prev) =>
      prev.map((r) =>
        r.lineId === lineId
          ? { ...r, ...autoBalanceLine(r.expectedRef, qtySlice(r), r.lastQtyEdit), lastQtyEdit: null }
          : r
      )
    );
    setLineErrors([]);
  }, []);

  const rowExactReceive = useCallback((lineId: number) => {
    setLines((prev) =>
      prev.map((r) =>
        r.lineId === lineId ? { ...r, ...setExactReceive(r.expectedRef), lastQtyEdit: null } : r
      )
    );
    setLineErrors([]);
  }, []);

  const rowAllShort = useCallback((lineId: number) => {
    setLines((prev) =>
      prev.map((r) =>
        r.lineId === lineId ? { ...r, ...setAllShort(r.expectedRef, r.extraQty), lastQtyEdit: null } : r
      )
    );
    setLineErrors([]);
  }, []);

  const reset = useCallback(() => {
    setLines(buildInitialLines(grn));
    setNotes(typeof grn?.notes === "string" ? grn.notes : "");
    setDeliveryConditionNote("");
    setVendorHandoverNote("");
    setLineErrors([]);
  }, [grn]);

  const saveDraft = async () => {
    const draftErrs = validateLines(lines, false);
    if (draftErrs.length) {
      setLineErrors(draftErrs);
      toast.error("Fix negative quantities before saving draft.");
      return;
    }
    setBusy(true);
    try {
      await grnSaveVendorReceiveDraft(grn.id, {
        notes: notes.trim() || undefined,
        lines: lines.map((r) => ({
          lineId: r.lineId,
          acceptedQty: r.acceptedQty,
          damagedQty: r.damagedQty,
          shortQty: r.shortQty,
          extraQty: r.extraQty,
          lot: r.lot.trim() || null,
          expiry: r.expiry || null,
          note: r.note.trim() || null,
        })),
      });
      toast.success("Draft saved.");
      setLineErrors([]);
      onDraftSaved?.();
    } catch (e: unknown) {
      toast.error(getMessageFromApiError(e as Error));
    } finally {
      setBusy(false);
    }
  };

  const requestConfirm = () => {
    if (confirmBlocked) {
      setLineErrors(finalLineErrors);
      toast.error(
        summary.stockToPost <= 0
          ? "Cannot confirm: stock to post is zero."
          : `${finalLineErrors.length} line(s) have reconciliation errors. Fix them before confirming.`
      );
      return;
    }
    setShowConfirmModal(true);
  };

  const doConfirm = async () => {
    setBusy(true);
    try {
      await grnConfirm(grn.id, {
        notes: notes.trim() || undefined,
        deliveryConditionNote: deliveryConditionNote.trim() || undefined,
        vendorHandoverNote: vendorHandoverNote.trim() || undefined,
        lines: lines.map((r) => ({
          lineId: r.lineId,
          acceptedQty: r.acceptedQty,
          damagedQty: r.damagedQty,
          shortQty: r.shortQty,
          extraQty: r.extraQty,
          lot: r.lot.trim() || null,
          expiry: r.expiry || null,
          note: r.note.trim() || null,
        })),
      });
      setShowConfirmModal(false);
      if (!suppressSuccessToast) toast.success("GRN confirmed and stock posted.");
      onDone();
    } catch (e: unknown) {
      setShowConfirmModal(false);
      toast.error(getMessageFromApiError(e as Error));
    } finally {
      setBusy(false);
    }
  };

  const grnId = Number(grn?.id);
  const errorByLineId = useMemo(
    () => new Map((lineErrors.length ? lineErrors : finalLineErrors).map((e) => [e.lineId, e.message])),
    [lineErrors, finalLineErrors]
  );

  const cellPulse = (lineId: number, field: LineQtyField) =>
    pulse?.lineId === lineId && pulse?.field === field ? "table-info" : "";

  return (
    <>
      {showConfirmModal && (
        <ConfirmModal onConfirm={doConfirm} onCancel={() => setShowConfirmModal(false)} busy={busy} />
      )}

      <div className="card border radius-12">
        <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            <span className="fw-semibold">Manager receive confirmation</span>
            <span className="text-muted small ms-2">GRN #{grnId}</span>
            {hasDiscrepancy && <span className="badge bg-warning text-dark ms-2 small">Discrepancy</span>}
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button type="button" className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={reset}>
              Reset
            </button>
            <button type="button" className="btn btn-sm btn-outline-primary" disabled={busy} onClick={autoFillExpected}>
              Auto-fill expected (mark all received)
            </button>
            <button type="button" className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={autoShortAll}>
              Recalculate short
            </button>
            <button type="button" className="btn btn-sm btn-outline-warning" disabled={busy} onClick={fixInvalidRows}>
              Fix invalid rows
            </button>
            <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={autoBalanceAll}>
              Auto balance all
            </button>
          </div>
        </div>

        <div className="card-body">
          <p className="small text-muted mb-3 mb-md-2">
            <strong>Rule:</strong> accepted + damaged + short = expected + extra. Editing damaged, short, or extra adjusts{" "}
            <em>accepted</em>; editing accepted adjusts <em>short</em>. Use toolbar or row actions to rebalance.
          </p>

          {finalLineErrors.length > 0 && (
            <div className="alert alert-danger py-2 small mb-3">
              <strong>{finalLineErrors.length} line(s) have reconciliation errors</strong> — confirm is blocked until fixed.
              Use <em>Recalculate short</em>, <em>Fix invalid rows</em>, or <em>Auto balance all</em>.
              <ul className="mb-0 mt-1 ps-3">
                {finalLineErrors.slice(0, 5).map((e) => (
                  <li key={e.lineId}>
                    Line #{e.lineId}: {e.message}
                  </li>
                ))}
                {finalLineErrors.length > 5 && <li>…and {finalLineErrors.length - 5} more</li>}
              </ul>
            </div>
          )}

          {hasDiscrepancy && finalLineErrors.length === 0 && (
            <div className="alert alert-warning py-2 small mb-3">
              One or more lines have damage, short, or extra quantities. These will be recorded as discrepancies when stock is
              posted.
            </div>
          )}

          <div className="row g-3 mb-3">
            <div className="col-md-4">
              <label className="form-label small text-muted">GRN notes (optional)</label>
              <textarea
                className="form-control form-control-sm"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={busy}
                placeholder="Internal notes for this receive…"
              />
            </div>
            <div className="col-md-4">
              <label className="form-label small text-muted">Delivery condition note</label>
              <textarea
                className="form-control form-control-sm"
                rows={2}
                value={deliveryConditionNote}
                onChange={(e) => setDeliveryConditionNote(e.target.value)}
                disabled={busy}
                placeholder="e.g. Cartons wet on arrival, truck seal intact…"
              />
            </div>
            <div className="col-md-4">
              <label className="form-label small text-muted">Vendor handover note (optional)</label>
              <textarea
                className="form-control form-control-sm"
                rows={2}
                value={vendorHandoverNote}
                onChange={(e) => setVendorHandoverNote(e.target.value)}
                disabled={busy}
                placeholder="e.g. Partial delivery acknowledged by vendor rep…"
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-sm table-bordered align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ minWidth: "100px" }}>Actions</th>
                  <th>SKU / Product</th>
                  <th className="text-end">Expected</th>
                  <th className="text-end" style={{ minWidth: "88px" }}>
                    Accepted
                  </th>
                  <th className="text-end" style={{ minWidth: "88px" }}>
                    Damaged
                  </th>
                  <th className="text-end" style={{ minWidth: "88px" }}>
                    Short
                  </th>
                  <th className="text-end" style={{ minWidth: "88px" }}>
                    Extra
                  </th>
                  <th style={{ minWidth: "120px" }}>Batch / lot</th>
                  <th style={{ minWidth: "140px" }}>Expiry</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((r) => {
                  const rowError = errorByLineId.get(r.lineId);
                  const rowDisc = r.damagedQty > 0 || r.shortQty > 0 || r.extraQty > 0;
                  return (
                    <Fragment key={r.lineId}>
                      <tr className={rowError ? "table-danger" : rowDisc ? "table-warning" : ""}>
                        <td>
                          <Dropdown>
                            <Dropdown.Toggle size="sm" variant="outline-secondary" id={`row-act-${r.lineId}`} disabled={busy}>
                              Row
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                              <Dropdown.Item onClick={() => rowAutoBalance(r.lineId)}>Auto balance row</Dropdown.Item>
                              <Dropdown.Item onClick={() => rowExactReceive(r.lineId)}>Set exact receive</Dropdown.Item>
                              <Dropdown.Item onClick={() => rowAllShort(r.lineId)}>Set all short</Dropdown.Item>
                              <Dropdown.Item onClick={() => rowExactReceive(r.lineId)}>Clear discrepancy</Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
                        </td>
                        <td>
                          <div className="small text-muted">{r.variantSku}</div>
                          <div>{r.variantTitle}</div>
                        </td>
                        <td className="text-end fw-semibold">{r.orderedQty ?? r.expectedRef}</td>
                        <td className={`text-end ${cellPulse(r.lineId, "accepted")}`}>
                          <input
                            type="number"
                            min={0}
                            className="form-control form-control-sm text-end"
                            value={r.acceptedQty}
                            onChange={(e) => onQtyFieldChange(r.lineId, "accepted", Number(e.target.value) || 0)}
                            disabled={busy}
                          />
                          {pulse?.lineId === r.lineId && pulse?.field === "accepted" && (
                            <div className="text-muted" style={{ fontSize: "0.65rem" }}>
                              {helperText("accepted")}
                            </div>
                          )}
                        </td>
                        <td className="text-end">
                          <input
                            type="number"
                            min={0}
                            className="form-control form-control-sm text-end"
                            value={r.damagedQty}
                            onChange={(e) => onQtyFieldChange(r.lineId, "damaged", Number(e.target.value) || 0)}
                            disabled={busy}
                          />
                        </td>
                        <td className={`text-end ${cellPulse(r.lineId, "short")}`}>
                          <input
                            type="number"
                            min={0}
                            className="form-control form-control-sm text-end"
                            value={r.shortQty}
                            onChange={(e) => onQtyFieldChange(r.lineId, "short", Number(e.target.value) || 0)}
                            disabled={busy}
                          />
                          {pulse?.lineId === r.lineId && pulse?.field === "short" && (
                            <div className="text-muted" style={{ fontSize: "0.65rem" }}>
                              {helperText("short")}
                            </div>
                          )}
                        </td>
                        <td className="text-end">
                          <input
                            type="number"
                            min={0}
                            className="form-control form-control-sm text-end"
                            value={r.extraQty}
                            onChange={(e) => onQtyFieldChange(r.lineId, "extra", Number(e.target.value) || 0)}
                            disabled={busy}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={r.lot}
                            onChange={(e) =>
                              setLines((p) => p.map((x) => (x.lineId === r.lineId ? { ...x, lot: e.target.value } : x)))
                            }
                            disabled={busy}
                            placeholder="Lot code"
                          />
                        </td>
                        <td>
                          <input
                            type="date"
                            className="form-control form-control-sm"
                            value={r.expiry}
                            onChange={(e) =>
                              setLines((p) => p.map((x) => (x.lineId === r.lineId ? { ...x, expiry: e.target.value } : x)))
                            }
                            disabled={busy}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={r.note}
                            onChange={(e) =>
                              setLines((p) => p.map((x) => (x.lineId === r.lineId ? { ...x, note: e.target.value } : x)))
                            }
                            disabled={busy}
                            placeholder="Line note"
                          />
                        </td>
                      </tr>
                      {rowError && (
                        <tr className="table-danger">
                          <td colSpan={10} className="py-1 px-2">
                            <span className="text-danger small">
                              <i className="ri-error-warning-line me-1" />
                              {rowError}
                            </span>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="card bg-light border-0 mt-3">
            <div className="card-body py-2">
              <div className="row g-2 small">
                <div className="col-6 col-md-2">
                  <div className="text-muted">Total expected (ref)</div>
                  <div className="fw-semibold">{summary.exp}</div>
                </div>
                <div className="col-6 col-md-2">
                  <div className="text-muted">Total accepted</div>
                  <div className="fw-semibold text-success">{summary.acc}</div>
                </div>
                <div className="col-6 col-md-2">
                  <div className="text-muted">Total damaged</div>
                  <div className="fw-semibold text-warning">{summary.dmg}</div>
                </div>
                <div className="col-6 col-md-2">
                  <div className="text-muted">Total short</div>
                  <div className="fw-semibold text-secondary">{summary.sho}</div>
                </div>
                <div className="col-6 col-md-2">
                  <div className="text-muted">Total extra</div>
                  <div className="fw-semibold text-info">{summary.ext}</div>
                </div>
                <div className="col-6 col-md-1">
                  <div className="text-muted">Stock to post</div>
                  <div className="fw-bold text-primary">{summary.stockToPost}</div>
                </div>
                <div className="col-6 col-md-1">
                  <div className="text-muted">Discrepancy lines</div>
                  <div className={`fw-semibold ${summary.disc > 0 ? "text-warning" : "text-muted"}`}>{summary.disc}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 d-flex flex-wrap gap-2 align-items-center">
            <button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={saveDraft}>
              {busy ? "Saving…" : "Save draft edits"}
            </button>
            <button
              type="button"
              className="btn btn-success"
              disabled={busy || confirmBlocked}
              onClick={requestConfirm}
              title={confirmBlocked ? "Fix reconciliation errors before confirming" : "Confirm final receive and post stock"}
            >
              {busy ? "Posting…" : "Confirm & post stock"}
            </button>
            <div className="ms-auto d-flex flex-wrap gap-2">
              <a
                href={vendorReceiptPrintUrl(grnId, "grn")}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-outline-secondary"
              >
                <i className="ri-printer-line me-1" />
                Print GRN
              </a>
              <a
                href={vendorReceiptPrintUrl(grnId, "delivery-note")}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-outline-secondary"
              >
                <i className="ri-truck-line me-1" />
                Print delivery note
              </a>
              <a
                href={`/api/v1/grn/${grnId}/print/worksheet`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-outline-secondary"
              >
                <i className="ri-file-list-3-line me-1" />
                Print worksheet
              </a>
              <a
                href={grnPrintUrl(grnId, "discrepancy")}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-outline-warning"
              >
                <i className="ri-error-warning-line me-1" />
                Print discrepancy
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
