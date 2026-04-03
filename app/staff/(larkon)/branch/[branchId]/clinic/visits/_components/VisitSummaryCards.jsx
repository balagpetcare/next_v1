"use client";

/**
 * KPI strip for clinic visits — uses GET /visits/summary; status cards apply list filter.
 */
export default function VisitSummaryCards({ summary, loading, activeStatuses, onToggleStatus, onShowUnpaid }) {
  if (loading) {
    return (
      <div className="d-flex flex-wrap gap-2 mb-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="card radius-12 flex-grow-1" style={{ minWidth: 120, maxWidth: 160 }}>
            <div className="card-body py-2 px-3">
              <div className="placeholder-glow">
                <span className="placeholder col-8 d-block small" />
                <span className="placeholder col-4 d-block mt-1" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const bs = summary?.byStatus ?? {};
  const statusKeys = ["CHECKED_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

  const metricCards = [
    { label: "Open pipeline", value: summary?.openPipelineCount ?? 0, hint: "Checked-in + in progress (branch)" },
    { label: "In date range", value: summary?.visitsInDateRange ?? 0, hint: "Visits created in range" },
    { label: "Completed (range)", value: summary?.completedInDateRange ?? 0, hint: "By completedAt in range" },
    {
      label: "With unpaid orders",
      value: summary?.visitsWithUnpaidOrders ?? 0,
      hint: "Visits in range with a non-completed order",
      onClick: onShowUnpaid,
    },
  ];

  const isStatusActive = (k) => Array.isArray(activeStatuses) && activeStatuses.includes(k);

  return (
    <div className="mb-3">
      <p className="small text-muted mb-2 d-md-none">
        KPIs use the date range only; the table can add search, doctor, status, and unpaid filters.
      </p>
      <p className="small text-muted mb-2 mb-md-3 d-none d-md-block">
        Summary uses the selected <strong>from/to dates</strong> only. The table may further narrow results (search, doctor, status chips,
        unpaid, etc.) — counts above are not expected to match the filtered row count.
      </p>
      <div className="d-flex flex-wrap gap-2 mb-2">
        {metricCards.map((c) => {
          const Wrapper = c.onClick ? "button" : "div";
          const props = c.onClick
            ? {
                type: "button",
                className: "card radius-12 flex-grow-1 border text-start bg-transparent",
                style: { minWidth: 120, maxWidth: 180 },
                onClick: c.onClick,
              }
            : { className: "card radius-12 flex-grow-1", style: { minWidth: 120, maxWidth: 180 } };
          return (
            <Wrapper key={c.label} {...props}>
              <div className="card-body py-2 px-3">
                <div className="small text-secondary">{c.label}</div>
                <div className="fw-semibold">{c.value}</div>
                {c.hint && <div className="text-muted" style={{ fontSize: "10px" }}>{c.hint}</div>}
              </div>
            </Wrapper>
          );
        })}
      </div>
      <div className="d-flex flex-wrap gap-2 align-items-center">
        <span className="small text-muted me-1">Filter by status:</span>
        {statusKeys.map((k) => (
          <button
            key={k}
            type="button"
            className={`btn btn-sm radius-8 ${isStatusActive(k) ? "btn-primary" : "btn-outline-secondary"}`}
            onClick={() => onToggleStatus?.(k)}
          >
            {k.replace(/_/g, " ")} ({bs[k] ?? 0})
          </button>
        ))}
      </div>
    </div>
  );
}
