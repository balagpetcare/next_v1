/** Aligns with backend `REQUEST_TYPE_LABELS` (clinic approval workflow). */

/** Sync with `backend-api/src/api/v1/constants/clinicApprovalTypes.ts` → `DOCTOR_APPROVAL_QUEUE_TYPES`. */
export const DOCTOR_APPROVAL_QUEUE_TYPES = [
  "DOCTOR_INVITE",
  "DOCTOR_SCHEDULE",
  "DOCTOR_FEE_CHANGE",
  "DOCTOR_ACTIVATION",
  "DOCTOR_DEACTIVATION",
  "DOCTOR_SERVICE_PRIVILEGE",
  "DOCTOR_PACKAGE_PRIVILEGE",
  "DOCTOR_LEAVE",
  "DOCTOR_CREDENTIAL",
] as const;

export type DoctorApprovalQueueType = (typeof DOCTOR_APPROVAL_QUEUE_TYPES)[number];

const doctorQueueSet = new Set<string>(DOCTOR_APPROVAL_QUEUE_TYPES);

export function isDoctorApprovalQueueType(type: string | undefined | null): boolean {
  if (!type) return false;
  return doctorQueueSet.has(type);
}

export const CLINIC_APPROVAL_REQUEST_TYPE_LABELS: Record<string, string> = {
  PACKAGE_CREATE: "Create Package",
  PACKAGE_UPDATE: "Update Package",
  DOCTOR_INVITE: "Doctor Invite",
  DOCTOR_SCHEDULE: "Doctor Schedule",
  DISCOUNT_CHANGE: "Discount Change",
  SERVICE_CREATE: "New Service",
  INVENTORY_PURCHASE: "Inventory Purchase",
  DOCTOR_FEE_CHANGE: "Doctor Fee Change",
  DOCTOR_ACTIVATION: "Doctor Activation",
  DOCTOR_DEACTIVATION: "Doctor Deactivation",
  DOCTOR_SERVICE_PRIVILEGE: "Doctor Service Privilege",
  DOCTOR_PACKAGE_PRIVILEGE: "Doctor Package Privilege",
  DOCTOR_LEAVE: "Doctor Leave",
  DOCTOR_CREDENTIAL: "Doctor Credential",
};

export function labelForClinicApprovalRequestType(type: string | undefined | null): string {
  if (!type) return "—";
  return CLINIC_APPROVAL_REQUEST_TYPE_LABELS[type] ?? type;
}
