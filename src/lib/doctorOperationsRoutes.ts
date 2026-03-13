/**
 * Centralized route helpers for Staff Doctor Operations (branch-wide console).
 * Use these everywhere instead of hardcoding paths. Doctor selection is optional (?memberId=).
 *
 * Actual Next.js routes under app/staff/(larkon)/branch/[branchId]/clinic/doctors/:
 * - page.tsx (index) → doctors(branchId)
 * - overview, schedule-board, availability, service-assignment, package-assignment,
 * - approvals, credentials, certifications, licenses, performance, audit-logs,
 * - invite, assign-existing, profile/[doctorId]
 *
 * Legacy URLs like .../doctors/profile/schedule-board are redirected to .../doctors/schedule-board (see proxy.ts).
 */

const base = (branchId: string) =>
  `/staff/branch/${branchId}/clinic/doctors`;

/** Full doctor profile page (tabs: overview, credentials, services, schedule, etc.). */
export function profile(branchId: string, doctorId: number | string): string {
  return `${base(branchId)}/profile/${doctorId}`;
}

/** Profile URL with tab (e.g. ?tab=schedule). */
export function profileTab(
  branchId: string,
  doctorId: number | string,
  tab: string
): string {
  return `${base(branchId)}/profile/${doctorId}?tab=${tab}`;
}

export function overview(branchId: string): string {
  return `${base(branchId)}/overview`;
}

export function doctors(branchId: string): string {
  return `${base(branchId)}`;
}

export function scheduleBoard(branchId: string): string {
  return `${base(branchId)}/schedule-board`;
}

export function availability(branchId: string, memberId?: number): string {
  const path = `${base(branchId)}/availability`;
  return memberId != null ? `${path}?memberId=${memberId}` : path;
}

export function serviceAssignment(branchId: string, memberId?: number): string {
  const path = `${base(branchId)}/service-assignment`;
  return memberId != null ? `${path}?memberId=${memberId}` : path;
}

export function packageAssignment(branchId: string, memberId?: number): string {
  const path = `${base(branchId)}/package-assignment`;
  return memberId != null ? `${path}?memberId=${memberId}` : path;
}

export function approvals(branchId: string): string {
  return `${base(branchId)}/approvals`;
}

export function credentials(branchId: string, memberId?: number): string {
  const path = `${base(branchId)}/credentials`;
  return memberId != null ? `${path}?memberId=${memberId}` : path;
}

export function certifications(branchId: string): string {
  return `${base(branchId)}/certifications`;
}

export function licenses(branchId: string): string {
  return `${base(branchId)}/licenses`;
}

export function performance(branchId: string, memberId?: number): string {
  const path = `${base(branchId)}/performance`;
  return memberId != null ? `${path}?memberId=${memberId}` : path;
}

export function auditLogs(branchId: string, memberId?: number): string {
  const path = `${base(branchId)}/audit-logs`;
  return memberId != null ? `${path}?memberId=${memberId}` : path;
}

export function invite(branchId: string): string {
  return `${base(branchId)}/invite`;
}

export function assignExisting(branchId: string): string {
  return `${base(branchId)}/assign-existing`;
}

export const doctorOpsRoutes = {
  base,
  profile,
  profileTab,
  overview,
  doctors,
  scheduleBoard,
  availability,
  serviceAssignment,
  packageAssignment,
  approvals,
  credentials,
  certifications,
  licenses,
  performance,
  auditLogs,
  invite,
  assignExisting,
};
