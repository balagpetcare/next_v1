"use client";

import { useParams } from "next/navigation";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

export default function OwnerClinicRefillPage() {
  const params = useParams();
  const branchId = (params?.branchId as string) || "";

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Refill suggestions"
        subtitle="Replenishment recommendations from usage analytics"
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: "/owner/clinic/" + branchId },
          { label: "Refill", href: "/owner/clinic/" + branchId + "/refill" },
        ]}
      />
      <div className="card radius-12">
        <div className="card-body">
          <p className="text-muted mb-0">Generate recommendations from ledger usage; convert selected items to a supply request.</p>
          <p className="mt-2 small text-muted">API: GET/POST /api/v1/owner/clinic/branches/:branchId/replenishment, POST .../replenishment/generate.</p>
        </div>
      </div>
    </div>
  );
}
