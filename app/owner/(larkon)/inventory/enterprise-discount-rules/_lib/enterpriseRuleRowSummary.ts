import type { EnterpriseRuleRow } from "./enterpriseRulesTypes";

export type RuleBadge = { key: string; className: string; text: string };

export function scopeSummary(r: EnterpriseRuleRow): string {
  const loc = r.scopeKind === "BRANCH_SPECIFIC" ? r.scopeBranch?.name ?? `#${r.scopeBranchId ?? "?"}` : "Org-wide";
  if (r.targetKind === "ALL_PRODUCTS") return `${loc} · All products`;
  return `${loc} · ${r.targetKind} #${r.targetId ?? "?"}`;
}

export function collectRowBadges(r: EnterpriseRuleRow, now: Date): RuleBadge[] {
  const badges: RuleBadge[] = [];
  const st = (r.status || "").toUpperCase();
  if (st === "DRAFT") badges.push({ key: "draft", className: "bg-secondary", text: "Draft" });
  if (st === "ACTIVE") badges.push({ key: "active", className: "bg-success", text: "Active" });
  if (st === "PAUSED") badges.push({ key: "paused", className: "bg-warning text-dark", text: "Paused" });
  if (st === "INACTIVE") badges.push({ key: "inactive", className: "bg-light text-dark border", text: "Inactive" });
  if (st === "ARCHIVED") badges.push({ key: "arch", className: "bg-dark", text: "Archived" });
  if (r.stackable) badges.push({ key: "stack", className: "bg-info text-dark", text: "Stackable" });
  if (r.validTo) {
    const to = new Date(r.validTo);
    if (!Number.isNaN(to.getTime()) && to.getTime() < now.getTime() && st === "ACTIVE") {
      badges.push({ key: "exp", className: "bg-danger", text: "Ended" });
    }
  }
  if (r.validFrom) {
    const from = new Date(r.validFrom);
    if (!Number.isNaN(from.getTime()) && from.getTime() > now.getTime()) {
      badges.push({ key: "sched", className: "bg-primary", text: "Scheduled" });
    }
  }
  return badges;
}

export function formatValidityWindow(r: EnterpriseRuleRow): string {
  const a = r.validFrom ? new Date(r.validFrom).toLocaleString() : "—";
  const b = r.validTo ? new Date(r.validTo).toLocaleString() : "Open-ended";
  return `${a} → ${b}`;
}
