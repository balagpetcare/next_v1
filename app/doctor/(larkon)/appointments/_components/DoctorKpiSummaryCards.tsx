"use client";

export type TabId = "waiting" | "upcoming" | "in_consult" | "completed" | "follow_up" | "emergency" | "package" | "pending" | "all";

export interface DoctorKpiSummaryCardsStats {
  total: number;
  statusCounts: Record<string, number>;
  emergencyCount: number;
  followUpCount: number;
  paymentPendingCount?: number;
}

export interface DoctorKpiSummaryCardsProps {
  stats: DoctorKpiSummaryCardsStats | null;
  loading: boolean;
  /** Count of appointments in current list (filtered view). */
  inViewCount?: number;
  onFilter: (tab: TabId) => void;
}

export function DoctorKpiSummaryCards({ stats, loading, inViewCount, onFilter }: DoctorKpiSummaryCardsProps) {
  const sc = stats?.statusCounts ?? {};
  const waiting = (sc.CHECKED_IN ?? 0) + (sc.IN_QUEUE ?? 0) + (sc.CALLED ?? 0);
  const inConsult = sc.IN_CONSULT ?? 0;
  const completed = sc.COMPLETED ?? 0;
  const noShowCancelled = (sc.NO_SHOW ?? 0) + (sc.CANCELLED ?? 0);
  const paymentPending = stats?.paymentPendingCount ?? 0;

  const cards: { label: string; value: number; tab?: TabId }[] = [
    { label: "Total", value: stats?.total ?? 0, tab: "all" },
    { label: "In View", value: inViewCount ?? 0 },
    { label: "Waiting Now", value: waiting, tab: "waiting" },
    { label: "In Consultation", value: inConsult, tab: "in_consult" },
    { label: "Follow-up", value: stats?.followUpCount ?? 0, tab: "follow_up" },
    { label: "Emergency", value: stats?.emergencyCount ?? 0, tab: "emergency" },
    { label: "Completed", value: completed, tab: "completed" },
    { label: "No-show / Cancelled", value: noShowCancelled },
    { label: "Payment Pending", value: paymentPending },
  ];

  if (loading) {
    return (
      <div className="d-flex flex-wrap gap-2 mb-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="card radius-12 flex-grow-1 shadow-sm"
            style={{ minWidth: 90, maxWidth: 160 }}
          >
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
        const clickable = c.tab != null;
        const Wrapper = clickable ? "button" : "div";
        const wrapperProps = clickable
          ? {
              type: "button" as const,
              className: "card radius-12 flex-grow-1 border text-start bg-transparent shadow-sm",
              style: { minWidth: 90, maxWidth: 160 },
              onClick: () => onFilter(c.tab!),
            }
          : {
              className: "card radius-12 flex-grow-1 shadow-sm",
              style: { minWidth: 90, maxWidth: 160 },
            };
        return (
          <Wrapper key={c.label} {...wrapperProps}>
            <div className="card-body py-2 px-3">
              <div className="small text-secondary">{c.label}</div>
              <div className="fw-semibold">{c.value}</div>
            </div>
          </Wrapper>
        );
      })}
    </div>
  );
}
