"use client";

export default function ToastViewport({ toasts = [], remove, variantClasses = {} }) {
  if (!toasts?.length) return null;
  const classes = { success: "alert-success", error: "alert-danger", warning: "alert-warning", info: "alert-info", ...variantClasses };

  return (
    <div
      className="toast-viewport"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-item alert ${classes[t.variant] || "alert-info"}`}
          role="alert"
          data-toast-id={t.id}
        >
          <span className="toast-message">{t.message}</span>
          <button
            type="button"
            className="toast-close btn-close"
            aria-label="Dismiss"
            onClick={() => remove(t.id)}
          />
        </div>
      ))}
    </div>
  );
}
