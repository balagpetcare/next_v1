"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  doctorGetMe,
  doctorListAppointments,
  doctorGetAppointmentStats,
  doctorCallAppointment,
  doctorStartConsult,
  doctorCompleteAppointment,
  doctorConfirmAppointment,
  doctorCancelAppointment,
  doctorRescheduleAppointment,
} from "@/lib/api";
import { useDoctorSocket } from "@/lib/useDoctorSocket";
import { DoctorAppointmentFilterBar } from "./_components/DoctorAppointmentFilterBar";
import { DoctorKpiSummaryCards } from "./_components/DoctorKpiSummaryCards";
import { DoctorAppointmentTable } from "./_components/DoctorAppointmentTable";
import { DoctorAppointmentCard } from "./_components/DoctorAppointmentCard";
import {
  DEFAULT_FILTER_STATE,
  type DoctorAppointmentFilterState,
} from "./_lib/filterState";
import { getDateWindowRange } from "./_lib/dateWindow";

export default function DoctorAppointmentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams?.get("tab");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [branches, setBranches] = useState<{ branchId: number; branchName: string }[]>([]);
  const [filter, setFilter] = useState<DoctorAppointmentFilterState>({
    ...DEFAULT_FILTER_STATE,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [stats, setStats] = useState<{
    total: number;
    statusCounts: Record<string, number>;
    emergencyCount: number;
    followUpCount: number;
    paymentPendingCount?: number;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const goToAppointmentDetail = useCallback((id: number) => {
    router.push(`/doctor/appointments/${id}`);
  }, [router]);

  useEffect(() => {
    doctorGetMe().then((me) => setBranches(me.branches ?? [])).catch(() => setBranches([]));
  }, []);

  const range = getDateWindowRange(filter.dateWindow);
  const effectiveDate = range.date;
  const effectiveFrom = filter.fromDate ?? range.fromDate;
  const effectiveTo = filter.toDate ?? range.toDate;
  const effectiveStatuses = filter.statuses ?? range.statuses;

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const params: { date?: string; fromDate?: string; toDate?: string; branchId?: number } = {
        branchId: filter.branchId ? Number(filter.branchId) : undefined,
      };
      if (effectiveFrom != null && effectiveTo != null) {
        params.fromDate = effectiveFrom;
        params.toDate = effectiveTo;
      } else if (effectiveDate != null) {
        params.date = effectiveDate;
      } else {
        params.date = new Date().toISOString().slice(0, 10);
      }
      const data = await doctorGetAppointmentStats(params);
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [filter.branchId, effectiveDate, effectiveFrom, effectiveTo]);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const listParams: Parameters<typeof doctorListAppointments>[0] = {
        branchId: filter.branchId ? Number(filter.branchId) : undefined,
        statuses: effectiveStatuses ?? undefined,
        search: filter.search.trim() || undefined,
        visitType: filter.visitType ?? undefined,
        appointmentType: filter.appointmentType ?? undefined,
        priority: filter.priority ?? undefined,
        limit: filter.limit,
        offset: filter.offset,
      };
      if (effectiveFrom != null && effectiveTo != null) {
        listParams.fromDate = effectiveFrom;
        listParams.toDate = effectiveTo;
      } else if (effectiveDate != null) {
        listParams.date = effectiveDate;
      } else {
        const today = new Date().toISOString().slice(0, 10);
        listParams.fromDate = today;
        const to = new Date();
        to.setUTCDate(to.getUTCDate() + 30);
        listParams.toDate = to.toISOString().slice(0, 10);
      }
      const res = await doctorListAppointments(listParams);
      let list = res.appointments ?? [];
      list = [...list].sort((a: any, b: any) => {
        const aEmer = a?.priority === "EMERGENCY" ? 1 : 0;
        const bEmer = b?.priority === "EMERGENCY" ? 1 : 0;
        if (bEmer !== aEmer) return bEmer - aEmer;
        const at = a?.scheduledStartAt ? new Date(a.scheduledStartAt).getTime() : 0;
        const bt = b?.scheduledStartAt ? new Date(b.scheduledStartAt).getTime() : 0;
        return at - bt;
      });
      setAppointments(list);
      setTotal(res.total ?? 0);
    } catch (e) {
      setError((e as Error)?.message || "Failed to load appointments");
      setAppointments([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    filter.branchId,
    filter.search,
    filter.visitType,
    filter.appointmentType,
    filter.priority,
    filter.limit,
    filter.offset,
    effectiveDate,
    effectiveFrom,
    effectiveTo,
    effectiveStatuses,
  ]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (tabParam === "follow_up") {
      setFilter((f) => ({ ...f, dateWindow: "today", statuses: "COMPLETED", offset: 0 }));
    }
  }, [tabParam]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 5000);
    return () => clearTimeout(t);
  }, [error]);

  const refresh = useCallback(() => {
    loadAppointments();
    loadStats();
  }, [loadAppointments, loadStats]);

  const { status: syncStatus } = useDoctorSocket({
    enabled: true,
    onQueueUpdate: () => {
      toast.info("Queue updated", { autoClose: 2000 });
      refresh();
    },
    onAppointmentUpdate: () => {
      toast.info("Appointments updated", { autoClose: 2000 });
      refresh();
    },
  });

  const handleFilterChange = useCallback((patch: Partial<DoctorAppointmentFilterState>) => {
    setFilter((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleCall = async (id: number) => {
    setActioningId(id);
    setError("");
    try {
      await doctorCallAppointment(id);
      await refresh();
    } catch (e) {
      setError((e as Error)?.message || "Failed to call");
    } finally {
      setActioningId(null);
    }
  };

  const handleStartConsult = async (id: number) => {
    setActioningId(id);
    setError("");
    try {
      await doctorStartConsult(id);
      await refresh();
    } catch (e) {
      setError((e as Error)?.message || "Failed to start consultation");
    } finally {
      setActioningId(null);
    }
  };

  const handleComplete = async (id: number) => {
    setActioningId(id);
    setError("");
    try {
      await doctorCompleteAppointment(id);
      await refresh();
    } catch (e) {
      setError((e as Error)?.message || "Failed to complete");
    } finally {
      setActioningId(null);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (e.key === "/") {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('[aria-label="Search"]')?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCancel = async (id: number, reason: string) => {
    setActioningId(id);
    setError("");
    try {
      await doctorCancelAppointment(id, reason);
      await refresh();
    } catch (e) {
      setError((e as Error)?.message || "Cancel failed");
    } finally {
      setActioningId(null);
    }
  };

  const handleConfirm = async (id: number) => {
    setActioningId(id);
    setError("");
    try {
      await doctorConfirmAppointment(id);
      await refresh();
    } catch (e) {
      setError((e as Error)?.message || "Confirm failed");
    } finally {
      setActioningId(null);
    }
  };

  const handleReschedule = async (id: number, data: { scheduledStartAt: string; scheduledEndAt: string }) => {
    setActioningId(id);
    setError("");
    try {
      await doctorRescheduleAppointment(id, data);
      await refresh();
    } catch (e) {
      setError((e as Error)?.message || "Reschedule failed");
    } finally {
      setActioningId(null);
    }
  };

  const currentDateForTable = effectiveDate ?? effectiveFrom ?? new Date().toISOString().slice(0, 10);

  return (
    <div className="dashboard-main-body">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <h5 className="mb-0 fw-semibold">Appointments</h5>
          <p className="small text-muted mb-0 mt-1">Manage your daily schedule and consultations</p>
        </div>
      </div>

      <DoctorAppointmentFilterBar
        filter={filter}
        onFilterChange={handleFilterChange}
        branches={branches}
        total={total}
        loading={loading}
        syncStatus={syncStatus}
        onRefresh={refresh}
      />

      <DoctorKpiSummaryCards
        stats={stats}
        loading={statsLoading}
        inViewCount={appointments.length}
        onFilter={(tab) => {
          const map: Record<string, Partial<DoctorAppointmentFilterState>> = {
            all: { dateWindow: "today", statuses: undefined, priority: undefined, appointmentType: undefined },
            waiting: { dateWindow: "today", statuses: "CHECKED_IN,IN_QUEUE,CALLED", priority: undefined, appointmentType: undefined },
            upcoming: { dateWindow: "upcoming" },
            in_consult: { dateWindow: "today", statuses: "IN_CONSULT" },
            completed: { dateWindow: "completed" },
            follow_up: { dateWindow: "today", statuses: "COMPLETED" },
            emergency: { dateWindow: "today", statuses: undefined, priority: "EMERGENCY", appointmentType: undefined },
            package: { dateWindow: "today", statuses: undefined, priority: undefined, appointmentType: "PACKAGE" },
            pending: { dateWindow: "today", statuses: "BOOKED" },
          };
          const next = map[tab];
          if (next) handleFilterChange({ ...next, offset: 0 });
        }}
      />

      {error && (
        <div className="alert alert-danger radius-12 alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError("")} aria-label="Close" />
        </div>
      )}

      <div className="card radius-12 shadow-sm">
        <div className="card-body p-0 p-md-3">
          {loading && (
            <div className="p-4">
              <div className="placeholder-glow">
                <span className="placeholder col-12 d-block" style={{ height: 24 }} />
                <span className="placeholder col-12 d-block mt-2" style={{ height: 24 }} />
                <span className="placeholder col-12 d-block mt-2" style={{ height: 24 }} />
              </div>
            </div>
          )}
          {!loading && appointments.length === 0 && (
            <div className="p-4 text-center text-muted">
              <p className="mb-2">No appointments for the selected filters.</p>
              <p className="small mb-3">Try another date range or clear filters to see more.</p>
              <div className="d-flex flex-wrap justify-content-center gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => handleFilterChange({ dateWindow: "upcoming", offset: 0 })}
                >
                  View Upcoming
                </button>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={refresh}>
                  Refresh
                </button>
              </div>
            </div>
          )}
          {!loading && appointments.length > 0 && (
            <>
              <div className="d-none d-md-block">
                <DoctorAppointmentTable
                  appointments={appointments}
                  selectedId={null}
                  onSelect={goToAppointmentDetail}
                  onCall={handleCall}
                  onStartConsult={handleStartConsult}
                  onComplete={handleComplete}
                  onReschedule={handleReschedule}
                  onCancel={handleCancel}
                  actioningId={actioningId}
                  date={currentDateForTable}
                  total={total}
                  limit={filter.limit}
                  offset={filter.offset}
                  onPaginate={(offset) => handleFilterChange({ offset })}
                />
              </div>
              <div className="d-md-none">
                {appointments.map((apt) => (
                  <DoctorAppointmentCard
                    key={apt.id}
                    appointment={apt}
                    onSelect={() => goToAppointmentDetail(apt.id)}
                    onCall={() => handleCall(apt.id)}
                    onStartConsult={() => handleStartConsult(apt.id)}
                    onComplete={() => handleComplete(apt.id)}
                    actioning={actioningId === apt.id}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
