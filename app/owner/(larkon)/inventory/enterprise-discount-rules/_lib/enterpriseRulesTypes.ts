import type { BranchOption } from "../../price-master/_lib/priceMasterTypes";

export type { BranchOption };

export type OrgMetaForRules = {
  categories: { id: number; name: string }[];
  brands: { id: number; name: string }[];
};

export type EnterpriseRuleRow = {
  id: number;
  name: string;
  ruleKind: string;
  scopeKind: string;
  scopeBranchId: number | null;
  targetKind: string;
  targetId: number | null;
  discountMethod: string;
  discountValue: unknown;
  maxCapAmount?: unknown;
  minQtyForSlab?: number | null;
  stackable: boolean;
  priority: number;
  requiresApproval: boolean;
  validFrom: string;
  validTo: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  scopeBranch?: { id: number; name: string } | null;
  createdBy?: { id: number; profile?: { displayName: string } | null } | null;
};

export type GovernancePolicyLite = {
  defaultMaxDiscountPercent?: unknown;
  retailDiscountApprovalEnabled?: boolean;
  posPricingGovernanceEnabled?: boolean;
  blockSaleBelowFloor?: boolean;
  blockSaleBelowCost?: boolean;
  allowCampaignStacking?: boolean;
  allowMembershipStacking?: boolean;
};

export type ToolbarFilters = {
  q: string;
  targetKind: string;
  status: string;
  stackable: string;
  effective: string;
  sort: string;
  warningsOnly: boolean;
};

export const DEFAULT_TOOLBAR_FILTERS: ToolbarFilters = {
  q: "",
  targetKind: "",
  status: "",
  stackable: "",
  effective: "",
  sort: "priority_asc",
  warningsOnly: false,
};

export type RuleFormState = {
  id?: number;
  name: string;
  ruleKind: string;
  scopeKind: "ORG_WIDE" | "BRANCH_SPECIFIC";
  scopeBranchId: string;
  targetKind: string;
  targetId: string;
  discountMethod: string;
  discountValue: string;
  maxCapAmount: string;
  minQtyForSlab: string;
  stackable: boolean;
  priority: string;
  requiresApproval: boolean;
  validFrom: string;
  validTo: string;
  status: string;
};

export function emptyRuleForm(): RuleFormState {
  return {
    name: "",
    ruleKind: "VARIANT",
    scopeKind: "ORG_WIDE",
    scopeBranchId: "",
    targetKind: "VARIANT",
    targetId: "",
    discountMethod: "PERCENT",
    discountValue: "5",
    maxCapAmount: "",
    minQtyForSlab: "",
    stackable: false,
    priority: "100",
    requiresApproval: false,
    validFrom: "",
    validTo: "",
    status: "DRAFT",
  };
}

export function rowToForm(r: EnterpriseRuleRow): RuleFormState {
  const toLocal = (iso: string | null | undefined) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  return {
    id: r.id,
    name: r.name,
    ruleKind: r.ruleKind,
    scopeKind: r.scopeKind === "BRANCH_SPECIFIC" ? "BRANCH_SPECIFIC" : "ORG_WIDE",
    scopeBranchId: r.scopeBranchId != null ? String(r.scopeBranchId) : "",
    targetKind: r.targetKind,
    targetId: r.targetId != null ? String(r.targetId) : "",
    discountMethod: r.discountMethod,
    discountValue: String(r.discountValue ?? ""),
    maxCapAmount: r.maxCapAmount != null && String(r.maxCapAmount) !== "" ? String(r.maxCapAmount) : "",
    minQtyForSlab: r.minQtyForSlab != null ? String(r.minQtyForSlab) : "",
    stackable: !!r.stackable,
    priority: String(r.priority ?? 100),
    requiresApproval: !!r.requiresApproval,
    validFrom: toLocal(r.validFrom),
    validTo: toLocal(r.validTo),
    status: r.status || "ACTIVE",
  };
}
