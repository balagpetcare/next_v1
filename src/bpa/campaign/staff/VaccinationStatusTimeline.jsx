"use client";

const STEPS = [
  { key: "CONFIRMED", label: "Booked", icon: "ri-calendar-check-line" },
  { key: "CHECKED_IN", label: "Checked in", icon: "ri-user-received-line" },
  { key: "IN_PROGRESS", label: "Vaccinating", icon: "ri-syringe-line" },
  { key: "COMPLETED", label: "Complete", icon: "ri-checkbox-circle-line" },
];

const STATUS_ORDER = {
  DRAFT: 0,
  CONFIRMED: 1,
  CHECKED_IN: 2,
  IN_PROGRESS: 3,
  COMPLETED: 4,
  NO_SHOW: -1,
  CANCELLED: -1,
};

function stepIndex(status) {
  const idx = STATUS_ORDER[status];
  if (idx === undefined) return 0;
  if (idx < 0) return 0;
  return idx;
}

function formatWhen(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

export default function VaccinationStatusTimeline({ booking }) {
  if (!booking) return null;

  const current = stepIndex(booking.status);
  const isTerminal = booking.status === "CANCELLED" || booking.status === "NO_SHOW";

  return (
    <div className="card border-0 shadow-sm mb-3">
      <div className="card-body py-3">
        <h6 className="text-muted text-uppercase small mb-3">Status timeline</h6>
        {isTerminal ? (
          <div className="alert alert-warning py-2 mb-0 small">
            Booking {String(booking.status).replace(/_/g, " ").toLowerCase()}
          </div>
        ) : (
          <ul className="list-unstyled mb-0">
            {STEPS.map((step, i) => {
              const done = current > i || (current === i && booking.status === "COMPLETED");
              const active = current === i && booking.status !== "COMPLETED";
              let when = null;
              if (step.key === "CONFIRMED" && booking.bookingDate) {
                when = formatWhen(booking.bookingDate);
              }
              if (step.key === "CHECKED_IN" && booking.checkedInAt) {
                when = formatWhen(booking.checkedInAt);
              }
              if (step.key === "COMPLETED" && booking.completedAt) {
                when = formatWhen(booking.completedAt);
              }
              return (
                <li key={step.key} className="d-flex gap-2 mb-2">
                  <div
                    className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${
                      done ? "bg-success text-white" : active ? "bg-primary text-white" : "bg-light text-muted"
                    }`}
                    style={{ width: 32, height: 32 }}
                  >
                    <i className={step.icon} aria-hidden />
                  </div>
                  <div className="flex-grow-1">
                    <div className={`fw-semibold small ${done || active ? "" : "text-muted"}`}>{step.label}</div>
                    {when ? <div className="text-muted" style={{ fontSize: "0.75rem" }}>{when}</div> : null}
                    {step.key === "CHECKED_IN" && booking.queueNumber ? (
                      <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                        Queue {booking.queueNumber}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
