"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import BranchPageShell from "@/app/owner/_components/branch/BranchPageShell";

export default function BranchNotificationsPage() {
  const params = useParams();
  const branchId = useMemo(() => String(params?.id || ""), [params]);
  const base = `/owner/branches/${branchId}`;

  return (
    <BranchPageShell
      title="Notifications"
      subtitle="View and resolve notifications for this branch"
      breadcrumbLabel="Notifications"
    >
      <div className="card radius-12">
        <div className="card-body p-24 text-center py-5">
          <i className="ri-notification-line text-primary mb-3" style={{ fontSize: 48 }} />
          <h6 className="fw-semibold mb-2">Notifications</h6>
          <p className="text-muted mb-4">
            Branch-specific notifications, complaints, and updates will appear here. Use the main notification panel for now.
          </p>
          <Link href={base} className="btn btn-outline-primary radius-12">
            <i className="ri-arrow-left-line me-1" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </BranchPageShell>
  );
}
