"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo, useEffect } from "react";

/** Redirect /staff/branch/[branchId]/clinic to clinic dashboard. */
export default function StaffBranchClinicIndexPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);

  useEffect(() => {
    if (!branchId) return;
    router.replace(`/staff/branch/${branchId}/clinic/dashboard`);
  }, [branchId, router]);

  return (
    <div className="py-40 px-3 text-center">
      <div className="spinner-border text-primary" role="status" />
      <p className="mt-16 text-secondary-light">Redirecting to clinic...</p>
    </div>
  );
}
