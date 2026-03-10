"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  doctorGetMe,
  doctorGetDashboardSummary,
  doctorListFollowUps,
  doctorListCases,
  doctorListPrescriptions,
  doctorGetMySettlementSummary,
  doctorListNotifications,
  doctorGetNotificationUnreadCount,
  doctorMarkNotificationRead,
  doctorGetReminders,
  doctorGetMyMetrics,
  doctorGetUpcomingLeaves,
} from "@/lib/api";
import { useDoctorSocket } from "@/lib/useDoctorSocket";
import { DoctorGreetingStrip } from "./_components/DoctorGreetingStrip";
import { DoctorKpiCards } from "./_components/DoctorKpiCards";
import { DoctorScheduleWidget } from "./_components/DoctorScheduleWidget";
import { DoctorQueueWidget } from "./_components/DoctorQueueWidget";
import { ActivePatientWidget } from "./_components/ActivePatientWidget";
import { QuickActionsPanel } from "./_components/QuickActionsPanel";
import { FollowUpWidget } from "./_components/FollowUpWidget";
import { SurgeryWidget } from "./_components/SurgeryWidget";
import { PrescriptionDraftWidget } from "./_components/PrescriptionDraftWidget";
import { EarningsWidget } from "./_components/EarningsWidget";
import { NotificationBell } from "./_components/NotificationBell";
import { RemindersWidget } from "./_components/RemindersWidget";
import { PerformanceChart } from "./_components/PerformanceChart";

export default function DoctorDashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [summary, setSummary] = useState<any>(null);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [settlementSummary, setSettlementSummary] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [reminders, setReminders] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [upcomingLeaves, setUpcomingLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const metricsFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  }, []);
  const metricsTo = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const branchIdNum = selectedBranchId ? Number(selectedBranchId) : undefined;

  const loadSummary = useCallback(async () => {
    const data = await doctorGetDashboardSummary({
      branchId: branchIdNum,
      date: new Date().toISOString().slice(0, 10),
    });
    setSummary(data ?? null);
  }, [branchIdNum]);

  const loadWidgets = useCallback(async () => {
    const [
      fu,
      cs,
      pr,
      nt,
      unread,
      rem,
      leaves,
      metricData,
      settle,
    ] = await Promise.all([
      doctorListFollowUps({ branchId: branchIdNum, status: "due", limit: 10 }),
      doctorListCases({ branchId: branchIdNum, limit: 10 }),
      doctorListPrescriptions({ branchId: branchIdNum, status: "DRAFT", limit: 10 }),
      doctorListNotifications({ limit: 10 }),
      doctorGetNotificationUnreadCount(),
      doctorGetReminders({ branchId: branchIdNum }),
      doctorGetUpcomingLeaves({ branchId: branchIdNum }),
      branchIdNum ? doctorGetMyMetrics(branchIdNum, { from: metricsFrom, to: metricsTo }) : Promise.resolve(null),
      branchIdNum ? doctorGetMySettlementSummary(branchIdNum) : Promise.resolve(null),
    ]);

    setFollowUps(fu?.items ?? []);
    setCases(cs?.items ?? []);
    setPrescriptions(pr?.items ?? []);
    setNotifications(nt?.items ?? []);
    setUnreadCount(unread ?? 0);
    setReminders(rem ?? null);
    setUpcomingLeaves(leaves ?? []);
    setMetrics(metricData ?? null);
    setSettlementSummary(settle ?? null);
  }, [branchIdNum, metricsFrom, metricsTo]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await Promise.all([loadSummary(), loadWidgets()]);
    } catch (e) {
      setError((e as Error)?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [loadSummary, loadWidgets]);

  useEffect(() => {
    (async () => {
      try {
        const me = await doctorGetMe();
        setProfile(me ?? null);
        if ((me?.branches ?? []).length > 0) {
          setSelectedBranchId(String(me.branches[0].branchId));
        }
      } catch (e) {
        setError((e as Error)?.message || "Failed to load profile");
      }
    })();
  }, []);

  useEffect(() => {
    if (!profile) return;
    refreshAll();
  }, [profile, selectedBranchId, refreshAll]);

  const { status: syncStatus } = useDoctorSocket({
    enabled: true,
    onQueueUpdate: () => {
      loadSummary().catch(() => {});
    },
    onNotification: () => {
      loadWidgets().catch(() => {});
    },
    onAppointmentUpdate: () => {
      loadSummary().catch(() => {});
    },
    onLabReady: () => {
      loadWidgets().catch(() => {});
    },
  });

  return (
    <div className="dashboard-main-body">
      {error ? (
        <div className="alert alert-danger radius-12 mb-3" role="alert">
          {error}
        </div>
      ) : null}

      <div className="d-flex align-items-start justify-content-between gap-2">
        <div className="flex-grow-1">
          <DoctorGreetingStrip
            doctorName={profile?.displayName ?? null}
            currentDate={summary?.currentDate}
            activeBranchName={summary?.activeBranch?.name ?? null}
            selectedBranchId={selectedBranchId}
            branches={profile?.branches ?? []}
            onBranchChange={setSelectedBranchId}
            syncStatus={syncStatus}
            unreadCount={unreadCount}
          />
        </div>
        <NotificationBell
          unreadCount={unreadCount}
          items={notifications}
          onMarkRead={async (id) => {
            await doctorMarkNotificationRead(id);
            const [nt, unread] = await Promise.all([
              doctorListNotifications({ limit: 10 }),
              doctorGetNotificationUnreadCount(),
            ]);
            setNotifications(nt.items);
            setUnreadCount(unread);
          }}
        />
      </div>

      <DoctorKpiCards kpis={summary?.kpis} loading={loading} />

      <div className="row g-3 mb-3">
        <div className="col-lg-7">
          <DoctorScheduleWidget
            schedule={summary?.todaySchedule ?? []}
            currentShift={summary?.currentShift ?? null}
            upcomingLeaves={upcomingLeaves}
          />
        </div>
        <div className="col-lg-5">
          <DoctorQueueWidget queue={summary?.liveQueue ?? []} />
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-5">
          <ActivePatientWidget patient={summary?.activePatient ?? null} />
        </div>
        <div className="col-lg-7">
          <QuickActionsPanel />
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-6">
          <FollowUpWidget items={followUps} />
        </div>
        <div className="col-lg-6">
          <SurgeryWidget items={cases} />
        </div>
      </div>

      <div className="mb-3">
        <PrescriptionDraftWidget items={prescriptions} />
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-6">
          <EarningsWidget
            todayEarnings={Number(summary?.kpis?.todayEarnings ?? 0)}
            settlement={settlementSummary}
          />
        </div>
        <div className="col-lg-6">
          <RemindersWidget reminders={reminders} />
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-6">
          <PerformanceChart metrics={metrics} />
        </div>
        <div className="col-lg-6">
          <div className="card radius-12 h-100">
            <div className="card-header">
              <h6 className="mb-0">My Clinics</h6>
            </div>
            <div className="card-body">
              <div className="row g-2">
                {(summary?.branches ?? []).map((b: any) => (
                  <div key={b.id} className="col-12">
                    <div className="border rounded-3 p-2 d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-semibold">{b.name}</div>
                        <div className="small text-muted">
                          Appointments: {b.todayAppointments} • Waiting: {b.waitingCount}
                        </div>
                      </div>
                      <span className={`badge ${b.onboardingStatus === "COMPLETED" ? "bg-success" : "bg-warning text-dark"}`}>
                        {b.onboardingStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
