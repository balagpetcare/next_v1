"use client";

import { useEffect, useState, useCallback } from "react";
import { Offcanvas } from "react-bootstrap";
import LkInput from "@larkon-ui/components/LkInput";
import { staffTransferGet, staffReceiveTransfer } from "@/lib/api";
import { useToast } from "@/src/hooks/useToast";

function statusBadge(status) {
  const s = String(status || "").toUpperCase();
  if (s === "IN_TRANSIT" || s === "SENT") return "bg-info";
  if (s === "COMPLETED" || s === "RECEIVED") return "bg-success";
  return "bg-secondary";
}

export default function TransferReceiveDrawer({
  show,
  onHide,
  transferId,
  branchId: _branchId,
  onSuccess,
  /** When false, show transfer context read-only (no confirm receive). */
  allowReceiveSubmit = true,
}) {
  const toast = useToast();
  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receiveSuccess, setReceiveSuccess] = useState(false);
  const [error, setError] = useState("");
  const [lineItems, setLineItems] = useState([]);

  const canReceive = useCallback((t) => {
    const s = String(t?.status || "").toUpperCase();
    return s === "IN_TRANSIT" || s === "SENT";
  }, []);

  useEffect(() => {
    if (!show || !transferId || transferId <= 0) {
      setTransfer(null);
      setLineItems([]);
      setError("");
      setReceiveSuccess(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    staffTransferGet(transferId)
      .then((t) => {
        if (cancelled || !t) return;
        setTransfer(t);
        const lines = (t.items || []).map((item) => ({
          variantId: item.variantId,
          lotId: item.lotId ?? null,
          variant: item.variant,
          quantitySent: item.quantitySent ?? 0,
          quantityReceivedInput: String(item.quantitySent ?? 0),
          quantityDamaged: "0",
          quantityExpired: "0",
        }));
        setLineItems(lines);
      })
      .catch((e) => !cancelled && setError(e?.message ?? "Failed to load transfer"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [show, transferId]);

  const handleReceiveSubmit = async () => {
    if (!transfer || !canReceive(transfer)) {
      toast.error("Transfer is not in a receivable state.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const items = lineItems.map((line) => ({
        variantId: line.variantId,
        lotId: line.lotId ?? undefined,
        quantityReceived: parseInt(line.quantityReceivedInput || "0", 10),
        quantityDamaged: parseInt(line.quantityDamaged || "0", 10),
        quantityExpired: parseInt(line.quantityExpired || "0", 10),
      }));
      await staffReceiveTransfer(transfer.id, { items });
      setReceiveSuccess(true);
      toast.success("Transfer received successfully", { duration: 5000 });
      onSuccess?.();
    } catch (err) {
      setError(err?.message ?? "Failed to receive transfer");
      toast.error(err?.message ?? "Failed to receive transfer");
    } finally {
      setSubmitting(false);
    }
  };

  const updateLine = (idx, field, value) => {
    setLineItems((rows) => rows.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  };

  return (
    <Offcanvas show={show} onHide={onHide} placement="end" style={{ width: "min(640px, 100vw)" }}>
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>Receive transfer #{transferId ?? ""}</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        {loading && <p className="text-muted small">Loading transfer…</p>}
        {!loading && !transfer && <p className="text-muted small">Transfer not found.</p>}
        {!loading && transfer && !canReceive(transfer) && (
          <p className="small">
            Status: <span className={`badge ${statusBadge(transfer.status)}`}>{transfer.status}</span>. Receive only when
            SENT or IN_TRANSIT.
          </p>
        )}
        {!loading && transfer && canReceive(transfer) && (
          <>
            {error && <div className="alert alert-danger small py-2">{error}</div>}
            {!allowReceiveSubmit ? (
              <div className="alert alert-light border small mb-16" role="status">
                <strong>Read-only.</strong> You can review this transfer. Posting receipts requires{" "}
                <span className="text-body">Receive stock</span> on your role.
              </div>
            ) : null}
            <p className="text-secondary small mb-16">
              From <strong>{transfer.fromLocation?.name ?? "—"}</strong> → To{" "}
              <strong>{transfer.toLocation?.name ?? "—"}</strong>
            </p>
            <p className="text-secondary small mb-16">
              {allowReceiveSubmit ? "Enter received / damaged / expired quantities per line." : "Line quantities (read-only)."}
            </p>
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Variant</th>
                    <th>Sent</th>
                    <th>Received</th>
                    <th>Damaged</th>
                    <th>Expired</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((line, idx) => (
                    <tr key={idx}>
                      <td>{line.variant?.sku ?? line.variant?.title ?? line.variantId}</td>
                      <td>{line.quantitySent}</td>
                      <td>
                        <LkInput
                          type="number"
                          min={0}
                          size="sm"
                          className="radius-12"
                          value={line.quantityReceivedInput}
                          onChange={(e) => updateLine(idx, "quantityReceivedInput", e.target.value)}
                          disabled={receiveSuccess || !allowReceiveSubmit}
                        />
                      </td>
                      <td>
                        <LkInput
                          type="number"
                          min={0}
                          size="sm"
                          className="radius-12"
                          value={line.quantityDamaged}
                          onChange={(e) => updateLine(idx, "quantityDamaged", e.target.value)}
                          disabled={receiveSuccess || !allowReceiveSubmit}
                        />
                      </td>
                      <td>
                        <LkInput
                          type="number"
                          min={0}
                          size="sm"
                          className="radius-12"
                          value={line.quantityExpired}
                          onChange={(e) => updateLine(idx, "quantityExpired", e.target.value)}
                          disabled={receiveSuccess || !allowReceiveSubmit}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="d-flex gap-8 mt-24">
              {allowReceiveSubmit ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={submitting || receiveSuccess}
                  onClick={handleReceiveSubmit}
                >
                  {receiveSuccess ? "Received" : submitting ? "Receiving…" : "Confirm receive"}
                </button>
              ) : null}
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onHide}>
                Close
              </button>
            </div>
          </>
        )}
      </Offcanvas.Body>
    </Offcanvas>
  );
}
