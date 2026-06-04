export type LinkedDiscountCard = { id: number; cardNumber: string; status: string };

export type MembershipTierExclusion = { excludeKind: string; excludeId: number };

export type MembershipTierRow = {
  id: number;
  orgId?: number;
  name: string;
  discountPercent: unknown;
  maxDiscountPerItem?: unknown;
  maxDiscountPerInvoice?: unknown;
  stackWithPromo?: boolean;
  stackWithBrandDiscount?: boolean;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  exclusions?: MembershipTierExclusion[];
  branchScopes?: { branchId: number; branch?: { id: number; name: string } | null }[];
  ownerDiscountCards?: LinkedDiscountCard[];
};

export type DiscountCardOption = {
  id: number;
  cardNumber: string;
  status: string;
  membershipTierId: number | null;
  branchId: number | null;
  discountPercent: number;
  expiresAt: string | null;
};

export type OrgMetaLite = {
  categories: { id: number; name: string }[];
  brands: { id: number; name: string }[];
};

export type GovernanceLite = {
  allowCampaignStacking?: boolean;
  allowMembershipStacking?: boolean;
  blockSaleBelowFloor?: boolean;
  blockSaleBelowCost?: boolean;
  defaultMaxDiscountPercent?: unknown;
  posPricingGovernanceEnabled?: boolean;
};

export type TierToolbarFilters = {
  q: string;
  status: string;
  scopedOnly: boolean;
  exclusionsOnly: boolean;
};

export type TierFormState = {
  id?: number;
  name: string;
  discountPercent: string;
  maxDiscountPerItem: string;
  maxDiscountPerInvoice: string;
  stackWithPromo: boolean;
  stackWithBrandDiscount: boolean;
  status: string;
  branchScopeAll: boolean;
  branchIds: number[];
  exclusions: MembershipTierExclusion[];
  linkCardId: string;
};

export type SortKey = "name" | "discount" | "status" | "updated";
export type SortDir = "asc" | "desc";

export const DEFAULT_TIER_FILTERS: TierToolbarFilters = {
  q: "",
  status: "",
  scopedOnly: false,
  exclusionsOnly: false,
};

export function emptyTierForm(): TierFormState {
  return {
    name: "",
    discountPercent: "",
    maxDiscountPerItem: "",
    maxDiscountPerInvoice: "",
    stackWithPromo: false,
    stackWithBrandDiscount: false,
    status: "DRAFT",
    branchScopeAll: true,
    branchIds: [],
    exclusions: [],
    linkCardId: "",
  };
}

export function tierToForm(t: MembershipTierRow): TierFormState {
  const bids = (t.branchScopes ?? []).map((s) => s.branchId).filter((n) => Number.isFinite(n));
  const branchScopeAll = bids.length === 0;
  const linkedCards = t.ownerDiscountCards ?? [];
  const linkCardId = linkedCards.length === 1 ? String(linkedCards[0].id) : "";
  return {
    id: t.id,
    name: t.name,
    discountPercent: String(t.discountPercent ?? ""),
    maxDiscountPerItem: t.maxDiscountPerItem != null ? String(t.maxDiscountPerItem) : "",
    maxDiscountPerInvoice: t.maxDiscountPerInvoice != null ? String(t.maxDiscountPerInvoice) : "",
    stackWithPromo: !!t.stackWithPromo,
    stackWithBrandDiscount: !!t.stackWithBrandDiscount,
    status: String(t.status || "ACTIVE").toUpperCase(),
    branchScopeAll,
    branchIds: bids,
    exclusions: (t.exclusions ?? []).map((e) => ({ excludeKind: e.excludeKind, excludeId: e.excludeId })),
    linkCardId,
  };
}

export type VariantHit = { id: number; sku: string; title: string; product?: { name?: string } };
