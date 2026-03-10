"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { useBranchContext } from "@/lib/useBranchContext";
import AccessDenied from "@/src/components/branch/AccessDenied";

/**
 * Clinic layout: gate on branch type, clinicEnabled, and at least one clinic.* permission.
 * When clinic is disabled by owner or user has no clinic access, show message and do not render children.
 */
export default function StaffBranchClinicLayout({ children }) {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading } = useBranchContext(branchId);

  if (isLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }

  const clinicEnabled = branch?.clinicEnabled === true;
  const isClinicType = (branch?.type ?? "").toUpperCase() === "CLINIC";
  const isClinic = isClinicType || clinicEnabled;
  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasClinicPermission = permissions.some((p) => String(p).startsWith("clinic."));

  if (!isClinic) {
    return (
      <AccessDenied
        title="Not a clinic branch"
        message="This area is only available for clinic branches. Select a clinic branch to access Clinic."
        onBack={() => router.push(`/staff/branch/${branchId}`)}
      />
    );
  }

  if (!clinicEnabled) {
    return (
      <AccessDenied
        title="Clinic module disabled"
        message="The owner has disabled the Clinic module for this branch. Contact the branch owner to enable it."
        onBack={() => router.push(`/staff/branch/${branchId}`)}
      />
    );
  }

  if (!hasClinicPermission) {
    return (
      <AccessDenied
        title="No clinic access"
        message="You don't have permission to access Clinic for this branch. Contact your manager for clinic access."
        onBack={() => router.push(`/staff/branch/${branchId}`)}
      />
    );
  }

  return <>{children}</>;
}
