"use client";

import CatalogItemsTab from "./CatalogItemsTab";

export default function ClinicalItemsTab({
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
      domainFilter="CLINIC_SUPPLY"
      canBranchAdd={canBranchAdd}
    />
  );
}
