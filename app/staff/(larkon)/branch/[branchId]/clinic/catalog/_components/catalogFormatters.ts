/**
 * Catalog-specific display formatters. Use for human-readable labels in UI.
 * Extends displayFormatters; never show raw JSON or enum keys.
 */

export const DOMAIN_TYPE_LABELS: Record<string, string> = {
  MEDICINE: "Medicine",
  SURGICAL_CONSUMABLE: "Surgical consumable",
  DRESSING_SUPPLY: "Dressing supply",
  CLINIC_SUPPLY: "Clinical supply",
  INSTRUMENT: "Instrument",
  IMPLANT: "Implant",
  SERVICE_SUPPORT: "Service support",
  PACKAGE_ONLY: "Package only",
};

export const PACKAGE_TYPE_LABELS: Record<string, string> = {
  STANDARD: "Standard",
  PREMIUM: "Premium",
  WELFARE: "Welfare",
  EMERGENCY: "Emergency",
  PROMOTIONAL: "Promotional",
  DOCTOR_SPECIFIC: "Doctor specific",
  BRANCH_SPECIFIC: "Branch specific",
};

export const DISCOUNT_TYPE_LABELS: Record<string, string> = {
  CAMPAIGN: "Campaign",
  MANAGER: "Manager",
  DOCTOR_DISCRETION: "Doctor discretion",
  OWNER: "Owner",
  PACKAGE: "Package",
  LOYALTY: "Loyalty",
  WELFARE_RESCUE: "Welfare rescue",
  PROMOTIONAL: "Promotional",
  BRANCH_EVENT: "Branch event",
};

export const DISCOUNT_SCOPE_LABELS: Record<string, string> = {
  WHOLE_INVOICE: "Whole invoice",
  SERVICE_LEVEL: "Service level",
  PACKAGE_LEVEL: "Package level",
  DOCTOR_FEE_EXCLUDED: "Doctor fee excluded",
  CLINIC_FEE_ONLY: "Clinic fee only",
  ADDON_ONLY: "Add-on only",
  POST_OP_MEDS_ONLY: "Post-op meds only",
};

export const DISCOUNT_CALC_LABELS: Record<string, string> = {
  PERCENTAGE: "Percentage",
  FLAT_AMOUNT: "Flat amount",
  CAPPED_AMOUNT: "Capped amount",
  CONDITIONAL: "Conditional",
  BUNDLE: "Bundle",
};

export const APPROVAL_REQUEST_TYPE_LABELS: Record<string, string> = {
  PACKAGE_CREATE: "Package creation",
  PACKAGE_UPDATE: "Package update",
  DOCTOR_INVITE: "Doctor invite",
  DOCTOR_SCHEDULE: "Doctor schedule",
  DISCOUNT_CHANGE: "Discount change",
  SERVICE_CREATE: "Service creation",
  INVENTORY_PURCHASE: "Inventory purchase",
  DOCTOR_FEE_CHANGE: "Doctor fee change",
  DOCTOR_ACTIVATION: "Doctor activation",
  DOCTOR_DEACTIVATION: "Doctor deactivation",
  DOCTOR_SERVICE_PRIVILEGE: "Doctor service privilege",
  DOCTOR_PACKAGE_PRIVILEGE: "Doctor package privilege",
  DOCTOR_LEAVE: "Doctor leave",
};

export const DOCTOR_PACKAGE_ROLE_LABELS: Record<string, string> = {
  PRIMARY: "Primary",
  ASSISTANT: "Assistant",
  CONSULTANT: "Consultant",
  SURGEON: "Surgeon",
  BACKUP: "Backup",
};

export const SERVICE_CATEGORY_LABELS: Record<string, string> = {
  CONSULTATION: "Consultation",
  VACCINATION: "Vaccination",
  SURGERY: "Surgery",
  GROOMING: "Grooming",
  BOARDING: "Boarding",
  DIAGNOSTICS: "Diagnostics",
  EMERGENCY: "Emergency",
  TEST: "Test",
  PROCEDURE: "Procedure",
  PHARMACY: "Pharmacy",
  OTHER: "Other",
};

function labelFromMap(value: string | undefined | null, map: Record<string, string>): string {
  if (value == null || value === "") return "—";
  const s = String(value).trim();
  return map[s] ?? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatDomainType(type: string | undefined | null): string {
  return labelFromMap(type, DOMAIN_TYPE_LABELS);
}

export function formatPackageType(type: string | undefined | null): string {
  return labelFromMap(type, PACKAGE_TYPE_LABELS);
}

export function formatDiscountType(type: string | undefined | null): string {
  return labelFromMap(type, DISCOUNT_TYPE_LABELS);
}

export function formatDiscountScope(scope: string | undefined | null): string {
  return labelFromMap(scope, DISCOUNT_SCOPE_LABELS);
}

export function formatDiscountCalcType(calc: string | undefined | null): string {
  return labelFromMap(calc, DISCOUNT_CALC_LABELS);
}

export function formatApprovalRequestType(type: string | undefined | null): string {
  return labelFromMap(type, APPROVAL_REQUEST_TYPE_LABELS);
}

export function formatDoctorPackageRole(role: string | undefined | null): string {
  return labelFromMap(role, DOCTOR_PACKAGE_ROLE_LABELS);
}

export function formatServiceCategory(category: string | undefined | null): string {
  return labelFromMap(category, SERVICE_CATEGORY_LABELS);
}

export function formatDiscountSummary(policy: {
  calcType?: string | null;
  maxPercent?: number | string | null;
  maxAmount?: number | string | null;
  scope?: string | null;
}): string {
  const scope = formatDiscountScope(policy.scope);
  const calc = formatDiscountCalcType(policy.calcType);
  const parts: string[] = [];
  if (policy.maxPercent != null && Number(policy.maxPercent) > 0) {
    parts.push(`${policy.maxPercent}%`);
  }
  if (policy.maxAmount != null && Number(policy.maxAmount) > 0) {
    parts.push(`max ৳${Number(policy.maxAmount).toLocaleString()}`);
  }
  if (parts.length === 0) parts.push(calc);
  return `${parts.join(" ")} on ${scope}`;
}

export function formatPrice(value: number | string | null | undefined): string {
  if (value == null) return "—";
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(n)) return "—";
  return `৳${n.toLocaleString()}`;
}
