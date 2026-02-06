"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useBranchContext } from "@/lib/useBranchContext";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";

const REQUIRED_PERM = "reports.view";

export default function StaffBranchReportsPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading, errorCode, hasViewPermission } = useBranchContext(branchId);

  const permissions = myAccess?.permissions ?? [];
  const canView = permissions.includes(REQUIRED_PERM);

  useEffect(() => {
    if (errorCode === "unauthorized") router.replace("/staff/login");
  }, [errorCode, router]);

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }

  if (errorCode === "forbidden" || !hasViewPermission || !canView) {
    return (
      <AccessDenied
        missingPerm={REQUIRED_PERM}
        onBack={() => router.push(`/staff/branch/${branchId}`)}
      />
    );
  }

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />

      <div className="d-flex align-items-center gap-12 mb-24">
        <Link href={`/staff/branch/${branchId}`} className="btn btn-outline-secondary btn-sm">
          ← Branch
        </Link>
        <h5 className="mb-0">Reports</h5>
      </div>

      <Card title="Branch Reports" subtitle="Sales, inventory, and analytics. Export requires reports.export permission.">
        <div className="py-24 text-center text-secondary-light">
          <p className="mb-16">Reports for this branch will appear here when wired to backend.</p>
          <p className="text-sm mb-0">Use Overview dashboard for KPIs. Full reports API: GET /api/v1/reports/sales?branchId= (and related endpoints).</p>
        </div>
      </Card>
    </div>
  );
}
