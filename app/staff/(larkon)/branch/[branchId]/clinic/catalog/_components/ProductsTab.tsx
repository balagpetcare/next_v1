"use client";

import CatalogItemsTab from "./CatalogItemsTab";

/** Products are catalog items with product-domain types (medicine, retail, consumables). */
const PRODUCT_DOMAIN = "MEDICINE";

export default function ProductsTab({
  branchId,
  search,
  canBranchAdd,
}: {
  branchId: string;
  search: string;
  canBranchAdd?: boolean;
}) {
  return (
    <CatalogItemsTab
      branchId={branchId}
      search={search}
      domainFilter={PRODUCT_DOMAIN}
      canBranchAdd={canBranchAdd}
    />
  );
}
