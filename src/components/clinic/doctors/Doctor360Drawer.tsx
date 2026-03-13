"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { staffDoctor360Summary } from "@/lib/api";
import DetailDrawer from "@/src/components/dashboard/DetailDrawer";
import { LoadingState } from "@/src/components/dashboard";
import { formatAuditDetails } from "@/src/lib/displayFormatters";
import {
  profile as profileRoute,
  availability,
  credentials as credentialsRoute,
  performance as performanceRoute,
  auditLogs as auditLogsRoute,
  serviceAssignment,
  scheduleBoard,
} from "@/src/lib/doctorOperationsRoutes";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Doctor360DrawerProps = {
  open: boolean;
  onClose: () => void;
  branchId: string;
  memberId: number | null | undefined;
};

/**
 * Doctor 360 drawer: contextual detail view from any doctor operations page.
 * Uses 360-summary API for profile, services, schedule, credentials, performance, recent audit.
 */
export default function Doctor360Drawer({
  open,
  onClose,
  branchId,
  memberId,
}: Doctor360DrawerProps) {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!branchId || memberId == null || !open) return;
    setLoading(true);
    try {
      const data = await staffDoctor360Summary(branchId, memberId);
      setSummary(data ?? null);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [branchId, memberId, open]);

  useEffect(() => {
    if (open && memberId != null) load();
    else setSummary(null);
  }, [open, memberId, load]);

  const profile = summary?.profile;
  const displayName = profile?.displayName ?? profile?.user?.profile?.displayName ?? (memberId != null ? `Doctor #${memberId}` : "—");
  const services = Array.isArray(summary?.services) ? summary.services : [];
  const scheduleTemplates = Array.isArray(summary?.schedule) ? summary.schedule : [];
  const credentials = summary?.credentials ?? {};
  const performance = summary?.performance;
  const recentAudit = Array.isArray(summary?.recentAudit) ? summary.recentAudit : [];

  const daysWithSchedule = new Set((scheduleTemplates as any[]).map((t: any) => Number(t.dayOfWeek)));
  const credentialStatus = credentials?.verificationStatus ?? credentials?.branchCredentials?.length
    ? (credentials.branchCredentials.some((c: any) => c.status === "REJECTED")
      ? "Issues"
      : credentials.branchCredentials.some((c: any) => c.status === "PENDING" || c.status === "UNDER_REVIEW")
        ? "Pending"
        : "OK")
    : "—";

  return (
    <DetailDrawer
      open={open && memberId != null}
      onClose={onClose}
      title={displayName}
      subtitle="Quick view"
      placement="end"
      width="400px"
    >
      {loading ? (
        <LoadingState message="Loading…" />
      ) : (
        <div className="small">
          {/* Profile summary */}
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted">Status</span>
              <span className={`badge ${profile?.status === "ACTIVE" ? "bg-success" : "bg-secondary"} radius-8`}>
                {profile?.status ?? "—"}
              </span>
            </div>
            {profile?.roleInClinic && (
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted">Role</span>
                <span>{profile.roleInClinic}</span>
              </div>
            )}
            {profile?.speciality && (
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted">Speciality</span>
                <span>{profile.speciality}</span>
              </div>
            )}
          </div>

          {/* Current services */}
          {services.length > 0 && (
            <>
              <h6 className="text-secondary border-bottom pb-1 mb-2">Current services</h6>
              <ul className="list-unstyled mb-3">
                {services.slice(0, 5).map((s: any) => (
                  <li key={s.id ?? s.name}>{s.name ?? `Service #${s.id}`}</li>
                ))}
                {services.length > 5 && <li className="text-muted">+{services.length - 5} more</li>}
              </ul>
            </>
          )}

          {/* Weekly availability */}
          {scheduleTemplates.length > 0 && (
            <>
              <h6 className="text-secondary border-bottom pb-1 mb-2">Weekly availability</h6>
              <div className="d-flex flex-wrap gap-1 mb-3">
                {DAYS.map((label, dayOfWeek) => (
                  <span
                    key={dayOfWeek}
                    className={`badge ${daysWithSchedule.has(dayOfWeek) ? "bg-primary" : "bg-light text-muted"} radius-8`}
                    title={label}
                  >
                    {label.slice(0, 1)}
                  </span>
                ))}
              </div>
            </>
          )}

          {/* Credential status */}
          <div className="mb-3">
            <h6 className="text-secondary border-bottom pb-1 mb-2">Credential status</h6>
            <span className={`badge ${credentialStatus === "OK" ? "bg-success" : credentialStatus === "Pending" ? "bg-warning" : "bg-danger"} radius-8`}>
              {credentialStatus}
            </span>
          </div>

          {/* Performance snapshot */}
          {performance != null && (
            <>
              <h6 className="text-secondary border-bottom pb-1 mb-2">Performance (7d)</h6>
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted">Completed</span>
                <span>{performance.appointmentsCompleted ?? performance.visitsCompleted ?? "—"}</span>
              </div>
              {performance.revenueContribution != null && (
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Revenue</span>
                  <span>৳{Number(performance.revenueContribution).toLocaleString("en-BD", { maximumFractionDigits: 0 })}</span>
                </div>
              )}
            </>
          )}

          {/* Recent audit */}
          {recentAudit.length > 0 && (
            <>
              <h6 className="text-secondary border-bottom pb-1 mb-2">Recent audit</h6>
              <ul className="list-unstyled mb-3">
                {recentAudit.slice(0, 3).map((entry: any, i: number) => {
                  const details = formatAuditDetails({
                    action: entry.action,
                    field: entry.field,
                    oldValue: entry.oldValue,
                    newValue: entry.newValue,
                  });
                  return (
                    <li key={entry.id ?? i} className="mb-1">
                      <span className="text-muted small">
                        {details.length > 0 ? details.join(" · ") : entry.action ?? "—"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {/* Quick actions */}
          <h6 className="text-secondary border-bottom pb-1 mb-2">Quick actions</h6>
          <ul className="list-unstyled mb-0">
            <li className="mb-1">
              <Link href={profileRoute(branchId, memberId!)} className="text-body" onClick={onClose}>
                Full profile
              </Link>
            </li>
            <li className="mb-1">
              <Link href={scheduleBoard(branchId)} className="text-body" onClick={onClose}>
                Schedule board
              </Link>
            </li>
            <li className="mb-1">
              <Link href={serviceAssignment(branchId)} className="text-body" onClick={onClose}>
                Assign services
              </Link>
            </li>
            <li className="mb-1">
              <Link href={availability(branchId, memberId ?? undefined)} className="text-body" onClick={onClose}>
                Edit schedule
              </Link>
            </li>
            <li className="mb-1">
              <Link href={credentialsRoute(branchId, memberId ?? undefined)} className="text-body" onClick={onClose}>
                Review credentials
              </Link>
            </li>
            <li className="mb-1">
              <Link href={performanceRoute(branchId, memberId ?? undefined)} className="text-body" onClick={onClose}>
                Performance &amp; earnings
              </Link>
            </li>
            <li>
              <Link href={auditLogsRoute(branchId, memberId ?? undefined)} className="text-body" onClick={onClose}>
                Audit log
              </Link>
            </li>
          </ul>
        </div>
      )}
    </DetailDrawer>
  );
}
