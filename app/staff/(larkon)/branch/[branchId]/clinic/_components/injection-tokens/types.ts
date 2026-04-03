import type { MedicineSource } from "@/src/types/clinicMedicineControl";

export type EncounterFlowType = "INTERNAL_VISIT" | "WALK_IN_EXTERNAL";

export type SelectedPetContext = {
  petId: number;
  patientUserId: number;
  petName: string;
  ownerDisplayName: string;
  phone?: string | null;
  email?: string | null;
  species?: string | null;
  breed?: string | null;
  uniquePetId?: string | null;
  registeredBranchId?: number | null;
};

export type MedLineDraft = {
  key: string;
  medicineSource: MedicineSource;
  variantId: string;
  manualMedicineName: string;
  manualStrength: string;
  manualBatch: string;
  manualManufacturer: string;
  route: string;
  expectedDose: string;
  unit: string;
  durationText: string;
  frequencyText: string;
  longevityNote: string;
  lineNote: string;
  selectedVialSessionId: string;
  billingUnitPrice: string;
};

export type VisitSummary = {
  id: number;
  patientId?: number;
  petId?: number;
  patientName?: string;
  petName?: string;
};
