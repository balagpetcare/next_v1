export interface MasterProduct {
  id: number;
  name: string;
  slug: string;
  barcode?: string | null;
  description?: string | null;
  suggestedPrice?: number;
  currency?: string;
  variantsJson?: unknown;
  metaJson?: unknown;
  brand?: { id: number; name: string; slug: string };
  category?: { id: number; name: string; slug: string };
  isActive: boolean;
  isVerified: boolean;
  primaryMedia?: { id: number; url?: string; type?: string } | null;
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export type StatusFilter = "all" | "added" | "not_added";
