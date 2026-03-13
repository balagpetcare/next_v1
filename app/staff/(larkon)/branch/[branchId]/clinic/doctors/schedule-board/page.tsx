"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doctors } from "@/src/lib/doctorOperationsRoutes";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffDoctorsScheduleBoard } from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace, PageHeader, LoadingState, SectionCard, EmptyState } from "@/src/components/dashboard";
import { Doctor360Drawer } from "@/src/components/clinic/doctors";

const DOCTORS_PERMS = ["clinic.doctors.view", "clinic.schedule.manage"];

type ViewMode = "day" | "week" | "month";

const DOCTOR_COLORS = ["primary", "success", "info", "warning", "secondary", "danger"];

function parseTime(s: string): number {
  if (!s) return 0;
  const [h, m] = s.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function templatesOverlap(a: { dayOfWeek: number; startTime?: string; endTime?: string }, b: { dayOfWeek: number; startTime?: string; endTime?: string }): boolean {
  if (a.dayOfWeek !== b.dayOfWeek) return false;
  const aS = parseTime(a.startTime ?? "0:00");
  const aE = parseTime(a.endTime ?? "23:59");
  const bS = parseTime(b.startTime ?? "0:00");
  const bE = parseTime(b.endTime ?? "23:59");
  return aS < bE && bS < aE;
}

export default function StaffClinicDoctorsScheduleBoardPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);

  const [data, setData] = useState<{ doctors: any[]; templates: any[]; exceptions: any[]; appointments?: any[] }>({ doctors: [], templates: [], exceptions: [], appointments: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [drawerMemberId, setDrawerMemberId] = useState<number | null>(null);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = DOCTORS_PERMS.some((p) => permissions.includes(p));

  const load = useCallback(async () => {
    if (!branchId || !hasAccess) return;
    setLoading(true);
    setError("");
    try {
      const res = await staffDoctorsScheduleBoard(branchId, { from: from || undefined, to: to || undefined });
      setData(res ?? { doctors: [], templates: [], exceptions: [], appointments: [] });
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load schedule board");
      setData({ doctors: [], templates: [], exceptions: [], appointments: [] });
    } finally {
      setLoading(false);
    }
  }, [branchId, hasAccess, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const doctorColorIndex = useMemo(() => {
    const m: Record<number, number> = {};
    (data.doctors ?? []).forEach((d: any, i: number) => {
      m[d.memberId ?? d.branchMemberId] = i % DOCTOR_COLORS.length;
    });
    return m;
  }, [data.doctors]);

  const conflictDoctorIds = useMemo(() => {
    const byDoctor: Record<number, any[]> = {};
    (data.templates ?? []).forEach((t: any) => {
      const id = t.branchMemberId;
      if (!byDoctor[id]) byDoctor[id] = [];
      byDoctor[id].push(t);
    });
    const conflict: number[] = [];
    Object.entries(byDoctor).forEach(([memberId, templates]) => {
      for (let i = 0; i < templates.length; i++) {
        for (let j = i + 1; j < templates.length; j++) {
          if (templatesOverlap(templates[i], templates[j])) {
            conflict.push(Number(memberId));
            break;
          }
        }
      }
    });
    return conflict;
  }, [data.templates]);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (ctxLoading) {
    return (
      <PageWorkspace>
        <LoadingState message="Loading..." />
      </PageWorkspace>
    );
  }

  if (!branch) {
    return (
      <PageWorkspace>
        <LoadingState message="Loading branch…" />
      </PageWorkspace>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        missingPerm="clinic.doctors.view"
        onBack={() => router.push(doctors(branchId))}
      />
    );
  }

  return (
    <PageWorkspace>
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <PageHeader title="Schedule Board" subtitle="Doctor shifts and appointments" />
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <Link href={doctors(branchId)} className="btn btn-outline-secondary btn-sm radius-8">← Doctors</Link>
        <div className="btn-group btn-group-sm" role="group">
          {(["day", "week", "month"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`btn ${viewMode === mode ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => setViewMode(mode)}
            >
              {mode === "day" ? "Day" : mode === "week" ? "Week" : "Month"}
            </button>
          ))}
        </div>
        {viewMode === "day" && (
          <label className="d-flex align-items-center gap-2 mb-0">
            <span className="small text-muted">Date</span>
            <input type="date" className="form-control form-control-sm" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </label>
        )}
        <div className="row g-2 align-items-center ms-auto">
          <div className="col-auto"><label className="form-label mb-0 me-2 small">From</label><input type="date" className="form-control form-control-sm" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="col-auto"><label className="form-label mb-0 me-2 small">To</label><input type="date" className="form-control form-control-sm" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </div>
      </div>

      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}
      {conflictDoctorIds.length > 0 && (
        <div className="alert alert-warning radius-12 mb-3">
          <strong>Conflict:</strong> Overlapping shifts detected for:{" "}
          {conflictDoctorIds.map((id) => data.doctors?.find((d: any) => (d.memberId ?? d.branchMemberId) === id)?.displayName ?? id).join(", ")}
        </div>
      )}

      {loading ? (
        <SectionCard><div className="text-center py-5"><div className="spinner-border text-primary" role="status" /><p className="text-muted mt-2 mb-0">Loading...</p></div></SectionCard>
      ) : (
        <>
          <SectionCard title={viewMode === "week" ? "Weekly availability (templates)" : viewMode === "day" ? `Schedule for ${selectedDate}` : "Monthly overview"}>
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr><th>Doctor</th><th>Day</th><th>Start</th><th>End</th><th>Slots (min)</th>{conflictDoctorIds.length > 0 ? <th>Status</th> : null}</tr>
                </thead>
                <tbody>
                  {(viewMode === "day"
                    ? (data.templates ?? []).filter((t: any) => new Date(selectedDate).getDay() === t.dayOfWeek)
                    : data.templates ?? []
                  ).map((t: any, i: number) => {
                    const memberId = t.branchMemberId;
                    const colorIdx = doctorColorIndex[memberId] ?? 0;
                    const hasConflict = conflictDoctorIds.includes(memberId);
                    return (
                      <tr key={i} className={viewMode !== "month" ? `table-${DOCTOR_COLORS[colorIdx]}-subtle` : ""}>
                        <td>
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 text-start text-body text-decoration-none fw-medium"
                            onClick={() => setDrawerMemberId(memberId)}
                          >
                            {data.doctors?.find((d: any) => (d.memberId ?? d.branchMemberId) === memberId)?.displayName ?? memberId}
                          </button>
                        </td>
                        <td>{dayNames[t.dayOfWeek] ?? t.dayOfWeek}</td>
                        <td>{t.startTime}</td>
                        <td>{t.endTime}</td>
                        <td>{t.slotMinutes ?? "—"}</td>
                        {conflictDoctorIds.length > 0 && <td>{hasConflict ? <span className="badge bg-warning">Overlap</span> : "—"}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {(!data.templates?.length) && (
              <EmptyState
                title={!(data.doctors?.length) ? "No doctors assigned to this branch yet" : "No schedules found"}
                description={!(data.doctors?.length) ? "Assign doctors to this branch from the Doctors page, then add schedules from their profiles." : "Add schedule templates from doctor profiles or the Availability page."}
                action={<Link href={doctors(branchId)} className="btn btn-outline-primary btn-sm radius-8">Doctors</Link>}
              />
            )}
          </SectionCard>
          {Array.isArray(data.appointments) && data.appointments.length > 0 && (
            <SectionCard title="Appointments (timeline)" className="mt-3">
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light">
                    <tr><th>Doctor</th><th>Date / Time</th><th>Patient / Pet</th><th>Token</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {data.appointments.map((apt: any) => {
                      const colorIdx = doctorColorIndex[apt.doctorId] ?? 0;
                      return (
                        <tr key={apt.id} className={`table-${DOCTOR_COLORS[colorIdx]}-subtle`}>
                          <td>{data.doctors?.find((d: any) => (d.memberId ?? d.branchMemberId) === apt.doctorId)?.displayName ?? apt.doctorId ?? "—"}</td>
                          <td>
                            {apt.scheduledStartAt ? new Date(apt.scheduledStartAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "—"}
                            {apt.scheduledEndAt && ` – ${new Date(apt.scheduledEndAt).toLocaleTimeString(undefined, { timeStyle: "short" })}`}
                          </td>
                          <td>{(apt.ownerNameSnapshot || apt.petNameSnapshot) ? [apt.ownerNameSnapshot, apt.petNameSnapshot].filter(Boolean).join(" / ") : "—"}</td>
                          <td>{apt.tokenNo ?? "—"}</td>
                          <td><span className="badge bg-secondary-focus radius-8">{apt.status ?? "—"}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}
        </>
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
