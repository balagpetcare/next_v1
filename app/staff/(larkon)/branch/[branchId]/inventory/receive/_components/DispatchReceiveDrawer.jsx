"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Offcanvas } from "react-bootstrap";
import LkInput from "@larkon-ui/components/LkInput";
import { staffGetDispatch, staffReceiveDispatch } from "@/lib/api";
import { useToast } from "@/src/hooks/useToast";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

function statusBadge(status) {
  const map = {
    IN_TRANSIT: "bg-info",
    DELIVERED: "bg-success",
    CREATED: "bg-secondary",
    PACKED: "bg-warning text-dark",
  };
  return map[status] ?? "bg-secondary";
}

function formatSentDate(dispatch) {
  const d = dispatch?.inTransitAt ?? dispatch?.createdAt;
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString(undefined, { dateStyle: "medium" }) + " " + date.toLocaleTimeString(undefined, { timeStyle: "short" });
}

export default function DispatchReceiveDrawer({ show, onHide, dispatchId, branchId, onSuccess }) {
  const toast = useToast();
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

  const canSubmit = useMemo(() => {
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!dispatch || dispatch.status !== "IN_TRANSIT") {
      toast.error("Dispatch is not in transit. Cannot receive.");
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

  const handleReceiveAll = (e) => {
    e.preventDefault();
    if (!dispatch || dispatch.status !== "IN_TRANSIT") return;
    const items = [];
    (dispatch.items ?? []).forEach((line) => {
      const remaining = getRemaining(line);
      if (remaining <= 0) return;
      items.push({ variantId: line.variantId, lotId: line.lotId ?? undefined, quantityReceived: remaining, quantityDamaged: 0, quantityShort: 0 });
    });
    if (items.length === 0) {
      toast.warning("No remaining quantity to receive.");
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
        setError(getMessageFromApiError(err));
        toast.error(getMessageFromApiError(err));
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
          (d.items ?? []).forEach((line) => {
            const key = `${line.variantId}-${line.lotId ?? 0}`;
            const dispatched = line.quantityDispatched ?? 0;
            const alreadyR = line.quantityReceived ?? 0;
            const alreadyD = line.quantityDamaged ?? 0;
            const alreadyS = line.quantityShort ?? 0;
            const remaining = dispatched - alreadyR - alreadyD - alreadyS;
            init[key] = { received: remaining > 0 ? String(remaining) : "0", damaged: "0", short: "0" };
            checked[key] = false;
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
    <Offcanvas show={show} onHide={onHide} placement="end" className="border-0 shadow-lg" style={{ width: "min(100%, 640px)" }}>
      <Offcanvas.Header closeButton className="border-bottom">
        <Offcanvas.Title>Receive Dispatch #{dispatchId ?? ""}</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        {loading && <p className="text-muted small">Loading dispatch…</p>}
        {!loading && !dispatch && <p className="text-muted small">Dispatch not found.</p>}
        {!loading && dispatch && dispatch.status !== "IN_TRANSIT" && (
          <div className="alert alert-info small">
            Status: <span className={`badge ${statusBadge(dispatch.status)}`}>{dispatch.status}</span>. Receive only when IN_TRANSIT.{" "}
            <Link href={`/staff/branch/${branchId}/inventory/incoming/${dispatchId}`}>Open full page</Link>
          </div>
        )}
        {!loading && dispatch && dispatch.status === "IN_TRANSIT" && (
          <>
            <div className="mb-3 small">
              <div><strong>From:</strong> {fromName}</div>
              <div><strong>To:</strong> {toName}</div>
              <div><strong>Sent:</strong> {sentDate}</div>
            </div>
            {error && (
              <div className="alert alert-danger small d-flex align-items-center justify-content-between mb-3">
                <span>{error}</span>
                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setError("")}>Dismiss</button>
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="table-responsive mb-3" style={{ maxHeight: 280, overflow: "auto" }}>
                <table className="table table-sm table-bordered">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}></th>
                      <th>Product</th>
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
                      return (
                        <tr key={key} className={rowErr ? "table-danger" : ""} onClick={() => remaining > 0 && toggleRow(key)} style={{ cursor: remaining > 0 ? "pointer" : "" }}>
                          <td onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" className="form-check-input" checked={!!checked} onChange={() => toggleRow(key)} disabled={remaining <= 0} />
                          </td>
                          <td className="small">{variantName}{rowErr && <div className="text-danger">{rowErr}</div>}</td>
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
                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || receiveSuccess || !canSubmit}>
                  {receiveSuccess ? "Received" : submitting ? "Receiving…" : "Receive selected"}
                </button>
                <button type="button" className="btn btn-outline-primary btn-sm" disabled={submitting || receiveSuccess || !hasRemaining} onClick={handleReceiveAll}>
                  Receive all
                </button>
                <Link href={`/staff/branch/${branchId}/inventory/incoming/${dispatchId}`} className="btn btn-outline-secondary btn-sm" aria-label="Open full receive page">
                  Full page
                </Link>
              </div>
            </form>
          </>
        )}
      </Offcanvas.Body>
    </Offcanvas>
  );
}
