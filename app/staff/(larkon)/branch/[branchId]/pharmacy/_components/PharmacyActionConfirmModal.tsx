"use client";

type Props = {
  show: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger = red confirm button */
  variant?: "primary" | "danger" | "success";
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export default function PharmacyActionConfirmModal({
  show,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  busy = false,
  onConfirm,
  onClose,
}: Props) {
  if (!show) return null;

  const btnClass =
    variant === "danger"
      ? "btn-danger"
      : variant === "success"
        ? "btn-success"
        : "btn-primary";

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pharmacy-confirm-title"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content radius-12" onMouseDown={(e) => e.stopPropagation()}>
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title" id="pharmacy-confirm-title">
              {title}
            </h5>
            <button type="button" className="btn-close" aria-label="Close" disabled={busy} onClick={onClose} />
          </div>
          <div className="modal-body pt-0 text-secondary small">{message}</div>
          <div className="modal-footer border-0 pt-0">
            <button type="button" className="btn btn-outline-secondary btn-sm radius-12" disabled={busy} onClick={onClose}>
              {cancelLabel}
            </button>
            <button type="button" className={`btn btn-sm radius-12 ${btnClass}`} disabled={busy} onClick={onConfirm}>
              {busy ? "Please wait…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
