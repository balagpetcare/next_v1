"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";

/**
 * Confirmation modal for Approve. Optional Reason modal for Reject.
 * Use with DecisionPanel for full flow.
 */
export function ApproveConfirmModal({ open, onClose, onConfirm, loading, entityLabel = "this item" }) {
  if (!open) return null;

  return (
    <div className="modal d-block" style={{ background: "rgba(0,0,0,0.5)" }} tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content radius-12">
          <div className="modal-header">
            <h5 className="modal-title">Approve {entityLabel}</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
          </div>
          <div className="modal-body">
            <p className="mb-0">Are you sure you want to approve? This action will update the verification status.</p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-success" onClick={onConfirm} disabled={loading}>
              {loading ? "Confirming…" : "Confirm Approve"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Reject reason modal: required reason + optional checklist.
 */
export function RejectReasonModal({
  open,
  onClose,
  onConfirm,
  loading,
  entityLabel = "this item",
  requiredReason = true,
}) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (requiredReason && !reason.trim()) return;
    onConfirm(reason.trim());
    setReason("");
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  if (!open) return null;

  return (
    <div className="modal d-block" style={{ background: "rgba(0,0,0,0.5)" }} tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content radius-12">
          <div className="modal-header">
            <h5 className="modal-title">Reject {entityLabel}</h5>
            <button type="button" className="btn-close" onClick={handleClose} aria-label="Close" />
          </div>
          <div className="modal-body">
            <p className="mb-2">{requiredReason ? "Provide a reason for rejection (required)." : "Optionally provide a reason for rejection."} The applicant will see this.</p>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Reason for rejection…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleConfirm}
              disabled={loading || (requiredReason && !reason.trim())}
            >
              {loading ? "Rejecting…" : "Reject"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
