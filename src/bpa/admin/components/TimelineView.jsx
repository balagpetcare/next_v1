"use client";

/**
 * Activity timeline for verification logs (exclude COMMENT / INTERNAL_NOTE).
 */
export default function TimelineView({ logs = [], emptyMessage = "No activity yet." }) {
  const items = (logs || []).filter((l) => !["COMMENT", "INTERNAL_NOTE"].includes(l.action));
  if (!items.length) {
    return (
      <div className="text-secondary text-center py-3" style={{ fontSize: 13 }}>
        {emptyMessage}
      </div>
    );
  }

  const getStatusColor = (status) => {
    if (!status) return "secondary";
    const s = String(status).toUpperCase();
    if (s === "VERIFIED" || s === "APPROVED") return "success";
    if (s === "REJECTED") return "danger";
    if (s === "SUBMITTED" || s === "UNDER_REVIEW") return "info";
    if (s === "REQUEST_CHANGES") return "warning";
    return "secondary";
  };

  return (
    <div className="d-flex flex-column gap-2">
      {items.map((l, idx) => (
        <div
          key={l.id || idx}
          className="border rounded radius-8 p-3 position-relative"
          style={{ paddingLeft: 36 }}
        >
          <div
            className="position-absolute start-0 top-0 h-100 rounded-start"
            style={{
              width: 4,
              background: `var(--bs-${getStatusColor(l.toStatus || l.fromStatus)}, #6c757d)`,
            }}
          />
          <div className="d-flex justify-content-between gap-2 mb-1">
            <span className="fw-semibold" style={{ fontSize: 14 }}>
              {l.action}
            </span>
            <span className="text-secondary" style={{ fontSize: 12 }}>
              {l.createdAt ? new Date(l.createdAt).toLocaleString() : "—"}
            </span>
          </div>
          {(l.fromStatus || l.toStatus) && (
            <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
              {l.fromStatus && (
                <span className={`badge bg-${getStatusColor(l.fromStatus)} bg-opacity-25 text-${getStatusColor(l.fromStatus)}`}>
                  {l.fromStatus}
                </span>
              )}
              {l.fromStatus && l.toStatus && <span className="text-secondary">→</span>}
              {l.toStatus && (
                <span className={`badge bg-${getStatusColor(l.toStatus)} bg-opacity-25 text-${getStatusColor(l.toStatus)}`}>
                  {l.toStatus}
                </span>
              )}
            </div>
          )}
          {l.note && (
            <div
              className="text-secondary mt-2 p-2 bg-light rounded"
              style={{ fontSize: 13, whiteSpace: "pre-wrap" }}
            >
              {l.note}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
