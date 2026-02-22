"use client";

type AuditEntry = {
  label: string;
  value?: string | null;
  at?: string | null;
};

type AuditTrailProps = {
  entries: AuditEntry[];
  className?: string;
};

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AuditTrail({ entries, className = "" }: AuditTrailProps) {
  if (!entries?.length) return null;
  return (
    <div className={`small ${className}`}>
      <div className="text-secondary-light mb-8 fw-medium">Audit</div>
      <ul className="list-unstyled mb-0">
        {entries.map((e, i) => (
          <li key={i} className="d-flex flex-wrap gap-8 mb-4">
            <span className="text-secondary-light">{e.label}:</span>
            <span>{e.value ?? "—"}</span>
            {e.at != null && e.at !== "" && (
              <span className="text-secondary-light">{formatDate(e.at)}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
