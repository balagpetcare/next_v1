/**
 * Extended medicine workspace fields stored in CountryMedicineBrand.workspaceProfileJson.
 * Does not affect CSV import fingerprint (identity remains country + presentation + brand + package mark).
 */
export type MedicineReviewStatus = "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "REJECTED";

export interface MedicineWorkspaceProfile {
  medicineProductType?: string;
  /** e.g. VETERINARY | HUMAN | BOTH */
  veterinaryHumanFlag?: string;
  /** e.g. OTC | RX | UNKNOWN */
  prescriptionCategory?: string;
  listingStatusNote?: string;
  secondaryGenericsNote?: string;
  strengthOverrideNote?: string;
  unit?: string;
  route?: string;
  manufacturerDisplayOverride?: string;
  importerDistributor?: string;
  originCountryCode?: string;
  packSize?: string;
  packUnit?: string;
  containerType?: string;
  barcode?: string;
  sku?: string;
  internalCode?: string;
  registrationNumber?: string;
  approvalStatus?: string;
  approvalDate?: string;
  expiryDate?: string;
  catalogSourceNote?: string;
  conflictFlagsNote?: string;
  indications?: string;
  contraindications?: string;
  sideEffects?: string;
  warnings?: string;
  storage?: string;
  doseNotes?: string;
  speciesApplicability?: string;
  mrp?: string;
  tradePrice?: string;
  purchasePrice?: string;
  taxVat?: string;
  /** One URL per line */
  attachmentUrls?: string;
  reviewerNotes?: string;
  changeReason?: string;
}

export function parseWorkspaceProfile(raw: unknown): MedicineWorkspaceProfile {
  if (!raw || typeof raw !== "object") return {};
  return { ...(raw as MedicineWorkspaceProfile) };
}
