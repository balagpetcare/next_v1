"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Clinic (larkon) intake form page. Requires ?branchId= in URL (same as appointments page).
 * Redirects to staff intake page when branchId is present so one implementation is used.
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
    router.replace(`/staff/branch/${branchId}/clinic/intake/${appointmentId}`);
  }, [mounted, branchId, appointmentId, router]);

  if (!mounted) return null;

  if (!branchId) {
    return (
      <div className="container py-24">
        <div className="alert alert-warning">
          Select a branch to view the intake form. Add <code>?branchId=YOUR_BRANCH_ID</code> to the URL, or use the{" "}
          <Link href="/staff">Staff</Link> panel: Staff → Branch → Clinic → Appointments → Fill Intake.
        </div>
        <Link href="/clinic/appointments" className="btn btn-outline-primary">
          Appointments
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-24 text-center">
      <div className="spinner-border text-primary" role="status" />
      <p className="mt-2 text-muted">Redirecting to intake form…</p>
    </div>
  );
}
