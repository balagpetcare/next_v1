"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PageWorkspace } from "@/src/components/dashboard";
import { staffBranchClinicIntakePath } from "@/lib/crossShellNavigation";

/**
 * Clinic (larkon) intake stub. Requires ?branchId=. When present, replaces with staff canonical intake
 * (same-origin cross-shell — see docs/CROSS_SHELL_NAVIGATION.md).
 */
export default function ClinicIntakePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const branchId = searchParams?.get("branchId") ?? "";
  const appointmentId = params?.appointmentId;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !branchId || !appointmentId) return;
    router.replace(staffBranchClinicIntakePath(branchId, String(appointmentId)));
  }, [mounted, branchId, appointmentId, router]);

  if (!mounted) return null;

  if (!branchId) {
    return (
      <PageWorkspace>
        <div className="alert alert-warning">
          Select a branch to view the intake form. Add <code>?branchId=YOUR_BRANCH_ID</code> to the URL, or use the{" "}
          <Link href="/staff">Staff</Link> panel: Staff → Branch → Clinic → Appointments → Fill Intake.
        </div>
        <Link href="/clinic/appointments" className="btn btn-outline-primary">
          Appointments
        </Link>
      </PageWorkspace>
    );
  }

  return (
    <PageWorkspace>
      <div className="text-center py-24">
      <div className="spinner-border text-primary" role="status" />
      <p className="mt-2 text-muted">Redirecting to intake form…</p>
      </div>
    </PageWorkspace>
  );
}
