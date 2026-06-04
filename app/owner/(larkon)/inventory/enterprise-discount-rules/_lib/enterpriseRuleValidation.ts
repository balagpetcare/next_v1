import type { EnterpriseRuleRow, GovernancePolicyLite, RuleFormState } from "./enterpriseRulesTypes";

export type FieldIssue = { field: string; message: string; blocking: boolean };

function num(v: string): number | null {
  if (v.trim() === "") return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function int(v: string): number | null {
  if (v.trim() === "") return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

export function validateRuleForm(form: RuleFormState): FieldIssue[] {
  const issues: FieldIssue[] = [];
  if (!form.name.trim()) issues.push({ field: "name", message: "Enter a rule name.", blocking: true });

  const prio = int(form.priority);
  if (prio == null || prio < 0 || prio > 999999) {
    issues.push({ field: "priority", message: "Priority must be a non-negative whole number.", blocking: true });
  }

  const disc = num(form.discountValue);
  if (disc == null) issues.push({ field: "discountValue", message: "Enter a discount value.", blocking: true });
  else if (form.discountMethod === "PERCENT" && (disc < 0 || disc > 100)) {
    issues.push({ field: "discountValue", message: "Percent must be between 0 and 100.", blocking: true });
  } else if ((form.discountMethod === "FIXED_AMOUNT" || form.discountMethod === "FIXED_PRICE") && disc < 0) {
    issues.push({ field: "discountValue", message: "Amount must be zero or positive.", blocking: true });
  }

  const cap = num(form.maxCapAmount);
  if (form.maxCapAmount.trim() !== "" && (cap == null || cap < 0)) {
    issues.push({ field: "maxCapAmount", message: "Max discount cap must be a valid non-negative number.", blocking: true });
  }

  const minQ = int(form.minQtyForSlab);
  if (form.minQtyForSlab.trim() !== "" && (minQ == null || minQ < 1)) {
    issues.push({ field: "minQtyForSlab", message: "Minimum quantity must be at least 1 when set.", blocking: true });
  }

  if (form.targetKind !== "ALL_PRODUCTS") {
    const tid = int(form.targetId);
    if (tid == null || tid < 1) {
      issues.push({ field: "targetId", message: "Select a target or use “All products”.", blocking: true });
    }
  }

  if (form.scopeKind === "BRANCH_SPECIFIC") {
    const bid = int(form.scopeBranchId);
    if (bid == null || bid < 1) {
      issues.push({ field: "scopeBranchId", message: "Choose a branch for branch-specific scope.", blocking: true });
    }
  }

  if (form.validFrom && form.validTo) {
    const a = new Date(form.validFrom);
    const b = new Date(form.validTo);
    if (!Number.isNaN(a.getTime()) && !Number.isNaN(b.getTime()) && b.getTime() < a.getTime()) {
      issues.push({ field: "validTo", message: "End date must be on or after start date.", blocking: true });
    }
  }

  return issues;
}

export function governanceHintsForForm(
  form: RuleFormState,
  policy: GovernancePolicyLite | null
): FieldIssue[] {
  const hints: FieldIssue[] = [];
  if (!policy) return hints;

  const disc = num(form.discountValue);
  const maxPctRaw = policy.defaultMaxDiscountPercent;
  const maxPct =
    maxPctRaw != null && String(maxPctRaw).trim() !== "" ? parseFloat(String(maxPctRaw)) : null;
  if (form.discountMethod === "PERCENT" && disc != null && maxPct != null && Number.isFinite(maxPct) && disc > maxPct) {
    hints.push({
      field: "discountValue",
      message: `Discount (${disc}%) is above the org default max (${maxPct}%). POS or governance may require approval or block the sale depending on policy.`,
      blocking: false,
    });
  }
  if (form.requiresApproval) {
    hints.push({
      field: "requiresApproval",
      message: "This rule is flagged to require approval workflows where your governance model applies that signal.",
      blocking: false,
    });
  }
  if (policy.retailDiscountApprovalEnabled && disc != null && form.discountMethod === "PERCENT" && disc >= 15) {
    hints.push({
      field: "discountValue",
      message: "Retail discount approval is enabled for this organization. Large enterprise list discounts can still surface as approval triggers at checkout.",
      blocking: false,
    });
  }
  if (policy.blockSaleBelowFloor) {
    hints.push({
      field: "_governance",
      message: "Floor protection is on: resolved prices will not be allowed below the governed floor at POS even if list math suggests a lower value.",
      blocking: false,
    });
  }
  return hints;
}

function ruleTargetKey(r: Pick<EnterpriseRuleRow, "scopeKind" | "scopeBranchId" | "targetKind" | "targetId">): string {
  return `${r.scopeKind}|${r.scopeBranchId ?? ""}|${r.targetKind}|${r.targetId ?? "ALL"}`;
}

function isEngineActive(r: EnterpriseRuleRow, at: Date): boolean {
  if (r.status !== "ACTIVE") return false;
  const from = new Date(r.validFrom);
  if (Number.isNaN(from.getTime()) || from.getTime() > at.getTime()) return false;
  if (r.validTo) {
    const to = new Date(r.validTo);
    if (!Number.isNaN(to.getTime()) && to.getTime() < at.getTime()) return false;
  }
  return true;
}

/** Non-blocking hints when multiple active rules share the same resolution key (same page slice). */
export function overlapWarningsForRow(row: EnterpriseRuleRow, peers: EnterpriseRuleRow[], at = new Date()): string[] {
  const key = ruleTargetKey(row);
  const matches = peers.filter((p) => p.id !== row.id && ruleTargetKey(p) === key && isEngineActive(p, at) && isEngineActive(row, at));
  if (matches.length === 0) return [];
  return [
    `Another active rule targets the same scope (${matches.length} on this page). Lower priority number runs first; non-stackable rules stop the chain early.`,
  ];
}

export function hasBlockingErrors(issues: FieldIssue[]): boolean {
  return issues.some((i) => i.blocking);
}
