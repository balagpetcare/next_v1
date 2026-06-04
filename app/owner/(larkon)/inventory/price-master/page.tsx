"use client";

import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { OWNER_PRICING_NAV } from "@/src/lib/ownerPricingNav";
import { PriceMasterWorkspace } from "./_components/PriceMasterWorkspace";

export default function PriceMasterPage() {
  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Price Master"
        subtitle="Central catalog pricing for your organization — list prices, floors, MRP caps, cost-aware margins, bulk tools, and resolution simulation aligned with governance and POS enforcement."
        breadcrumbs={[
          { label: "Owner", href: "/owner/dashboard" },
          { label: "Inventory", href: "/owner/inventory" },
          { label: "Price master", href: OWNER_PRICING_NAV.priceMaster },
        ]}
      />
      <PriceMasterWorkspace />
    </div>
  );
}
