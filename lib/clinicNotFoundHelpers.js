/**
 * Clinic workflow: not-found and error UX helpers
 *
 * RULES (for appointment → treatment flow):
 * - Primary entity missing (appointment, visit, patient): show clear not-found state + Back + Retry.
 *   Do not show raw backend messages as the main copy; use friendly "X not found." or "X could not be loaded."
 * - Secondary fetch failure (e.g. intake data, prescriptions, billing): keep page visible, show scoped
 *   error (e.g. alert-warning) + Retry for that data only; do not clear or replace primary entity.
 * - Stale modal target (e.g. Assign/Pay on deleted appointment): friendly message + Refresh list.
 * - Patient missing from appointment (intake): show create/select/link actions, not generic not-found.
 * - Route 404 = Next.js no matching page. Page-level "not found" = our page rendered, API returned 404.
 */

/** User-facing copy for primary entity not found (no raw API message). */
export const PRIMARY_NOT_FOUND = {
  appointment: "Appointment not found.",
  visit: "Visit not found.",
  patient: "Patient not found.",
  prescription: "Prescription not found.",
};

/** Check if an API error message is a known "not found" type (for showing recovery UX). */
export function isAppointmentNotFoundMessage(msg) {
  if (!msg || typeof msg !== "string") return false;
  const s = msg.toLowerCase();
  return s.includes("appointment not found") || s.includes("appointment or pet not found");
}

export function isVisitNotFoundMessage(msg) {
  if (!msg || typeof msg !== "string") return false;
  return msg.toLowerCase().includes("visit not found");
}

export function isPatientNotFoundMessage(msg) {
  if (!msg || typeof msg !== "string") return false;
  return msg.toLowerCase().includes("patient not found") || msg.toLowerCase().includes("pet not found");
}

/**
 * Normalize clinic patient workspace API failures (detail overview, edit GET/PATCH).
 * @param {unknown} err - thrown from apiGet/apiPatch (message, optional code, status)
 * @param {{ emptyOverview?: boolean }} opts - set when 200 but no overview payload
 * @returns {{ message: string, code: string, kind: 'route' | 'notInBranch' | 'notFound' | 'generic' }}
 */
export function formatStaffPatientApiError(err, opts = {}) {
  if (opts.emptyOverview) {
    return { message: PRIMARY_NOT_FOUND.patient, code: "", kind: "notFound" };
  }
  const raw = (err && err.message) || PRIMARY_NOT_FOUND.patient;
  const code = err && typeof err.code === "string" ? err.code : "";
  if (/route not found/i.test(String(raw))) {
    return {
      message:
        "The clinic API did not expose the patient route (often a stale API build). Run the API with `npm run dev` in backend-api or rebuild `dist`, then retry.",
      code: "",
      kind: "route",
    };
  }
  if (code === "PATIENT_NOT_IN_BRANCH") {
    return { message: raw, code, kind: "notInBranch" };
  }
  if (code === "PATIENT_NOT_FOUND") {
    return { message: raw, code, kind: "notFound" };
  }
  return { message: raw, code, kind: "generic" };
}
