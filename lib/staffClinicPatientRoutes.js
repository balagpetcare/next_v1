/**
 * Canonical staff clinic patient (pet) URLs — branch-scoped.
 * Clinical patient id in routes is always Pet.id (`pets.id`).
 * Standalone `/clinic/*` vs `/staff/branch/*`: docs/CLINIC_STANDALONE_VS_STAFF_PATIENT_ROUTES.md; deployment: docs/CROSS_SHELL_NAVIGATION.md.
 *
 * Register, detail, and edit use flat paths (`patient-register`, `patient-detail/[id]`,
 * `patient-edit/[id]`) to avoid Turbopack / nested dynamic 404s. The patients directory
 * list stays at `…/staff/branch/{id}/clinic/patients`. Legacy `…/patients/:numericId` redirects to
 * `patient-detail/:id` (next.config.js + proxy.ts).
 */

/**
 * Patients directory (list). Optional query string without leading `?` (e.g. `ownerId=12`).
 * @param {string} branchId
 * @param {string} [queryWithoutLeadingQuestion]
 */
export function staffClinicPatientsPath(branchId, queryWithoutLeadingQuestion) {
  const base = `/staff/branch/${encodeURIComponent(branchId)}/clinic/patients`;
  if (!queryWithoutLeadingQuestion) return base;
  return `${base}?${queryWithoutLeadingQuestion}`;
}

/**
 * @param {string} branchId
 * @param {string} [queryWithoutLeadingQuestion] e.g. URLSearchParams.toString()
 */
export function staffClinicPatientRegisterPath(branchId, queryWithoutLeadingQuestion) {
  const base = `/staff/branch/${encodeURIComponent(branchId)}/clinic/patient-register`;
  if (!queryWithoutLeadingQuestion) return base;
  return `${base}?${queryWithoutLeadingQuestion}`;
}

/** @param {string} branchId @param {string | number} petId */
export function staffClinicPatientDetailPath(branchId, petId) {
  const id = typeof petId === "number" ? petId : Number(petId);
  if (!Number.isFinite(id)) return staffClinicPatientsPath(branchId);
  return `/staff/branch/${encodeURIComponent(branchId)}/clinic/patient-detail/${id}`;
}

/** @param {string} branchId @param {string | number} petId */
export function staffClinicPatientEditPath(branchId, petId) {
  const id = typeof petId === "number" ? petId : Number(petId);
  if (!Number.isFinite(id)) return staffClinicPatientsPath(branchId);
  return `/staff/branch/${encodeURIComponent(branchId)}/clinic/patient-edit/${id}`;
}
