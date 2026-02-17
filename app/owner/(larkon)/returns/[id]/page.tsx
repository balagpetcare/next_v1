"use client";

import { useParams } from "next/navigation";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import StatusBadge from "@/app/owner/_components/StatusBadge";

export default function ReturnDetailPage() {
  const params = useParams();
  const id = params?.id;

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title={`Return ${id ? `#${id}` : ""}`}
        subtitle="Returns & Damages detail (stub)"
        breadcrumbs={[
          { label: "Owner", href: "/owner/dashboard" },
          { label: "Returns", href: "/owner/returns" },
          { label: String(id || "detail"), href: `/owner/returns/${id || ""}` },
        ]}
      />

      <div className="card radius-12">
        <div className="card-body p-24">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Return #{id}</h5>
            <StatusBadge status="PENDING" />
          </div>
          <p className="text-muted">
            This is a functional shell. Upcoming work will connect to returns API and show itemized quantities,
            evidence, and approval steps.
          </p>
          <div className="alert alert-info mb-0">
            TODO: Add branch info, requested by, reason, and action buttons (approve/reject/receive).
          </div>
        </div>
      </div>
    </div>
  );
}
