"use client";

/**
 * Top summary bar for Appointment Operations Dashboard.
 * Shows today/pending/checked-in/completed/cancelled/no-show/emergency/revenue.
 * Cards are clickable to apply that filter.
 */
export default function AppointmentSummaryCards({
  stats,
  loading,
  onFilterByStatus,
  onFilterByEmergency,
}) {
  const sc = stats?.statusCounts ?? {};
  const total = stats?.total ?? 0;
  const emergencyCount = stats?.emergencyCount ?? 0;
  const pending = (sc.BOOKED ?? 0) + (sc.CONFIRMED ?? 0) + (sc.DRAFT ?? 0) + (sc.PRE_BOOKED ?? 0);
  const checkedIn = (sc.CHECKED_IN ?? 0) + (sc.IN_QUEUE ?? 0) + (sc.CALLED ?? 0) + (sc.IN_CONSULT ?? 0);
  const completed = sc.COMPLETED ?? 0;
  const cancelled = sc.CANCELLED ?? 0;
  const noShow = sc.NO_SHOW ?? 0;
  const revenueExpected = Number(stats?.revenueExpected) ?? 0;
  const revenueCollected = Number(stats?.revenueCollected) ?? 0;

  const cards = [
    { label: "Total", value: total, key: null, clickable: false },
    { label: "Pending / Confirmed", value: pending, key: "pending", statuses: ["BOOKED", "CONFIRMED"] },
    { label: "Checked-in", value: checkedIn, key: "checkedIn", statuses: ["CHECKED_IN", "IN_QUEUE", "IN_CONSULT"] },
    { label: "Completed", value: completed, key: "COMPLETED", statuses: ["COMPLETED"] },
    { label: "Cancelled", value: cancelled, key: "CANCELLED", statuses: ["CANCELLED"] },
    { label: "No-show", value: noShow, key: "NO_SHOW", statuses: ["NO_SHOW"] },
    { label: "Emergency", value: emergencyCount, key: "emergency", isEmergency: true },
    { label: "Revenue (Expected)", value: revenueExpected.toFixed(2), key: null, clickable: false, isMoney: true },
    { label: "Revenue (Collected)", value: revenueCollected.toFixed(2), key: null, clickable: false, isMoney: true },
  ];

  if (loading) {
    return (
      <div className="d-flex flex-wrap gap-2 mb-3">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="card radius-12 flex-grow-1" style={{ minWidth: 100, maxWidth: 160 }}>
            <div className="card-body py-2 px-3">
              <div className="placeholder-glow">
                <span className="placeholder col-6 d-block small" />
                <span className="placeholder col-4 d-block mt-1" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="d-flex flex-wrap gap-2 mb-3">
      {cards.map((c) => {
        const clickable = c.clickable !== false && (c.statuses || c.isEmergency) && onFilterByStatus;
        const Wrapper = clickable ? "button" : "div";
        const wrapperProps = clickable
          ? {
              type: "button",
              className: "card radius-12 flex-grow-1 border text-start bg-transparent",
              style: { minWidth: 100, maxWidth: 180 },
              onClick: () => {
                if (c.isEmergency) onFilterByEmergency?.();
                else if (c.statuses?.length) onFilterByStatus(c.statuses);
              },
            }
          : {
              className: "card radius-12 flex-grow-1",
              style: { minWidth: 100, maxWidth: 180 },
            };
        return (
          <Wrapper key={c.label} {...wrapperProps}>
            <div className="card-body py-2 px-3">
              <div className="small text-secondary">{c.label}</div>
              <div className="fw-semibold">
                {c.isMoney && typeof c.value === "string" ? c.value : c.value}
              </div>
            </div>
          </Wrapper>
        );
      })}
    </div>
  );
}
