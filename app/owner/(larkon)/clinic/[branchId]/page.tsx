"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ownerClinicBranches,
  ownerClinicDashboardStatsSafe,
  type OwnerClinicDashboardStats,
} from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import ClinicDashboardWidgets from "@/app/owner/_components/clinic/ClinicDashboardWidgets";
import ClinicDashboardCharts from "@/app/owner/_components/clinic/ClinicDashboardCharts";

type BranchSummary = {
  id: number;
  name: string;
  orgId: number;
  status?: string;
  org?: { id: number; name: string };
};

function pickBranches(res: { success?: boolean; data?: unknown[] } | null): BranchSummary[] {
  if (!res?.data || !Array.isArray(res.data)) return [];
  return res.data as BranchSummary[];
}

export default function ClinicBranchDashboardPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const [branch, setBranch] = useState<BranchSummary | null>(null);
  const [stats, setStats] = useState<OwnerClinicDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!branchId) return;
    async function load() {
      try {
        setLoading(true);
        setError("");
        const [branchesRes, dashboardStats] = await Promise.all([
          ownerClinicBranches(),
          ownerClinicDashboardStatsSafe(branchId),
        ]);
        const branches = pickBranches(branchesRes as { success?: boolean; data?: unknown[] });
        const current = branches.find((b) => String(b.id) === String(branchId));
        setBranch(current ?? null);
        setStats(dashboardStats);
      } catch (e) {
        setError((e as Error)?.message || "Failed to load clinic");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [branchId]);

  if (!branchId) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">Invalid branch.</div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Overview"
        subtitle={branch?.name ?? `Clinic #${branchId}`}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: branch?.name ?? `Clinic #${branchId}`, href: `/owner/clinic/${branchId}` },
          { label: "Overview", href: `/owner/clinic/${branchId}` },
        ]}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      <ClinicDashboardWidgets stats={stats} loading={loading} />
      <ClinicDashboardCharts stats={stats} loading={loading} />

      <div className="row g-4 mt-1">
        <div className="col-12 col-xl-7">
          <div className="card radius-12 h-100">
            <div className="card-body p-24">
              <h6 className="mb-3 fw-semibold">
                <i className="ri-flashlight-line me-2 text-primary" />
                Quick Actions
              </h6>
              <div className="row g-2">
                <div className="col-12 col-md-6 col-lg-4">
                  <Link href={`/owner/clinic/${branchId}/appointments`} className="btn btn-outline-primary w-100 radius-12">
                    <i className="ri-calendar-check-line me-1" />
                    Manage Appointments
                  </Link>
                </div>
                <div className="col-12 col-md-6 col-lg-4">
                  <Link href={`/owner/clinic/${branchId}/doctors`} className="btn btn-outline-primary w-100 radius-12">
                    <i className="ri-stethoscope-line me-1" />
                    Manage Doctors
                  </Link>
                </div>
                <div className="col-12 col-md-6 col-lg-4">
                  <Link href={`/owner/clinic/${branchId}/services`} className="btn btn-outline-primary w-100 radius-12">
                    <i className="ri-service-line me-1" />
                    Manage Services
                  </Link>
                </div>
                <div className="col-12 col-md-6 col-lg-4">
                  <Link href={`/owner/clinic/${branchId}/packages`} className="btn btn-outline-primary w-100 radius-12">
                    <i className="ri-box-3-line me-1" />
                    Manage Packages
                  </Link>
                </div>
                <div className="col-12 col-md-6 col-lg-4">
                  <Link href={`/owner/clinic/${branchId}/schedule`} className="btn btn-outline-primary w-100 radius-12">
                    <i className="ri-calendar-event-line me-1" />
                    Manage Schedule
                  </Link>
                </div>
                <div className="col-12 col-md-6 col-lg-4">
                  <Link href={`/owner/clinic/${branchId}/reports`} className="btn btn-outline-primary w-100 radius-12">
                    <i className="ri-bar-chart-box-line me-1" />
                    View Reports
                  </Link>
                </div>
                <div className="col-12 col-md-6 col-lg-4">
                  <Link href={`/owner/clinic/${branchId}/injection-monitor`} className="btn btn-outline-primary w-100 radius-12">
                    <i className="ri-pulse-line me-1" />
                    Injection Monitor
                  </Link>
                </div>
                <div className="col-12 col-md-6 col-lg-4">
                  <Link href={`/owner/clinic/${branchId}/reconciliation`} className="btn btn-outline-primary w-100 radius-12">
                    <i className="ri-shield-check-line me-1" />
                    Reconciliation
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-5">
          <div className="card radius-12 h-100">
            <div className="card-body p-24">
              <h6 className="mb-3 fw-semibold">
                <i className="ri-notification-3-line me-2 text-warning" />
                Alerts & Pending Actions
              </h6>
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-warning" role="status" />
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <span>Pending approvals</span>
                    <span className="badge bg-warning-subtle text-warning-emphasis radius-8">
                      {stats?.pendingApprovals ?? 0}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span>Low stock alerts</span>
                    <span className="badge bg-danger-subtle text-danger-emphasis radius-8">
                      {stats?.lowStockAlerts ?? 0}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span>Expiring items (30 days)</span>
                    <span className="badge bg-info-subtle text-info-emphasis radius-8">
                      {stats?.expiringItems ?? 0}
                    </span>
                  </div>
                  {Number(stats?.pendingApprovals ?? 0) === 0 &&
                  Number(stats?.lowStockAlerts ?? 0) === 0 &&
                  Number(stats?.expiringItems ?? 0) === 0 ? (
                    <div className="alert alert-success radius-12 mb-0">
                      <i className="ri-checkbox-circle-line me-1" />
                      No urgent alerts for this clinic.
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
