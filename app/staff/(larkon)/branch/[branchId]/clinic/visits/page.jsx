"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";

const VISITS_PERMS = ["clinic.visits.read", "clinic.visits.manage", "clinic.emr.read", "clinic.emr.write"];

export default function StaffBranchClinicVisitsPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = VISITS_PERMS.some((p) => permissions.includes(p));

  if (ctxLoading) {
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
        missingPerm="clinic.visits.read"
        onBack={() => router.push(`/staff/branch/${branchId}/clinic`)}
      />
    );
  }

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex align-items-center gap-12 mb-24">
        <Link href={`/staff/branch/${branchId}/clinic`} className="btn btn-outline-secondary btn-sm">
          ← Clinic
        </Link>
        <h5 className="mb-0">Visits</h5>
      </div>

      <Card title="Visits" subtitle="Visit history and shortcuts.">
        <div className="py-24 text-center text-secondary-light">
          Visit list and history will be available here. Use Appointments and Queue for now.
        </div>
        <ul className="list-unstyled mb-0">
          <li className="mb-8">
            <Link href={`/staff/branch/${branchId}/clinic/appointments`}>Appointments</Link>
          </li>
          <li>
            <Link href={`/staff/branch/${branchId}/clinic/queue`}>Queue</Link>
          </li>
        </ul>
      </Card>
    </div>
  );
}
