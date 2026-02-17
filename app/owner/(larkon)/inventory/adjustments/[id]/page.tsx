"use client";

import { useParams } from "next/navigation";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import StatusBadge from "@/app/owner/_components/StatusBadge";

export default function AdjustmentDetailPage() {
  const params = useParams();
  const id = params?.id;

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title={`Adjustment ${id ? `#${id}` : ""}`}
        subtitle="Detail shell — wiring placeholder"
        breadcrumbs={[
          { label: "Owner", href: "/owner/dashboard" },
          { label: "Adjustments", href: "/owner/inventory/adjustments" },
          { label: String(id || "detail"), href: `/owner/inventory/adjustments/${id || ""}` },
        ]}
      />

      <div className="card radius-12">
        <div className="card-body p-24">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <div className="text-muted small mb-1">Reference</div>
              <h5 className="mb-0">#{id}</h5>
            </div>
            <StatusBadge status="PENDING" />
          </div>
          <p className="text-muted">
            Detailed adjustment view will be connected to the inventory adjustment service in Phase-3. This shell keeps navigation stable.
          </p>
          <div className="alert alert-info mb-0">
            Coming soon: itemized quantities, reason codes, audit trail, and approval actions.
          </div>
        </div>
      </div>
    </div>
  );
}
