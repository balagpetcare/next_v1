"use client";

export interface VisitItem {
  id: number;
  completedAt?: string | null;
  treatmentCode?: string | null;
  followUpNotes?: string | null;
  branch?: { name?: string };
}

export interface HistoryPet {
  /** API may return loosely typed vaccination rows until doctor history is fully modeled. */
  vaccinations?: unknown[];
}

export interface ClinicalHistoryTimelineProps {
  visits?: VisitItem[];
  pet?: HistoryPet | null;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}

export function ClinicalHistoryTimeline({ visits = [], pet, loading, error, onRetry }: ClinicalHistoryTimelineProps) {
  if (loading) {
    return (
      <div className="mb-3">
        <h6 className="text-secondary border-bottom pb-1 mb-2">Visit Timeline</h6>
        <p className="small text-muted">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-3">
        <h6 className="text-secondary border-bottom pb-1 mb-2">Visit Timeline</h6>
        <p className="small text-muted">Clinical history could not be loaded.</p>
        {onRetry && (
          <button type="button" className="btn btn-sm btn-outline-secondary mt-1" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    );
  }

  const hasVisits = visits.length > 0;
  const vaccinations = pet?.vaccinations ?? [];

  return (
    <div className="mb-3">
      <h6 className="text-secondary border-bottom pb-1 mb-2">Visit Timeline</h6>
      {!hasVisits && vaccinations.length === 0 && (
        <p className="small text-muted">No previous visits or vaccinations.</p>
      )}
      {hasVisits && (
        <ul className="list-unstyled small mb-2">
          {visits.map((v) => (
            <li key={v.id} className="d-flex gap-2 mb-2 position-relative">
              <span className="rounded-circle bg-primary bg-opacity-25 flex-shrink-0" style={{ width: 8, height: 8, marginTop: 6 }} />
              <div>
                <strong>{v.completedAt ? new Date(v.completedAt).toLocaleDateString() : "—"}</strong>
                {v.branch?.name && <span className="text-muted ms-1">— {v.branch.name}</span>}
                {v.treatmentCode && <span className="d-block text-muted">{v.treatmentCode}</span>}
                {v.followUpNotes && <span className="d-block mt-1">{v.followUpNotes}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {vaccinations.length > 0 && (
        <div className="small">
          <strong>Vaccinations:</strong> {vaccinations.length} record(s)
          <ul className="list-unstyled mt-1 mb-0">
            {vaccinations.slice(0, 5).map((vac, i) => {
              const row = vac as { vaccineType?: { name?: string }; administeredAt?: string };
              return (
              <li key={i}>
                {row.vaccineType?.name ?? "—"} — {row.administeredAt ? new Date(row.administeredAt).toLocaleDateString() : ""}
              </li>
            );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
