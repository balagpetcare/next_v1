"use client";

/**
 * Service breakdown widget: service-wise appointment counts for the selected date range.
 */
export default function ServiceBreakdownPanel({ stats = [], loading, title = "Service breakdown" }) {
  if (loading) {
    return (
      <div className="card radius-12">
        <div className="card-header"><h6 className="mb-0">{title}</h6></div>
        <div className="card-body">
          <div className="placeholder-glow">
            <span className="placeholder col-12 d-block" />
            <span className="placeholder col-8 d-block mt-2" />
          </div>
        </div>
      </div>
    );
  }

  if (!stats.length) {
    return (
      <div className="card radius-12">
        <div className="card-header"><h6 className="mb-0">{title}</h6></div>
        <div className="card-body text-muted small">No service data for this range.</div>
      </div>
    );
  }

  return (
    <div className="card radius-12">
      <div className="card-header"><h6 className="mb-0">{title}</h6></div>
      <div className="card-body p-0">
        <ul className="list-group list-group-flush">
          {stats.map((s) => (
            <li key={s.serviceId} className="list-group-item d-flex justify-content-between align-items-center py-2">
              <span className="small">{s.serviceName ?? "—"}</span>
              <span className="badge bg-primary rounded-pill">{s.count ?? 0}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
