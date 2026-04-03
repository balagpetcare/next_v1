import type { MedicineSource } from "@/src/types/clinicMedicineControl";
import type { EncounterFlowType } from "./types";

export const MEDICINE_SOURCE_OPTIONS: { value: MedicineSource; label: string; hint?: string }[] = [
  { value: "INTERNAL_CLINIC", label: "Clinic stock (vial)", hint: "Deduct from open vial / inventory" },
  { value: "CLINIC_PROVIDED_MEDICINE", label: "Clinic-provided medicine", hint: "Injection using product supplied by clinic" },
  { value: "OUTSIDE_PRESCRIPTION_PATIENT_BROUGHT", label: "Patient-brought (outside Rx)", hint: "No vial deduction" },
];

export const ENCOUNTER_FLOW_OPTIONS: { value: EncounterFlowType; label: string; hint: string }[] = [
  {
    value: "INTERNAL_VISIT",
    label: "Existing patient from system",
    hint: "Search by parent phone or pet ID. If visits exist for this pet, pick one.",
  },
  {
    value: "WALK_IN_EXTERNAL",
    label: "Walk-in / outside prescription",
    hint: "No Visit ID needed; a visit is created when you generate the token.",
  },
];

/** Common parenteral / admin routes for injection tokens */
export const INJECTION_ROUTE_OPTIONS = ["SQ", "IM", "IV", "SC", "PO", "TOPICAL"] as const;
export type InjectionRouteOption = (typeof INJECTION_ROUTE_OPTIONS)[number];

export const CUSTOM_ROUTE_VALUE = "__CUSTOM_ROUTE__";
