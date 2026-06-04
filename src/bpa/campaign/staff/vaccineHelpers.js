/**
 * Match campaign vaccine types to Rabies / Cat Flu quick actions.
 */

export function findVaccineType(vaccineTypes, kind) {
  if (!Array.isArray(vaccineTypes)) return null;
  const normalized = kind.toLowerCase();
  return (
    vaccineTypes.find((vt) => {
      const name = String(vt.name || "").toLowerCase();
      if (normalized === "rabies") return name.includes("rabies");
      if (normalized === "catflu") {
        return name.includes("cat flu") || name.includes("fvrcp") || name.includes("fvr");
      }
      return false;
    }) ?? null
  );
}

export function defaultBatchFor(kind) {
  if (kind === "rabies") return "RAB-2026-001";
  if (kind === "catflu") return "CF-2026-001";
  return "";
}

export function defaultExpiryDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}
