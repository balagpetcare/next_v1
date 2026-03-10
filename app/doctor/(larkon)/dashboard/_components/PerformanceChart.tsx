"use client";

export function PerformanceChart({ metrics }: { metrics: any | null }) {
  const rows = [
    { label: "Appointments Completed", value: Number(metrics?.appointments?.completed ?? 0) },
    { label: "Visits Completed", value: Number(metrics?.visits?.completed ?? 0) },
    { label: "Patients Seen", value: Number(metrics?.patientsSeen ?? 0) },
  ];
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <div className="card radius-12 h-100">
      <div className="card-header">
        <h6 className="mb-0">Performance (Selected Range)</h6>
      </div>
      <div className="card-body">
        {rows.map((row) => (
          <div key={row.label} className="mb-3">
            <div className="d-flex justify-content-between small mb-1">
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
            <div className="progress" style={{ height: 8 }}>
              <div
                className="progress-bar"
                role="progressbar"
                style={{ width: `${(row.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
