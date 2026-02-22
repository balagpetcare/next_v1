/**
 * Shared types for Bulk Receive (split-view Product Browser + Selected Grid)
 */

export type Location = {
  id: number;
  name: string;
  type?: string;
  branch?: { id: number; name: string; orgId?: number };
};

export type Vendor = {
  id: number;
  name: string;
};

export type VariantOption = {
  id: number;
  sku: string;
  title: string;
  barcode?: string | null;
  productId: number;
  requiresLot?: boolean;
  requiresExpiry?: boolean;
  requiresMfg?: boolean;
  product?: { id: number; name: string; slug: string };
};

/** Row in the Selected Items grid (right panel) */
export type SelectedRow = {
  id: string;
  variantId: number | null;
  sku: string;
  productName: string;
  quantity: string;
  unitCost: string;
  lotCode: string;
  mfgDate: string;
  expDate: string;
  requiresLot?: boolean;
  requiresExpiry?: boolean;
  requiresMfg?: boolean;
  error?: string;
};

export function emptyRow(): SelectedRow {
  return {
    id: Math.random().toString(36).slice(2),
    variantId: null,
    sku: "",
    productName: "",
    quantity: "",
    unitCost: "",
    lotCode: "",
    mfgDate: "",
    expDate: "",
  };
}
