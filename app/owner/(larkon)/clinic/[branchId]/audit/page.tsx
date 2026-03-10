"use client";

import { useParams } from "next/navigation";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

export default function OwnerClinicAuditPage() {
  const params = useParams();
  const branchId = (params?.branchId as string) || "";

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Stock audit"
        subtitle="Clinical stock audits and variance adjustment"
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: "/owner/clinic/" + branchId },
          { label: "Audit", href: "/owner/clinic/" + branchId + "/audit" },
        ]}
      />
      <div className="card radius-12">
        <div className="card-body">
          <p className="text-muted mb-0">Stock audit: create and run audits from the clinic inventory flow. Approve completed audits to post adjustments.</p>
          <p className="mt-2 small text-muted">Use the API: GET/POST /api/v1/owner/clinic/branches/:branchId/audits, POST .../audits/:auditId/approve to manage audits.</p>
        </div>
      </div>
    </div>
  );
}
