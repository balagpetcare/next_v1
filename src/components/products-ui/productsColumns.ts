/**
 * Column definitions for products table. Permission-gated (cost/margin hidden when no permission).
 */

import type { ProductsCapabilities } from "./productsPermissions";

export type ProductListColumnId =
  | "select"
  | "product"
  | "sku"
  | "variants"
  | "stock"
  | "price"
  | "cost"
  | "margin"
  | "status"
  | "updated"
  | "actions";

export type ColumnDef = {
  id: ProductListColumnId;
  label: string;
  width?: string | number;
  align?: "start" | "center" | "end";
  hide?: boolean;
};

const ALL_COLUMNS: ColumnDef[] = [
  { id: "select", label: "", width: 40, align: "center" },
  { id: "product", label: "Product", align: "start" },
  { id: "sku", label: "SKU", align: "start" },
  { id: "variants", label: "Variants", align: "center" },
  { id: "stock", label: "Stock", align: "center" },
  { id: "price", label: "Price", align: "end" },
  { id: "cost", label: "Cost", align: "end" },
  { id: "margin", label: "Margin", align: "end" },
  { id: "status", label: "Status", align: "start" },
  { id: "updated", label: "Updated", align: "start" },
  { id: "actions", label: "", width: 200, align: "end" },
];

export function getProductsColumns(capabilities: ProductsCapabilities): ColumnDef[] {
  return ALL_COLUMNS.filter((col) => {
    if (col.id === "cost" && !capabilities.canViewCost) return false;
    if (col.id === "margin" && !capabilities.canViewMargin) return false;
    return true;
  });
}

export function getVisibleColumnIds(capabilities: ProductsCapabilities): ProductListColumnId[] {
  return getProductsColumns(capabilities).map((c) => c.id);
}
