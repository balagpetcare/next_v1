"use client";

/**
 * Doctor workload panel: per-doctor stats (total, completed, pending, cancelled, no-show, today load).
 */
export default function DoctorWorkloadPanel({ stats = [], loading, title = "Doctor workload" }) {
  if (loading) {
    return (
      <div className="card radius-12">
        <div className="card-header"><h6 className="mb-0">{title}</h6></div>
        <div className="card-body">
          <div className="placeholder-glow">
            <span className="placeholder col-12 d-block" />
            <span className="placeholder col-10 d-block mt-2" />
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
        <div className="card-body text-muted small">No doctor data for this range.</div>
      </div>
    );
  }

  return (
    <div className="card radius-12">
      <div className="card-header"><h6 className="mb-0">{title}</h6></div>
      <div className="card-body p-0">
        <ul className="list-group list-group-flush">
          {stats.map((d) => {
            const total = d.total ?? 0;
            const completed = d.completed ?? 0;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            return (
              <li key={d.doctorId} className="list-group-item d-flex justify-content-between align-items-center py-2">
                <div>
                  <span className="fw-medium">{d.doctorName ?? "Doctor"}</span>
                  <div className="progress mt-1" style={{ height: 4, width: 80 }}>
                    <div className="progress-bar bg-success" role="progressbar" style={{ width: `${pct}%` }} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} />
                  </div>
                </div>
                <div className="small text-end">
                  <span className="text-success">{d.completed ?? 0}</span> / <span>{total}</span>
                  {(d.todayLoad ?? 0) > 0 && <span className="text-primary ms-1">(today: {d.todayLoad})</span>}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
