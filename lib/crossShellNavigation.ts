/**
 * Cross-shell navigation policy (standalone `/clinic` vs `/staff/branch`).
 *
 * **Same-origin rule:** Relative URLs like `/staff/branch/...` from a page served under `/clinic/...`
 * only work when both shells are deployed on the **same web origin** (same scheme + host + port).
 * If clinic and staff are split across subdomains or hosts, replace cross-shell links with
 * environment-driven absolute URLs or remove cross-shell (see docs/CROSS_SHELL_NAVIGATION.md).
 *
 * **Use these builders** for known clinic → staff transitions so paths stay consistent and grep-able:
 * - Patient list/detail/edit/register: `staffClinicPatient*Path` in `./staffClinicPatientRoutes.js`
 * - Intake handoff from standalone clinic: `staffBranchClinicIntakePath` below
 *
 * Do not add new raw string `/staff/branch/...` links from under `app/clinic/` without updating this module or the doc.
 */

const STAFF_BRANCH = "/staff/branch";

/**
 * Staff workspace intake (canonical implementation). Used when standalone `/clinic/intake/...` redirects.
 */
export function staffBranchClinicIntakePath(branchId: string, appointmentId: string): string {
  const b = encodeURIComponent(branchId);
  const a = encodeURIComponent(appointmentId);
  return `${STAFF_BRANCH}/${b}/clinic/intake/${a}`;
}
