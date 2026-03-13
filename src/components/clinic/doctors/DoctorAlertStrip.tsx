"use client";

import type { OperationalAlert } from "./types";

const severityClass: Record<string, string> = {
  info: "alert-info",
  warning: "alert-warning",
  critical: "alert-danger",
};

const severityBadge: Record<string, string> = {
  info: "bg-info-subtle text-info-emphasis",
  warning: "bg-warning-subtle text-warning-emphasis",
  critical: "bg-danger-subtle text-danger-emphasis",
};

export default function DoctorAlertStrip({ alerts }: { alerts: OperationalAlert[] }) {
  if (!alerts?.length) return null;

  return (
    <div className="d-flex flex-wrap gap-2 mb-3">
      {alerts.map((a, i) => (
        <div
          key={i}
          className={`alert ${severityClass[a.severity] ?? "alert-secondary"} radius-12 py-2 px-3 mb-0 d-inline-flex align-items-center gap-2`}
          role="alert"
        >
          <span className={`badge ${severityBadge[a.severity] ?? "bg-secondary"} radius-8`}>
            {a.severity.toUpperCase()}
          </span>
          <span>{a.message}</span>
          {a.count != null && (
            <span className="text-muted small">({a.count})</span>
          )}
        </div>
      ))}
    </div>
  );
}
