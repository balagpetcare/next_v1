"use client";

export interface ClinicalAlertsProps {
  allergies?: string[] | unknown;
  healthDisorders?: string | null;
  isEmergency?: boolean;
  isRepeatVisit?: boolean;
}

function ensureStringArray(arr: string[] | unknown): string[] {
  if (Array.isArray(arr)) return arr.filter((x): x is string => typeof x === "string");
  return [];
}

export function ClinicalAlerts({
  allergies,
  healthDisorders,
  isEmergency,
  isRepeatVisit,
}: ClinicalAlertsProps) {
  const allergyList = ensureStringArray(allergies ?? []);
  const hasAllergies = allergyList.length > 0;
  const hasChronic = !!healthDisorders?.toString().trim();
  const hasAny = hasAllergies || hasChronic || isEmergency || isRepeatVisit;

  if (!hasAny) return null;

  return (
    <div className="mb-3">
      <h6 className="text-secondary border-bottom pb-1 mb-2">Clinical Alerts</h6>
      <div className="d-flex flex-wrap gap-1">
        {hasAllergies && (
          <span className="badge bg-danger" title="Allergies">
            Allergy: {allergyList.join(", ")}
          </span>
        )}
        {hasChronic && (
          <span className="badge bg-warning text-dark" title="Chronic condition">
            Chronic
          </span>
        )}
        {isEmergency && (
          <span className="badge bg-danger">Emergency</span>
        )}
        {isRepeatVisit && (
          <span className="badge bg-info">Repeat visit</span>
        )}
      </div>
      {hasChronic && healthDisorders && (
        <p className="small text-muted mt-1 mb-0">{String(healthDisorders).slice(0, 200)}</p>
      )}
    </div>
  );
}
