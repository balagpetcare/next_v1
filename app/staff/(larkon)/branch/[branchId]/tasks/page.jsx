"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import Card from "@/src/bpa/components/ui/Card";
import EmptyState from "@/src/components/dashboard/EmptyState";

const TASKS_PERMS = ["tasks.view", "tasks.assign"];

export default function StaffBranchTasksPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading } = useBranchContext(branchId);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = TASKS_PERMS.some((p) => permissions.includes(p));

  if (isLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        missingPerm="tasks.view"
        onBack={() => router.push(`/staff/branch/${branchId}`)}
      />
    );
  }

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex align-items-center gap-12 mb-24 flex-wrap">
        <Link href={`/staff/branch/${branchId}`} className="btn btn-outline-secondary btn-sm">
          ← Branch
        </Link>
        <h5 className="mb-0">Tasks</h5>
      </div>

      <Card title="Operational tasks" subtitle="Internal tasks: sterilization due, stock verification, approval review, follow-ups.">
        <EmptyState
          icon="ri:task-line"
          title="No tasks yet"
          description="The task engine will list assignable tasks (e.g. sterilization due, stock verification, approval review, doctor credential expiry follow-up) when the backend is ready."
          action={
            <div className="d-flex flex-wrap justify-content-center gap-2">
              <Link href={`/staff/branch/${branchId}/approvals`} className="btn btn-outline-primary btn-sm radius-8">
                Approvals
              </Link>
              <Link href={`/staff/branch/${branchId}`} className="btn btn-outline-secondary btn-sm radius-8">
                Overview
              </Link>
            </div>
          }
        />
      </Card>
    </div>
  );
}
