/**
 * Visit (EMR) workflow helpers — distinct from appointment queue helpers in appointmentStatusHelpers.js.
 * VisitStatus: CHECKED_IN | IN_PROGRESS | COMPLETED | CANCELLED
 */

const ALL = ["CHECKED_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export function normalizeVisitStatus(status) {
  return typeof status === "string" ? status.toUpperCase() : "";
}

export function isTerminalVisitStatus(status) {
  const s = normalizeVisitStatus(status);
  return s === "COMPLETED" || s === "CANCELLED";
}

/** Whether staff may edit vitals/notes (client hint; server enforces emr.write). */
export function canEditVisitEmr(status) {
  const s = normalizeVisitStatus(status);
  return s === "CHECKED_IN" || s === "IN_PROGRESS";
}

export function visitStatusOptions() {
  return [...ALL];
}
