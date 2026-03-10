"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import {
  doctorGetMe,
  doctorListAppointments,
  doctorGetAppointmentStats,
  doctorGetAppointmentDetail,
  doctorCallAppointment,
  doctorStartConsult,
  doctorCompleteAppointment,
  doctorCancelAppointment,
  doctorRescheduleAppointment,
  doctorAddNote,
  doctorCreateFollowUp,
} from "@/lib/api";
import { useDoctorSocket } from "@/lib/useDoctorSocket";
import { DoctorAppointmentHeader } from "./_components/DoctorAppointmentHeader";
import { DoctorKpiSummaryCards, type TabId } from "./_components/DoctorKpiSummaryCards";
import { DoctorQueueSidebar } from "./_components/DoctorQueueSidebar";
import { DoctorAppointmentTable } from "./_components/DoctorAppointmentTable";
import { DoctorAppointmentCard } from "./_components/DoctorAppointmentCard";
import { DoctorAppointmentDrawer } from "./_components/DoctorAppointmentDrawer";

const TODAY = new Date().toISOString().slice(0, 10);

const TABS: { id: TabId; label: string; statuses?: string; priority?: string }[] = [
  { id: "waiting", label: "Waiting Now", statuses: "CHECKED_IN,IN_QUEUE,CALLED" },
  { id: "upcoming", label: "Upcoming", statuses: "BOOKED,CONFIRMED" },
  { id: "in_consult", label: "In Consultation", statuses: "IN_CONSULT" },
  { id: "completed", label: "Completed", statuses: "COMPLETED" },
  { id: "follow_up", label: "Follow-up" },
  { id: "emergency", label: "Emergency", priority: "EMERGENCY" },
  { id: "all", label: "All" },
];

export default function DoctorAppointmentsPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get("tab");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [branches, setBranches] = useState<{ branchId: number; branchName: string }[]>([]);
  const [date, setDate] = useState(TODAY);
  const [branchId, setBranchId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabId>(tabParam === "follow_up" ? "follow_up" : "all");
  const [search, setSearch] = useState("");
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
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detailAppointment, setDetailAppointment] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    doctorGetMe().then((me) => setBranches(me.branches ?? [])).catch(() => setBranches([]));
  }, []);

  useEffect(() => {
    if (tabParam === "follow_up") setActiveTab("follow_up");
  }, [tabParam]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await doctorGetAppointmentStats({ date, branchId: branchId ? Number(branchId) : undefined });
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [date, branchId]);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const tab = TABS.find((t) => t.id === activeTab);
      let statuses = tab?.statuses;
      const priority = tab?.priority;
      if (activeTab === "follow_up") statuses = "COMPLETED";
      const res = await doctorListAppointments({
        date,
        branchId: branchId ? Number(branchId) : undefined,
        statuses: statuses || undefined,
        priority: priority || undefined,
        search: search.trim() || undefined,
        limit: 100,
      });
      let list = res.appointments ?? [];
      if (activeTab === "follow_up") {
        list = list.filter((apt: any) => apt.visit?.followUpDate != null);
      }
      // Emergency lane: sort so emergency appointments float to top
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
  }, [date, branchId, activeTab, search]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 5000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    if (detailId) {
      setDetailLoading(true);
      doctorGetAppointmentDetail(detailId)
        .then(setDetailAppointment)
        .catch(() => setDetailAppointment(null))
        .finally(() => setDetailLoading(false));
    } else {
      setDetailAppointment(null);
    }
  }, [detailId]);

  const refresh = useCallback(() => {
    loadAppointments();
    loadStats();
    if (detailId) {
      doctorGetAppointmentDetail(detailId).then(setDetailAppointment).catch(() => setDetailAppointment(null));
    }
  }, [loadAppointments, loadStats, detailId]);

  const { status: syncStatus } = useDoctorSocket({
    enabled: true,
    onQueueUpdate: () => {
      toast.info("Queue updated", { autoClose: 2000 });
      refresh();
    },
  });

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

  // Keyboard shortcuts (must be after handleStartConsult, handleComplete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      const key = e.key.toLowerCase();
      if (key === "/") {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('[aria-label="Search"]')?.focus();
        return;
      }
      if (key === "enter" && detailId) {
        return;
      }
      if (key === "s" && detailId && detailAppointment?.status === "CALLED") {
        e.preventDefault();
        handleStartConsult(detailId);
        return;
      }
      if (key === "h" && detailId) {
        e.preventDefault();
        document.querySelector(".offcanvas-body")?.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (key === "f" && detailId) {
        e.preventDefault();
        const followUpSection = document.querySelector('[placeholder="Reason: medication review, wound check, test report..."]');
        (followUpSection as HTMLInputElement)?.focus?.();
        return;
      }
      if (key === "c" && detailId && detailAppointment?.status === "IN_CONSULT") {
        e.preventDefault();
        handleComplete(detailId);
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [detailId, detailAppointment?.status, handleStartConsult, handleComplete]);

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

  const handleAddNote = async (id: number, body: { noteType?: string; contentJson?: Record<string, unknown> }) => {
    try {
      await doctorAddNote(id, body);
    } catch (e) {
      setError((e as Error)?.message || "Failed to add note");
    }
  };

  const handleFollowUp = async (
    id: number,
    body: { followUpDate: string; followUpNotes?: string; createAppointment?: boolean }
  ) => {
    setActioningId(id);
    try {
      await doctorCreateFollowUp(id, body);
      await refresh();
    } catch (e) {
      setError((e as Error)?.message || "Failed to set follow-up");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="dashboard-main-body">
      <DoctorAppointmentHeader
        date={date}
        onDateChange={setDate}
        branchId={branchId}
        onBranchIdChange={setBranchId}
        branches={branches}
        search={search}
        onSearchChange={setSearch}
        onRefresh={refresh}
        syncStatus={syncStatus}
      />

      <DoctorKpiSummaryCards stats={stats} loading={statsLoading} onFilter={setActiveTab} />

      {/* Mobile: horizontal tabs */}
      <div className="d-flex flex-wrap gap-1 mb-2 d-lg-none">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn btn-sm ${activeTab === t.id ? "btn-primary" : "btn-outline-secondary"}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="alert alert-danger radius-12 alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError("")} aria-label="Close" />
        </div>
      )}

      <div className="row g-3">
        {/* Left: Queue sidebar (desktop) */}
        <div className="col-lg-2 d-none d-lg-block">
          <DoctorQueueSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            stats={stats}
          />
        </div>

        {/* Center: Appointment list */}
        <div className="col-lg-7">
          <div className="card radius-12 shadow-sm">
            <div className="card-body p-0 p-md-3">
              {loading && <p className="text-muted mb-0 p-3">Loading...</p>}
              {!loading && appointments.length === 0 && (
                <div className="p-4 text-center text-muted">
                  <p className="mb-2">No appointments for this date and filters.</p>
                  <p className="small mb-3">You're all clear for now. Check upcoming visits or switch clinic/date.</p>
                  <div className="d-flex flex-wrap justify-content-center gap-2">
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setActiveTab("upcoming")}>
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
                      selectedId={detailId}
                      onSelect={setDetailId}
                      onCall={handleCall}
                      onStartConsult={handleStartConsult}
                      onComplete={handleComplete}
                      onReschedule={handleReschedule}
                      onCancel={handleCancel}
                      actioningId={actioningId}
                      date={date}
                    />
                  </div>
                  <div className="d-md-none">
                    {appointments.map((apt) => (
                      <DoctorAppointmentCard
                        key={apt.id}
                        appointment={apt}
                        onSelect={() => setDetailId(apt.id)}
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

        {/* Right: Snapshot placeholder (desktop) — selected summary when drawer open */}
        <div className="col-lg-3 d-none d-lg-block">
          {detailId && detailAppointment && (
            <div className="card radius-12 shadow-sm">
              <div className="card-header py-2">
                <h6 className="mb-0 small">Selected</h6>
              </div>
              <div className="card-body small">
                <strong>{detailAppointment?.pet?.name ?? detailAppointment?.petNameSnapshot ?? "—"}</strong>
                <span className="d-block text-muted">
                  {detailAppointment?.patient?.profile?.displayName ?? detailAppointment?.ownerNameSnapshot ?? "—"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <DoctorAppointmentDrawer
        show={detailId != null}
        onClose={() => setDetailId(null)}
        appointmentId={detailId}
        appointment={detailAppointment}
        loading={detailLoading}
        onRefresh={refresh}
        onCall={handleCall}
        onStartConsult={handleStartConsult}
        onComplete={handleComplete}
        onCancel={handleCancel}
        onReschedule={handleReschedule}
        onAddNote={handleAddNote}
        onFollowUp={handleFollowUp}
        actioningId={actioningId}
      />
    </div>
  );
}
