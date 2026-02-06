"use client";

/**
 * LocationBreakdown Component
 * 
 * Displays location hierarchy breakdown:
 * - BD_AREA: Division > District > Upazila > Area
 * - DHAKA_AREA: City Corporation > Zone > Ward > Area (if available) or City Corporation > Area
 */
export default function LocationBreakdown({ value, lang = "en" }) {
  const v = value || {};
  const breakdown = v.locationBreakdown || {};

  if (!v.kind && !v.fullPathText && !v.text) {
    return null;
  }

  const kind = String(v.kind || "").toUpperCase();

  // Build breakdown display
  const parts = [];

  if (kind === "BD_AREA") {
    if (breakdown.division) parts.push({ label: "Division", value: breakdown.division });
    if (breakdown.district) parts.push({ label: "District", value: breakdown.district });
    if (breakdown.upazila) parts.push({ label: "Upazila", value: breakdown.upazila });
    if (breakdown.area) parts.push({ label: "Area", value: breakdown.area });
  } else if (kind === "DHAKA_AREA") {
    if (breakdown.cityCorporation) parts.push({ label: "City Corporation", value: breakdown.cityCorporation });
    if (breakdown.zone) parts.push({ label: "Zone", value: breakdown.zone });
    if (breakdown.ward) parts.push({ label: "Ward", value: breakdown.ward });
    if (breakdown.area) parts.push({ label: "Area", value: breakdown.area });
  }

  const fullPathText = v.fullPathText || v.text || "";

  return (
    <div className="location-breakdown">
      {parts.length > 0 ? (
        <div className="row g-2">
          {parts.map((part, idx) => (
            <div key={idx} className="col-md-6 col-lg-3">
              <div className="mb-2">
                <div className="text-secondary-light mb-1" style={{ fontSize: 11 }}>
                  {part.label}
                </div>
                <div className="fw-semibold" style={{ fontSize: 13 }}>
                  {part.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-2">
          <div className="text-secondary-light mb-1" style={{ fontSize: 11 }}>
            Location
          </div>
          <div className="fw-semibold" style={{ fontSize: 13 }}>
            {fullPathText}
          </div>
        </div>
      )}
      
      {/* Show location ID if available */}
      {(v.bdAreaId || v.dhakaAreaId) && (
        <div className="mt-2">
          <div className="text-secondary-light" style={{ fontSize: 11 }}>
            Location ID: <b>{v.bdAreaId || v.dhakaAreaId}</b>
          </div>
        </div>
      )}
    </div>
  );
}
