/**
 * Client-side central pricing band checks aligned with backend
 * `validateCentralPricingBand` in pricingGovernance.service.ts.
 * Used for UX only — server remains authoritative.
 */

export type CentralPricingFields = {
  basePrice?: number | null;
  markupPercent?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  mrp?: number | null;
};

export type PricingValidationIssue = {
  level: "error" | "warn";
  code: string;
  message: string;
};

function n(v: unknown): number | null {
  if (v === "" || v === undefined || v === null) return null;
  const x = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(x) ? x : null;
}

/** Mirrors backend validateCentralPricingBand (throws → errors here). */
export function validateCentralBand(data: CentralPricingFields): PricingValidationIssue[] {
  const issues: PricingValidationIssue[] = [];
  const min = data.minPrice != null ? Number(data.minPrice) : null;
  const max = data.maxPrice != null ? Number(data.maxPrice) : null;
  const mrp = data.mrp != null ? Number(data.mrp) : null;
  const upper = mrp != null && max != null ? Math.min(mrp, max) : mrp ?? max;
  const base = data.basePrice != null ? Number(data.basePrice) : null;

  if (min != null && upper != null && min > upper + 1e-6) {
    issues.push({
      level: "error",
      code: "FLOOR_ABOVE_CAP",
      message: "Floor (min) cannot exceed the effective ceiling (lower of max price and MRP).",
    });
  }
  if (base != null && min != null && base < min - 1e-6) {
    issues.push({
      level: "error",
      code: "BASE_BELOW_FLOOR",
      message: "Base price cannot be below floor (min price).",
    });
  }
  if (base != null && upper != null && base > upper + 1e-6) {
    issues.push({
      level: "error",
      code: "BASE_ABOVE_CAP",
      message: "Base price cannot exceed the effective ceiling (MRP cap).",
    });
  }
  if (base != null && data.markupPercent != null) {
    const after = base * (1 + Number(data.markupPercent) / 100);
    if (min != null && after < min - 1e-6) {
      issues.push({
        level: "error",
        code: "MARKUP_BELOW_FLOOR",
        message: "List price after markup would be below floor (min price).",
      });
    }
    if (upper != null && after > upper + 1e-6) {
      issues.push({
        level: "error",
        code: "MARKUP_ABOVE_CAP",
        message: "List price after markup would exceed the MRP upper cap.",
      });
    }
  }
  return issues;
}

export function hasBlockingErrors(issues: PricingValidationIssue[]) {
  return issues.some((i) => i.level === "error");
}

/** Cost vs base warnings (informational / risk). */
export function costWarnings(basePrice: unknown, refCost: number | null | undefined): PricingValidationIssue[] {
  const issues: PricingValidationIssue[] = [];
  const base = n(basePrice);
  if (refCost == null || refCost <= 0 || base == null) return issues;
  if (base < refCost - 1e-6) {
    issues.push({
      level: "error",
      code: "BELOW_REF_COST",
      message: "Base price is below the latest reference unit cost from purchase / GRN signals.",
    });
  } else if (base < refCost * 1.05) {
    issues.push({
      level: "warn",
      code: "NEAR_COST",
      message: "Base price is within 5% of reference unit cost — margin is very tight.",
    });
  }
  return issues;
}

export function marginFromBase(base: number | null, refCost: number | null | undefined) {
  if (base == null || refCost == null || refCost <= 0) return { amount: null as number | null, pct: null as number | null };
  const amount = base - refCost;
  const pct = (amount / refCost) * 100;
  return { amount: Math.round(amount * 100) / 100, pct: Math.round(pct * 100) / 100 };
}
