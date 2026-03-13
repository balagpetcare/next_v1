"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffClinicDashboardSummary } from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { OperationalAlertStrip } from "@/src/components/dashboard";

const DASHBOARD_PERMS = ["clinic.overview.read", "clinic.overview.manage"];

export default function StaffBranchClinicDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = DASHBOARD_PERMS.some((p) => permissions.includes(p));

  useEffect(() => {
    if (!branchId) return;
    let cancelled = false;
    setSummaryLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    staffClinicDashboardSummary(branchId, { dateFrom: today, dateTo: today })
      .then((data) => {
        if (!cancelled) setSummary(data ?? { visitCount: 0, orderCount: 0, revenue: 0 });
      })
      .catch(() => { if (!cancelled) setSummary({ visitCount: 0, orderCount: 0, revenue: 0 }); })
      .finally(() => { if (!cancelled) setSummaryLoading(false); });
    return () => { cancelled = true; };
  }, [branchId]);

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
        missingPerm="clinic.overview.read"
        onBack={() => router.push(`/staff/branch/${branchId}/clinic`)}
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
        <h5 className="mb-0">Clinic</h5>
      </div>

      <OperationalAlertStrip branchId={branchId} className="mb-3" />

      {summaryLoading && (
        <div className="mb-24 text-center text-secondary-light">Loading today&apos;s summary...</div>
      )}
      {!summaryLoading && summary && (
        <div className="row g-3 mb-24">
          <div className="col-md-4">
            <div className="card radius-12 h-100">
              <div className="card-body">
                <h6 className="text-muted text-uppercase small mb-1">Visits today</h6>
                <p className="mb-0 fs-4 fw-semibold">{summary.visitCount ?? 0}</p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card radius-12 h-100">
              <div className="card-body">
                <h6 className="text-muted text-uppercase small mb-1">Orders today</h6>
                <p className="mb-0 fs-4 fw-semibold">{summary.orderCount ?? 0}</p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card radius-12 h-100">
              <div className="card-body">
                <h6 className="text-muted text-uppercase small mb-1">Revenue today</h6>
                <p className="mb-0 fs-4 fw-semibold">
                  {typeof summary.revenue === "number" ? `৳${Number(summary.revenue).toLocaleString("en-BD")}` : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <Card title="Quick links" subtitle="Clinic operations for this branch.">
        <div className="d-flex flex-wrap gap-2">
          <Link
            href={`/staff/branch/${branchId}/clinic/appointments`}
            className="btn btn-outline-primary radius-12"
          >
            <i className="ri-calendar-check-line me-1" />
            Appointments
          </Link>
          <Link
            href={`/staff/branch/${branchId}/clinic/queue`}
            className="btn btn-outline-primary radius-12"
          >
            <i className="ri-list-check-2 me-1" />
            Queue
          </Link>
          <Link
            href={`/staff/branch/${branchId}/clinic/patients`}
            className="btn btn-outline-primary radius-12"
          >
            <i className="ri-user-heart-line me-1" />
            Patients
          </Link>
          <Link
            href={`/staff/branch/${branchId}/clinic/visits`}
            className="btn btn-outline-primary radius-12"
          >
            <i className="ri-file-list-3-line me-1" />
            Visits
          </Link>
        </div>
      </Card>
    </div>
  );
}
