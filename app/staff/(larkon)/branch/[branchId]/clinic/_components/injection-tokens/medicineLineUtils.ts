import type { MedLineDraft } from "./types";

export function newMedLineDraft(): MedLineDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    medicineSource: "INTERNAL_CLINIC",
    variantId: "",
    manualMedicineName: "",
    manualStrength: "",
    manualBatch: "",
    manualManufacturer: "",
    route: "SQ",
    expectedDose: "",
    unit: "ml",
    durationText: "",
    frequencyText: "",
    longevityNote: "",
    lineNote: "",
    selectedVialSessionId: "",
    billingUnitPrice: "",
  };
}

function buildOutsideMedicineNotesBlock(name: string, strength: string, batch: string, extra: string): string {
  const lines = [`Outside medicine (patient-brought): ${name.trim()}`];
  if (strength.trim()) lines.push(`Strength: ${strength.trim()}`);
  if (batch.trim()) lines.push(`Batch: ${batch.trim()}`);
  if (extra.trim()) lines.push(extra.trim());
  return lines.join("\n");
}

export function outsideLineNotesForToken(d: MedLineDraft): string {
  const extra = [d.manualManufacturer.trim(), d.lineNote.trim()].filter(Boolean).join(" — ");
  return buildOutsideMedicineNotesBlock(d.manualMedicineName, d.manualStrength, d.manualBatch, extra);
}

export function parseMoney(s: string): number | undefined {
  const n = Number(String(s).replace(/,/g, "").trim());
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function clinicMedicineLinesTotal(lines: MedLineDraft[]): number {
  let s = 0;
  for (const d of lines) {
    if (d.medicineSource === "OUTSIDE_PRESCRIPTION_PATIENT_BROUGHT") continue;
    const n = Number(String(d.billingUnitPrice).replace(/,/g, "").trim());
    if (Number.isFinite(n) && n > 0) s += n;
  }
  return s;
}
