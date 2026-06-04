const TARGET_KIND_LABEL: Record<string, string> = {
  VARIANT: "Specific SKU / variant",
  BRAND: "Brand",
  CATEGORY: "Category",
  ALL_PRODUCTS: "All products (catalog-wide)",
};

const RULE_KIND_LABEL: Record<string, string> = {
  VARIANT: "Variant rule",
  BRAND: "Brand rule",
  CATEGORY: "Category rule",
  INVOICE_SLAB: "Invoice / quantity slab",
  BUNDLE: "Bundle",
  OTHER: "Other / advanced",
};

const METHOD_LABEL: Record<string, string> = {
  PERCENT: "Percent off list",
  FIXED_AMOUNT: "Fixed amount off list",
  FIXED_PRICE: "Fixed list price",
};

const SCOPE_KIND_LABEL: Record<string, string> = {
  ORG_WIDE: "All branches",
  BRANCH_SPECIFIC: "Single branch",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  PAUSED: "Paused",
  INACTIVE: "Inactive",
  ARCHIVED: "Archived",
};

export function labelTargetKind(k: string): string {
  return TARGET_KIND_LABEL[k] ?? k;
}

export function labelRuleKind(k: string): string {
  return RULE_KIND_LABEL[k] ?? k;
}

export function labelDiscountMethod(m: string): string {
  return METHOD_LABEL[m] ?? m;
}

export function labelScopeKind(s: string): string {
  return SCOPE_KIND_LABEL[s] ?? s;
}

export function labelStatus(s: string): string {
  return STATUS_LABEL[s] ?? s;
}

export function formatDiscountValue(method: string, raw: unknown): string {
  const n = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""));
  if (!Number.isFinite(n)) return "—";
  if (method === "PERCENT") return `${n}%`;
  if (method === "FIXED_AMOUNT") return `−${n}`;
  if (method === "FIXED_PRICE") return `= ${n}`;
  return String(n);
}
