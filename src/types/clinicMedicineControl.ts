/**
 * Shared types for clinic medicine-control: injection tokens, dose recording, vial sessions.
 * Align with backend InjectionToken, MedicationAdministration, VialSession.
 */

export type InjectionTokenStatus = "PENDING" | "USED" | "EXPIRED" | "CANCELLED";
/** Aligns with Prisma MedicineSource (enterprise injection). Legacy INTERNAL/EXTERNAL/OUTSIDE accepted by API but normalized server-side. */
export type MedicineSource =
  | "INTERNAL_CLINIC"
  | "CLINIC_PROVIDED_MEDICINE"
  | "OUTSIDE_PRESCRIPTION_PATIENT_BROUGHT";

export type InjectionEncounterKind = "INTERNAL_VISIT" | "EXTERNAL_WALK_IN";

export interface InjectionTokenVariant {
  id: number;
  title?: string | null;
  sku?: string | null;
}

export interface InjectionTokenVisit {
  id: number;
  treatmentCode?: string | null;
  doctorId?: number | null;
}

export interface InjectionTokenOrder {
  id: number;
  orderNumber?: string | null;
  paymentStatus?: string | null;
}

export interface InjectionTokenPatient {
  id: number;
  profile?: { displayName?: string | null } | null;
}

export interface InjectionTokenPet {
  id: number;
  name?: string | null;
}

export interface VialSessionSummary {
  id: number;
  remainingQty: number;
  validUntil?: string | null;
  status?: string | null;
  variant?: { id: number; title?: string | null } | null;
  roomId?: number | null;
  room?: { id: number; name?: string | null; code?: string | null } | null;
}

export interface TreatmentCourseSummary {
  id: number;
  durationDays?: number | null;
  status?: string | null;
}

export interface TreatmentDaySummary {
  id: number;
  dayNumber?: number | null;
  scheduledDate?: string | null;
  status?: string | null;
}

/** One medicine/administration row on a multi-line injection token (API + Prisma). */
export interface InjectionTokenMedicationLine {
  id?: number;
  lineIndex?: number;
  medicineSource: MedicineSource;
  variantId?: number | null;
  manualMedicineName?: string | null;
  manualStrength?: string | null;
  manualBatch?: string | null;
  manualManufacturer?: string | null;
  route: string;
  expectedDose: number | string;
  unit?: string | null;
  durationText?: string | null;
  frequencyText?: string | null;
  longevityNote?: string | null;
  lineNote?: string | null;
  selectedVialSessionId?: number | null;
  medicineFeeSnapshot?: string | number | null;
  variant?: InjectionTokenVariant | null;
  selectedVialSession?: VialSessionSummary | null;
}

export interface InjectionToken {
  id: number;
  tokenCode: string;
  branchId: number;
  visitId: number | null;
  prescriptionId: number | null;
  orderId: number | null;
  patientId: number | null;
  petId: number | null;
  /** Legacy mirror of first clinic line; null when outside-only multi-line. */
  variantId?: number | null;
  treatmentCourseId: number | null;
  treatmentDayId: number | null;
  selectedVialSessionId: number | null;
  expectedDose?: number | string | null;
  unit: string | null;
  medicineSource: MedicineSource;
  encounterKind?: InjectionEncounterKind;
  externalPrescriberName?: string | null;
  externalPrescriberClinic?: string | null;
  externalRxNotes?: string | null;
  externalRxEvidenceUrl?: string | null;
  serviceChargeAmount?: string | number | null;
  medicineChargeAmount?: string | number | null;
  consumablesChargeAmount?: string | number | null;
  lifecycleLabel?: string;
  status: InjectionTokenStatus;
  generatedByUserId: number | null;
  validatedByUserId?: number | null;
  validatedAt?: string | null;
  usedByUserId: number | null;
  usedAt: string | null;
  cancelledByUserId?: number | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  variant?: InjectionTokenVariant | null;
  visit?: InjectionTokenVisit | null;
  order?: InjectionTokenOrder | null;
  patient?: InjectionTokenPatient | null;
  pet?: InjectionTokenPet | null;
  treatmentCourse?: TreatmentCourseSummary | null;
  treatmentDay?: TreatmentDaySummary | null;
  selectedVialSession?: VialSessionSummary | null;
  medicationLines?: InjectionTokenMedicationLine[] | null;
  generatedBy?: { id: number; profile?: { displayName?: string | null } } | null;
  validatedBy?: { id: number; profile?: { displayName?: string | null } } | null;
  usedBy?: { id: number; profile?: { displayName?: string | null } } | null;
  cancelledBy?: { id: number; profile?: { displayName?: string | null } } | null;
}

export interface TokenContext extends InjectionToken {
  treatmentCourse?: TreatmentCourseSummary | null;
  treatmentDay?: TreatmentDaySummary | null;
  selectedVialSession?: VialSessionSummary | null;
}

export interface ValidateTokenResult {
  valid: boolean;
  reason?: string;
  token?: InjectionToken;
  alreadyValidated?: boolean;
}

export interface VialSessionListItem {
  id: number;
  variantId: number;
  initialQty?: number | null;
  remainingQty: number;
  validUntil?: string | null;
  status?: string | null;
  openedAt?: string | null;
  variant?: { id: number; title?: string | null; sku?: string | null } | null;
  room?: { id: number; name?: string | null; code?: string | null } | null;
}

export interface MedicationAdministration {
  id: number;
  patientId: number;
  visitId: number | null;
  variantId: number;
  vialSessionId: number | null;
  injectionTokenId: number | null;
  prescribedDose: number | null;
  administeredDose: number;
  unit: string | null;
  medicineSource: MedicineSource | null;
  route: string | null;
  administeredAt: string;
  administeredByUserId: number | null;
  emergencyBypassReason?: string | null;
  variant?: { id: number; title?: string | null; sku?: string | null } | null;
  vialSession?: { id: number; remainingQty?: number } | null;
  injectionToken?: { id: number; tokenCode?: string | null; status?: string } | null;
  administeredBy?: { id: number; profile?: { displayName?: string | null } } | null;
}

export interface RecordDosePayload {
  patientId: number;
  variantId: number;
  administeredDose: number;
  visitId?: number | null;
  vialSessionId?: number | null;
  injectionTokenId?: number | null;
  medicineSource?: MedicineSource;
  prescribedDose?: number | null;
  unit?: string | null;
  route?: string | null;
  emergencyBypass?: boolean;
  emergencyBypassReason?: string | null;
  medicineApprovalRequestId?: number | null;
  witnessedByUserId?: number | null;
}

export interface InjectionRoomBoard {
  date: string;
  pendingTokens: InjectionToken[];
  /** Pending tokens with no selected vial (no room). */
  unassignedTokens: InjectionToken[];
  completedToday: MedicationAdministration[];
  bypassToday: MedicationAdministration[];
  expiredOrProblemToday: Array<InjectionToken & { cancelReason?: string | null }>;
}
