"use client";

import { useParams } from "next/navigation";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

export default function OwnerClinicWastagePage() {
  const params = useParams();
  const branchId = (params?.branchId as string) || "";

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Wastage"
        subtitle="Clinical item wastage logs and approval"
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: "/owner/clinic/" + branchId },
          { label: "Wastage", href: "/owner/clinic/" + branchId + "/wastage" },
        ]}
      />
      <div className="card radius-12">
        <div className="card-body">
          <p className="text-muted mb-0">Wastage logs: staff report expired/damaged/contaminated stock; owner approves to deduct from inventory.</p>
          <p className="mt-2 small text-muted">API: GET /api/v1/owner/clinic/branches/:branchId/wastage, POST .../wastage/:wastageId/approve.</p>
        </div>
      </div>
    </div>
  );
}
