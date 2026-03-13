"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffDoctorsSummary,
  staffDoctorsAlerts,
  staffDoctorsPerformanceSummary,
} from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import {
  PageWorkspace,
  PageHeader,
  LoadingState,
  StatCard,
  SectionCard,
  EmptyState,
} from "@/src/components/dashboard";
import DoctorAlertStrip from "@/src/components/clinic/doctors/DoctorAlertStrip";
import { Doctor360Drawer } from "@/src/components/clinic/doctors";
import type { DoctorsSummary, OperationalAlert } from "@/src/components/clinic/doctors";
import {
  doctors,
  approvals,
  availability,
  credentials,
  licenses,
  invite,
  assignExisting,
  scheduleBoard,
  serviceAssignment,
  performance as performanceRoute,
} from "@/src/lib/doctorOperationsRoutes";

const DOCTORS_PERMS = ["clinic.doctors.view", "clinic.doctors.assign"];

function formatCurrency(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `৳${Number(n).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;
}

export default function StaffClinicDoctorsOverviewPage() {
  const params = useParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);

  const [summary, setSummary] = useState<DoctorsSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [alerts, setAlerts] = useState<OperationalAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [performance, setPerformance] = useState<{
    doctors: Array<{
      branchMemberId: number;
      displayName: string;
      appointmentsCompleted: number;
      revenueContribution: number | null;
      topServices: Array<{ serviceName: string | null; count: number }>;
    }>;
    totals: { appointmentsCompleted: number; revenueContribution: number | null };
  } | null>(null);
  const [performanceLoading, setPerformanceLoading] = useState(true);
  const [drawerMemberId, setDrawerMemberId] = useState<number | null>(null);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = DOCTORS_PERMS.some((p) => permissions.includes(p));

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  }, []);
  const todayEnd = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }, []);

  const loadSummary = useCallback(async () => {
    if (!branchId || !hasAccess) return;
    setSummaryLoading(true);
    try {
      const data = await staffDoctorsSummary(branchId);
      setSummary(data ?? null);
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [branchId, hasAccess]);

  const loadAlerts = useCallback(async () => {
    if (!branchId || !hasAccess) return;
    setAlertsLoading(true);
    try {
      const data = await staffDoctorsAlerts(branchId);
      setAlerts(Array.isArray(data) ? data : []);
    } catch {
      setAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  }, [branchId, hasAccess]);

  const loadPerformance = useCallback(async () => {
    if (!branchId || !hasAccess) return;
    setPerformanceLoading(true);
    try {
      const data = await staffDoctorsPerformanceSummary(branchId, {
        from: todayStart,
        to: todayEnd,
        limit: 10,
        offset: 0,
      });
      setPerformance(data ?? null);
    } catch {
      setPerformance(null);
    } finally {
      setPerformanceLoading(false);
    }
  }, [branchId, hasAccess, todayStart, todayEnd]);

  useEffect(() => {
    loadSummary();
    loadAlerts();
    loadPerformance();
  }, [loadSummary, loadAlerts, loadPerformance]);

  if (ctxLoading || !branch) {
    return (
      <PageWorkspace>
        <LoadingState message="Loading branch…" />
      </PageWorkspace>
    );
  }

  if (!hasAccess) {
    return (
      <PageWorkspace>
        <BranchHeader branch={branch} />
        <AccessDenied requiredPerm="clinic.doctors.view" />
      </PageWorkspace>
    );
  }

  const revenueToday = performance?.totals?.revenueContribution ?? null;
  const appointmentsToday = performance?.totals?.appointmentsCompleted ?? 0;
  const topDoctors = (performance?.doctors ?? [])
    .slice()
    .sort((a, b) => (b.revenueContribution ?? 0) - (a.revenueContribution ?? 0))
    .slice(0, 5);

  const serviceCounts: Record<string, number> = {};
  (performance?.doctors ?? []).forEach((d) => {
    (d.topServices ?? []).forEach((s) => {
      const name = s.serviceName ?? "Other";
      serviceCounts[name] = (serviceCounts[name] ?? 0) + s.count;
    });
  });
  const serviceDistribution = Object.entries(serviceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <PageWorkspace>
      <BranchHeader branch={branch} />
      <PageHeader
        title="Doctor Operations Overview"
        subtitle="Branch-wide summary and performance at a glance"
      />

      <DoctorAlertStrip alerts={alerts} />

      <div className="row g-3 mb-3">
        <div className="col-6 col-md-3">
          <Link href={doctors(branchId)} className="text-decoration-none">
            <StatCard
              label="Total Doctors"
              value={summaryLoading ? "—" : (summary?.totalDoctors ?? 0)}
              icon="ri:team-line"
              variant="primary"
              loading={summaryLoading}
            />
          </Link>
        </div>
        <div className="col-6 col-md-3">
          <StatCard
            label="Active"
            value={summaryLoading ? "—" : (summary?.activeDoctors ?? 0)}
            icon="ri:user-star-line"
            variant="success"
            loading={summaryLoading}
          />
        </div>
        <div className="col-6 col-md-3">
          <StatCard
            label="On Duty Now"
            value={summaryLoading ? "—" : (summary?.onDutyToday ?? 0)}
            icon="ri:calendar-schedule-line"
            variant="info"
            loading={summaryLoading}
          />
        </div>
        <div className="col-6 col-md-3">
          <StatCard
            label="Appointments"
            value={performanceLoading ? "—" : appointmentsToday}
            icon="ri:calendar-check-line"
            variant="info"
            loading={performanceLoading}
          />
        </div>
        <div className="col-6 col-md-3">
          <StatCard
            label="Revenue Generated"
            value={performanceLoading ? "—" : formatCurrency(revenueToday)}
            icon="ri:bank-card-line"
            variant="success"
            loading={performanceLoading}
          />
        </div>
        <div className="col-6 col-md-3">
          <Link href={approvals(branchId)} className="text-decoration-none">
            <StatCard
              label="Pending Approvals"
              value={summaryLoading ? "—" : (summary?.pendingApprovals ?? 0)}
              icon="ri:checkbox-multiple-line"
              variant="warning"
              loading={summaryLoading}
              onClick={() => {}}
            />
          </Link>
        </div>
      </div>
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <Link href={availability(branchId)} className="text-decoration-none">
            <StatCard
              label="On Leave"
              value={summaryLoading ? "—" : (summary?.onLeave ?? 0)}
              icon="ri:calendar-event-line"
              variant="secondary"
              loading={summaryLoading}
            />
          </Link>
        </div>
        <div className="col-6 col-md-3">
          <Link href={credentials(branchId)} className="text-decoration-none">
            <StatCard
              label="Credential Expiring Soon"
              value={summaryLoading ? "—" : (summary?.credentialExpiringSoon ?? 0)}
              icon="ri:file-warning-line"
              variant="warning"
              loading={summaryLoading}
            />
          </Link>
        </div>
        <div className="col-6 col-md-3">
          <Link href={licenses(branchId)} className="text-decoration-none">
            <StatCard
              label="License Expiring Soon"
              value={summaryLoading ? "—" : (summary?.credentialExpiringSoon ?? 0)}
              icon="ri:passport-line"
              variant="secondary"
              loading={summaryLoading}
            />
          </Link>
        </div>
        <div className="col-6 col-md-3">
          <StatCard
            label="Unassigned"
            value={summaryLoading ? "—" : 0}
            icon="ri:user-unfollow-line"
            variant="secondary"
            loading={summaryLoading}
          />
        </div>
      </div>

      <SectionCard title="Quick actions" subtitle="Doctor Operations" className="mb-4">
        <div className="d-flex flex-wrap gap-2">
          <Link href={invite(branchId)} className="btn btn-outline-primary btn-sm radius-8">
            Invite doctor
          </Link>
          <Link href={assignExisting(branchId)} className="btn btn-outline-primary btn-sm radius-8">
            Add doctor
          </Link>
          <Link href={scheduleBoard(branchId)} className="btn btn-outline-primary btn-sm radius-8">
            Schedule Board
          </Link>
          <Link href={availability(branchId)} className="btn btn-outline-primary btn-sm radius-8">
            Availability
          </Link>
          <Link href={serviceAssignment(branchId)} className="btn btn-outline-primary btn-sm radius-8">
            Service assignment
          </Link>
          <Link href={credentials(branchId)} className="btn btn-outline-primary btn-sm radius-8">
            Credential review
          </Link>
          <Link href={approvals(branchId)} className="btn btn-outline-primary btn-sm radius-8">
            Pending approvals
          </Link>
          <Link href={performanceRoute(branchId)} className="btn btn-outline-primary btn-sm radius-8">
            Performance &amp; earnings
          </Link>
        </div>
      </SectionCard>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <SectionCard title="Pending queue" subtitle="Doctor-related approvals">
            <div className="d-flex align-items-center justify-content-between">
              <span className="fs-4 fw-semibold">{summaryLoading ? "—" : (summary?.pendingApprovals ?? 0)}</span>
              <Link href={approvals(branchId)} className="btn btn-sm btn-outline-primary radius-8">
                Open
              </Link>
            </div>
          </SectionCard>
        </div>
        <div className="col-md-4">
          <SectionCard title="Leave today" subtitle="Doctors on leave">
            <div className="d-flex align-items-center justify-content-between">
              <span className="fs-4 fw-semibold">{summaryLoading ? "—" : (summary?.onLeave ?? 0)}</span>
              <Link href={availability(branchId)} className="btn btn-sm btn-outline-primary radius-8">
                View
              </Link>
            </div>
          </SectionCard>
        </div>
        <div className="col-md-4">
          <SectionCard title="Credential alerts" subtitle="Expiring soon">
            <div className="d-flex align-items-center justify-content-between">
              <span className="fs-4 fw-semibold">{summaryLoading ? "—" : (summary?.credentialExpiringSoon ?? 0)}</span>
              <Link href={credentials(branchId)} className="btn btn-sm btn-outline-primary radius-8">
                Review
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-6 mb-4">
          <SectionCard
            title="Top Performing Doctors"
            subtitle="By revenue today"
            actions={
              <Link
                className="btn btn-sm btn-outline-primary"
                href={performanceRoute(branchId)}
              >
                View all
              </Link>
            }
          >
            {performanceLoading ? (
              <div className="text-muted small">Loading…</div>
            ) : topDoctors.length === 0 ? (
              <div className="text-muted small">No activity today.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Doctor</th>
                      <th className="text-end">Appointments</th>
                      <th className="text-end">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topDoctors.map((d) => (
                      <tr key={d.branchMemberId}>
                        <td>
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 text-start text-body text-decoration-none"
                            onClick={() => setDrawerMemberId(d.branchMemberId)}
                          >
                            {d.displayName}
                          </button>
                        </td>
                        <td className="text-end">{d.appointmentsCompleted}</td>
                        <td className="text-end">{formatCurrency(d.revenueContribution)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
        <div className="col-lg-6 mb-4">
          <SectionCard
            title="Service Distribution"
            subtitle="Today"
          >
            {performanceLoading ? (
              <div className="text-muted small">Loading…</div>
            ) : serviceDistribution.length === 0 ? (
              <div className="text-muted small">No services recorded today.</div>
            ) : (
              <ul className="list-group list-group-flush">
                {serviceDistribution.map(([name, count]) => (
                  <li
                    key={name}
                    className="list-group-item d-flex justify-content-between align-items-center px-0"
                  >
                    <span>{name}</span>
                    <span className="badge bg-primary rounded-pill">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      {!summaryLoading && (summary?.totalDoctors ?? 0) === 0 && (
        <SectionCard title="Branch doctors" subtitle="At a glance">
          <EmptyState
            title="No doctors assigned to this branch yet"
            description="Invite or assign doctors from the Doctors page to get started."
            icon="ri:user-star-line"
            action={<Link href={doctors(branchId)} className="btn btn-primary btn-sm radius-8">Go to Doctors</Link>}
          />
        </SectionCard>
      )}

      <Doctor360Drawer
        open={drawerMemberId != null}
        onClose={() => setDrawerMemberId(null)}
        branchId={branchId}
        memberId={drawerMemberId}
      />
    </PageWorkspace>
  );
}
