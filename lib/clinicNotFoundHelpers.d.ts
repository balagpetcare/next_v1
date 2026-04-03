export const PRIMARY_NOT_FOUND: {
  appointment: string;
  visit: string;
  patient: string;
  prescription: string;
};

export function isAppointmentNotFoundMessage(msg: unknown): boolean;
export function isVisitNotFoundMessage(msg: unknown): boolean;
export function isPatientNotFoundMessage(msg: unknown): boolean;

export function formatStaffPatientApiError(
  err: { message?: string; code?: string },
  opts?: { emptyOverview?: boolean }
): { message: string; code: string; kind: "route" | "notInBranch" | "notFound" | "generic" };
