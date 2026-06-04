import type { EnterpriseRuleRow, ToolbarFilters } from "./enterpriseRulesTypes";

export function buildEnterpriseRulesListQuery(
  orgId: number,
  page: number,
  limit: number,
  filters: ToolbarFilters
): string {
  const qs = new URLSearchParams({
    orgId: String(orgId),
    page: String(page),
    limit: String(limit),
    sort: filters.sort || "priority_asc",
  });
  if (filters.q.trim()) qs.set("q", filters.q.trim());
  if (filters.targetKind) qs.set("targetKind", filters.targetKind);
  if (filters.status) qs.set("status", filters.status);
  if (filters.stackable === "1") qs.set("stackable", "true");
  if (filters.stackable === "0") qs.set("stackable", "false");
  if (filters.effective) qs.set("effective", filters.effective);
  return qs.toString();
}

/** Loads a single rule for the owner edit page (uses optional `ruleId` list filter on the API). */
export function buildEnterpriseRuleByIdQuery(orgId: number, ruleId: number): string {
  return new URLSearchParams({
    orgId: String(orgId),
    page: "1",
    limit: "1",
    ruleId: String(ruleId),
  }).toString();
}

export function parseUpsertBody(orgId: number, form: import("./enterpriseRulesTypes").RuleFormState): Record<string, unknown> {
  const parseNum = (s: string) => {
    const t = s.trim();
    if (t === "") return null;
    const n = parseFloat(t);
    return Number.isFinite(n) ? n : null;
  };
  const parseIntOrNull = (s: string) => {
    const t = s.trim();
    if (t === "") return null;
    const n = parseInt(t, 10);
    return Number.isFinite(n) ? n : null;
  };
  const toIso = (local: string) => {
    if (!local || !local.trim()) return null;
    const d = new Date(local);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  };

  const targetId =
    form.targetKind === "ALL_PRODUCTS" ? null : parseIntOrNull(form.targetId);

  const body: Record<string, unknown> = {
    orgId,
    name: form.name.trim(),
    ruleKind: form.ruleKind,
    scopeKind: form.scopeKind,
    scopeBranchId:
      form.scopeKind === "BRANCH_SPECIFIC" ? parseIntOrNull(form.scopeBranchId) : null,
    targetKind: form.targetKind,
    targetId,
    discountMethod: form.discountMethod,
    discountValue: parseNum(form.discountValue) ?? 0,
    maxCapAmount: parseNum(form.maxCapAmount),
    minQtyForSlab: parseIntOrNull(form.minQtyForSlab),
    stackable: form.stackable,
    priority: parseIntOrNull(form.priority) ?? 100,
    requiresApproval: form.requiresApproval,
    status: form.status,
  };

  const vf = toIso(form.validFrom);
  const vt = toIso(form.validTo);
  if (vf) body.validFrom = vf;
  if (form.validTo.trim()) body.validTo = vt;
  else body.validTo = null;

  if (form.id) body.id = form.id;
  return body;
}

export type ListRulesResponse = {
  data?: EnterpriseRuleRow[];
  pagination?: { page?: number; limit?: number; total?: number };
};

type OwnerGet = <T>(path: string) => Promise<T | null>;

/**
 * Fetches a single rule via the list endpoint (`ruleId` query filter).
 * Returns `{ row: null, error: null }` when the rule does not exist in the org.
 */
export async function fetchEnterpriseRuleRow(
  ownerGet: OwnerGet,
  orgId: number,
  ruleId: number
): Promise<{ row: EnterpriseRuleRow | null; error: string | null }> {
  try {
    const qs = buildEnterpriseRuleByIdQuery(orgId, ruleId);
    const res = (await ownerGet<ListRulesResponse>(`/api/v1/pricing/enterprise-discount/rules?${qs}`)) as ListRulesResponse | null;
    const data = res?.data ?? [];
    const row = Array.isArray(data) ? (data[0] as EnterpriseRuleRow | undefined) : undefined;
    if (!row || row.id !== ruleId) {
      return { row: null, error: null };
    }
    return { row, error: null };
  } catch (e: unknown) {
    return { row: null, error: e instanceof Error ? e.message : "Failed to load rule" };
  }
}
