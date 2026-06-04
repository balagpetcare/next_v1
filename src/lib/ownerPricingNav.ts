/**
 * Canonical Owner pricing routes (pages live under `/owner/inventory/*`).
 * Used by `permissionMenu.ts` and any pricing screens that need shared hrefs.
 */
export const OWNER_PRICING_NAV = {
  hub: "/owner/inventory/pricing-governance",
  governance: "/owner/inventory/pricing-governance",
  priceMaster: "/owner/inventory/price-master",
  discountRules: "/owner/inventory/enterprise-discount-rules",
  /** Full-page create flow for enterprise discount rules */
  discountRulesNew: "/owner/inventory/enterprise-discount-rules/new",
  /** Duplicate-from-rule opens create with `?duplicateFrom=` */
  discountRulesNewDuplicateFrom: (ruleId: number | string) =>
    `/owner/inventory/enterprise-discount-rules/new?duplicateFrom=${ruleId}`,
  /** Read-only rule detail */
  discountRuleDetail: (ruleId: number | string) => `/owner/inventory/enterprise-discount-rules/${ruleId}`,
  /** Full-page edit flow — `ruleId` must be numeric */
  discountRuleEdit: (ruleId: number | string) => `/owner/inventory/enterprise-discount-rules/${ruleId}/edit`,
  campaigns: "/owner/inventory/pricing-campaigns",
  membership: "/owner/inventory/membership-pricing",
  analytics: "/owner/inventory/pricing-analytics",
} as const;

/** Any one of these grants visibility of the top-level Pricing sidebar group (with children still gated per item). */
export const OWNER_PRICING_SECTION_PERMISSIONS = [
  "pricing.central.read",
  "pricing.audit.view",
  "pricing.central.write",
  "pricing.retail.rule.manage",
  "pricing.campaign.manage",
  "pricing.membership.manage",
  "pricing.analytics.view",
  "pricing.bulk.import",
  "pricing.approval.matrix.manage",
  "pricing.emergency.override",
  "pricing.branch.override.approve",
  "pricing.branch.override.request",
] as const;
