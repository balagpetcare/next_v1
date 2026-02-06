"use client";

import { useParams } from "next/navigation";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import StatusBadge from "@/app/owner/_components/StatusBadge";

export default function CancellationDetailPage() {
  const params = useParams();
  const id = params?.id;

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title={`Cancellation ${id ? `#${id}` : ""}`}
        subtitle="Placeholder detail view"
        breadcrumbs={[
          { label: "Owner", href: "/owner/dashboard" },
          { label: "Cancellations", href: "/owner/cancellations" },
          { label: String(id || "detail"), href: `/owner/cancellations/${id || ""}` },
        ]}
      />

      <div className="card radius-12">
        <div className="card-body p-24">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Request #{id}</h5>
            <StatusBadge status="REVIEW" />
          </div>
          <p className="text-muted">
            Detailed cancellation data will be connected to the real API. This shell keeps navigation stable and ready
            for approvals.
          </p>
          <div className="alert alert-info mb-0">
            TODO: show items, requester, branch, audit log, and approval actions.
          </div>
        </div>
      </div>
    </div>
  );
}
