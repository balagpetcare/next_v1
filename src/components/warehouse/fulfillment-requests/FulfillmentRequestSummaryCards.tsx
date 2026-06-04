"use client";

type Breakdown = {
  actionRequired?: number;
  approvedReady?: number;
  partialCases?: number;
  openDispatchUnits?: number;
  totalQueue?: number;
};

export function FulfillmentRequestSummaryCards(props: {
  loading: boolean;
  breakdown: Breakdown | null;
  onCardClick?: (kind: "action" | "approved" | "partial" | "dispatch" | "all") => void;
  activeFilter?: string | null;
}) {
  const { loading, breakdown, onCardClick, activeFilter } = props;
  const card = (
    kind: string,
    title: string,
    value: number | string,
    clickable: boolean,
    filterKind?: "action" | "approved" | "partial" | "dispatch" | "all"
  ) => {
    const isActive = activeFilter === filterKind || (filterKind === "all" && activeFilter === "all");
    return (
      <div className="col">
        <div
          className={`card radius-12 border h-100 ${clickable ? "cursor-pointer" : ""} ${isActive ? "border-primary shadow-sm" : ""}`}
          style={clickable ? { cursor: "pointer" } : undefined}
          role={clickable ? "button" : undefined}
          tabIndex={clickable ? 0 : undefined}
          onClick={() => {
            if (clickable && onCardClick && filterKind) onCardClick(filterKind);
          }}
          onKeyDown={(e) => {
            if (!clickable || !onCardClick || !filterKind) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onCardClick(filterKind);
            }
          }}
        >
          <div className="card-body py-3 px-3">
            <p className="text-muted small mb-2 text-uppercase fw-medium" style={{ letterSpacing: "0.02em" }}>
              {title}
            </p>
            <div style={{ minHeight: 34 }} className="d-flex align-items-center">
              {loading ? (
                <div className="placeholder-glow w-100">
                  <span className="placeholder col-4 rounded" style={{ height: 28, display: "inline-block" }} />
                </div>
              ) : (
                <h4 className="mb-0 fw-semibold">{value}</h4>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const b = breakdown ?? {};

  return (
    <div className="row row-cols-2 row-cols-md-3 row-cols-xl-5 g-3 mb-4">
      {card("action", "Action required", b.actionRequired ?? "—", !!onCardClick, "action")}
      {card("sub", "Ready for fulfillment", b.approvedReady ?? "—", !!onCardClick, "approved")}
      {card("dispatch", "Dispatch pipeline (units)", b.openDispatchUnits ?? "—", false)}
      {card("partial", "Partial / problem", b.partialCases ?? "—", !!onCardClick, "partial")}
      {card("total", "Total in queue", b.totalQueue ?? "—", !!onCardClick, "all")}
    </div>
  );
}
