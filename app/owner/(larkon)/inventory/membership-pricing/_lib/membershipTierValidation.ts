import type { GovernanceLite, TierFormState } from "./membershipTierTypes";

export type FieldIssue = { field?: string; message: string; blocking: boolean };

function num(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

export function validateTierForm(form: TierFormState): FieldIssue[] {
  const issues: FieldIssue[] = [];
  if (!form.name.trim()) issues.push({ field: "name", message: "Tier name is required.", blocking: true });
  const pct = num(form.discountPercent);
  if (pct == null) issues.push({ field: "discountPercent", message: "Enter a membership discount percentage.", blocking: true });
  else if (pct < 0 || pct > 100) issues.push({ field: "discountPercent", message: "Discount must be between 0 and 100%.", blocking: true });

  const capItem = form.maxDiscountPerItem.trim() ? num(form.maxDiscountPerItem) : null;
  if (capItem != null && capItem < 0) issues.push({ field: "maxDiscountPerItem", message: "Per-unit cap cannot be negative.", blocking: true });

  const capInv = form.maxDiscountPerInvoice.trim() ? num(form.maxDiscountPerInvoice) : null;
  if (capInv != null && capInv < 0) issues.push({ field: "maxDiscountPerInvoice", message: "Per-invoice cap cannot be negative.", blocking: true });

  if (!form.branchScopeAll && (!form.branchIds || form.branchIds.length === 0)) {
    issues.push({ field: "branchIds", message: "Select at least one branch, or choose all branches.", blocking: true });
  }

  return issues;
}

export function governanceHintsForTier(form: TierFormState, policy: GovernanceLite | null): FieldIssue[] {
  const hints: FieldIssue[] = [];
  if (!policy) return hints;
  if (form.stackWithPromo && policy.allowCampaignStacking === false) {
    hints.push({
      field: "stackWithPromo",
      message:
        "This tier allows stacking with campaigns, but organization policy currently disallows campaign stacking on the catalog list layer. Resolution may not stack multiple campaigns; confirm governance before relying on combined effects.",
      blocking: false,
    });
  }
  if ((form.stackWithPromo || form.stackWithBrandDiscount) && policy.allowMembershipStacking === false) {
    hints.push({
      field: "stackWithBrandDiscount",
      message:
        "Tier flags request stacking with campaigns or enterprise rules while governance has membership stacking off. Engine behavior follows governance flags for layer ordering; verify outcomes in the preview panel.",
      blocking: false,
    });
  }
  if (policy.blockSaleBelowFloor) {
    hints.push({
      message:
        "Governance enforces floor/min protections at the point of sale. List-price simulation here may still show a lower intermediate value; checkout can clamp to the protected floor.",
      blocking: false,
    });
  }
  return hints;
}

export function hasBlockingErrors(issues: FieldIssue[]): boolean {
  return issues.some((i) => i.blocking);
}
