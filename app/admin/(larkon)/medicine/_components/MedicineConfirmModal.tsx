"use client";

import type { ReactNode } from "react";

export type MedicineConfirmVariant = "primary" | "warning" | "danger" | "success";

type Props = {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: MedicineConfirmVariant;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

const variantClass: Record<MedicineConfirmVariant, string> = {
  primary: "btn-primary",
  warning: "btn-warning",
  danger: "btn-danger",
  success: "btn-success",
};

/** WowDash-compatible confirm dialog for medicine workspace destructive / lifecycle actions. */
export default function MedicineConfirmModal({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  confirmVariant = "primary",
  busy = false,
  onClose,
  onConfirm,
}: Props) {
  if (!open) return null;

  return (
    <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }} role="dialog" aria-modal="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content radius-12">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close" onClick={onClose} disabled={busy} aria-label="Close" />
          </div>
          {children ? <div className="modal-body small">{children}</div> : null}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary btn-sm radius-8" onClick={onClose} disabled={busy}>
              {cancelLabel}
            </button>
            <button
              type="button"
              className={`btn btn-sm radius-8 ${variantClass[confirmVariant]}`}
              disabled={busy}
              onClick={() => void onConfirm()}
            >
              {busy ? "Please wait…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
