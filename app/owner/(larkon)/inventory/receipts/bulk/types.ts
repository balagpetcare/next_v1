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
  /** When receiving against a PO, set automatically or per-line for duplicate variants */
  purchaseOrderLineId?: string;
  supplierBarcode?: string;
  requiresLot?: boolean;
  requiresExpiry?: boolean;
  requiresMfg?: boolean;
  error?: string;
  /** PO-linked mode: original ordered qty on this PO line */
  orderedQty?: number;
  /** PO-linked mode: qty already received on this PO line before this GRN */
  receivedQty?: number;
  /** PO-linked mode: pending = orderedQty - receivedQty */
  pendingQty?: number;
  /** PO-linked mode: unit cost from PO line (used as default, read-only display) */
  poUnitCost?: number | null;
  /** Line-level receive remarks */
  lineRemarks?: string;
  /** Line-level discrepancy note (damaged/short reason) */
  lineDiscrepancyNote?: string;
  /** Damaged quantity (enterprise receive) */
  quantityDamaged?: string;
  /** Short quantity (enterprise receive) */
  quantityShort?: string;
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
