/**
 * Minimal product list item shape for products-ui kit.
 * Aligns with GET /api/v1/products response items.
 */
export interface ProductListItem {
  id: number;
  name: string;
  slug: string;
  status: string;
  approvalStatus?: string;
  createdAt: string;
  updatedAt: string;
  categoryId?: number | null;
  brandId?: number | null;
  category?: { id: number; name: string } | null;
  brand?: { id: number; name: string } | null;
  org?: { id: number; name: string };
  createdBy?: { id: number; profile?: { displayName?: string } };
  variants: Array<{
    id: number;
    sku: string;
    title: string;
    barcode?: string | null;
    isActive?: boolean;
  }>;
  media?: Array<{ id: number; media?: { id: number; url: string } }>;
}

export type ProductSort = "updated_desc" | "updated_asc" | "name_asc" | "name_desc";

export interface ProductsFiltersState {
  search: string;
  status: string;
  approvalStatus: string;
  categoryId: string;
  brandId: string;
  sort: ProductSort;
}

export type ProductsKpiStats = {
  total: number;
  active: number;
  inactive: number;
  lowStock: number;
  draft: number;
  pendingApproval: number;
};
