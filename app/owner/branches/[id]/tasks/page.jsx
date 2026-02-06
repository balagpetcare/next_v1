"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import BranchPageShell from "@/app/owner/_components/branch/BranchPageShell";

export default function BranchTasksPage() {
  const params = useParams();
  const branchId = useMemo(() => String(params?.id || ""), [params]);
  const base = `/owner/branches/${branchId}`;

  return (
    <BranchPageShell
      title="Tasks"
      subtitle="Create and manage tasks for this branch"
      breadcrumbLabel="Tasks"
    >
      <div className="card radius-12">
        <div className="card-body p-24 text-center py-5">
          <i className="ri-clipboard-list-line text-primary mb-3" style={{ fontSize: 48 }} />
          <h6 className="fw-semibold mb-2">Tasks</h6>
          <p className="text-muted mb-4">
            Create tasks, assign to staff, and track progress. Task management will be available here soon.
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
