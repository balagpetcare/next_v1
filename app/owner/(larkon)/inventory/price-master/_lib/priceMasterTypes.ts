export type OrgPricingRow = {
  id: number;
  variantId: number;
  basePrice: unknown;
  markupPercent: unknown;
  minPrice: unknown;
  maxPrice: unknown;
  mrp?: unknown;
  updatedAt?: string;
  variant?: {
    id: number;
    sku?: string;
    title?: string;
    unitId?: number | null;
    unit?: { id: number; code: string; name: string } | null;
    product?: {
      id: number;
      name?: string;
      categoryId?: number | null;
      category?: { id: number; name: string } | null;
    };
  };
};

export type OrgMetaResponse = {
  categories: { id: number; name: string }[];
  brands?: { id: number; name: string }[];
};

export type BranchOption = { id: number; name: string };

export type CostSignal = { latestUnitCost: number | null; sampleCount: number };
