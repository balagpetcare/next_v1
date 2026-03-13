"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { availability as availabilityRoute, doctors, scheduleBoard, approvals } from "@/src/lib/doctorOperationsRoutes";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffDoctorSchedule,
  staffDoctorLeave,
  staffDoctorsEnriched,
  staffDoctorsAvailabilityBoard,
} from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import {
  PageWorkspace,
  PageHeader,
  LoadingState,
  SectionCard,
  EmptyState,
  StatCard,
} from "@/src/components/dashboard";
import { DoctorOperationsFilterBar, Doctor360Drawer } from "@/src/components/clinic/doctors";

const DOCTORS_PERMS = ["clinic.doctors.view", "clinic.doctors.manage_leave"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function StaffClinicDoctorsAvailabilityPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);

  const memberIdFromUrl = useMemo(() => {
    const m = searchParams?.get("memberId");
    if (m == null || m === "") return undefined;
    const n = parseInt(m, 10);
    return Number.isNaN(n) ? undefined : n;
  }, [searchParams]);

  const [doctorOptions, setDoctorOptions] = useState<Array<{ memberId: number; displayName?: string }>>([]);
  const [board, setBoard] = useState<{
    onLeaveToday: any[];
    upcomingLeave: any[];
    pendingRequests: any[];
  }>({ onLeaveToday: [], upcomingLeave: [], pendingRequests: [] });
  const [boardLoading, setBoardLoading] = useState(true);
  const [schedule, setSchedule] = useState<{ templates: any[]; exceptions?: any[] }>({ templates: [], exceptions: [] });
  const [leave, setLeave] = useState<any[]>([]);
  const [doctorDetailLoading, setDoctorDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [drawerMemberId, setDrawerMemberId] = useState<number | null>(null);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = DOCTORS_PERMS.some((p) => permissions.includes(p));

  const loadDoctors = useCallback(async () => {
    if (!branchId || !hasAccess) return;
    try {
      const data = await staffDoctorsEnriched(branchId, { limit: 100, offset: 0 });
      const raw = Array.isArray(data?.items) ? data.items : [];
      setDoctorOptions(
        raw.map((d: any) => ({
          memberId: d.memberId ?? d.branchMemberId ?? 0,
          displayName: d.displayName,
        }))
      );
    } catch {
      setDoctorOptions([]);
    }
  }, [branchId, hasAccess]);

  const loadBoard = useCallback(async () => {
    if (!branchId || !hasAccess) return;
    setBoardLoading(true);
    try {
      const data = await staffDoctorsAvailabilityBoard(branchId);
      setBoard({
        onLeaveToday: Array.isArray(data?.onLeaveToday) ? data.onLeaveToday : [],
        upcomingLeave: Array.isArray(data?.upcomingLeave) ? data.upcomingLeave : [],
        pendingRequests: Array.isArray(data?.pendingRequests) ? data.pendingRequests : [],
      });
    } catch {
      setBoard({ onLeaveToday: [], upcomingLeave: [], pendingRequests: [] });
    } finally {
      setBoardLoading(false);
    }
  }, [branchId, hasAccess]);

  const loadDoctorData = useCallback(async () => {
    if (!branchId || memberIdFromUrl == null || !hasAccess) return;
    setDoctorDetailLoading(true);
    setError("");
    try {
      const [scheduleRes, leaveRes] = await Promise.all([
        staffDoctorSchedule(branchId, memberIdFromUrl),
        staffDoctorLeave(branchId, memberIdFromUrl),
      ]);
      setSchedule(
        scheduleRes && typeof scheduleRes === "object"
          ? { templates: (scheduleRes as any).templates ?? [], exceptions: (scheduleRes as any).exceptions ?? [] }
          : { templates: [], exceptions: [] }
      );
      setLeave(Array.isArray(leaveRes) ? leaveRes : []);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load");
      setSchedule({ templates: [], exceptions: [] });
      setLeave([]);
    } finally {
      setDoctorDetailLoading(false);
    }
  }, [branchId, memberIdFromUrl, hasAccess]);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    if (memberIdFromUrl != null) loadDoctorData();
    else {
      setSchedule({ templates: [], exceptions: [] });
      setLeave([]);
    }
  }, [memberIdFromUrl, loadDoctorData]);

  const setMemberIdInUrl = useCallback(
    (memberId: number | undefined) => {
      const path = availabilityRoute(branchId);
      const next = new URLSearchParams(searchParams?.toString() ?? "");
      if (memberId != null) next.set("memberId", String(memberId));
      else next.delete("memberId");
      const q = next.toString();
      router.replace(q ? `${path}?${q}` : path, { scroll: false });
    },
    [branchId, router, searchParams]
  );

  const doctorExistsInBranch = useMemo(
    () => memberIdFromUrl == null || doctorOptions.some((d) => d.memberId === memberIdFromUrl),
    [memberIdFromUrl, doctorOptions]
  );
  const invalidDoctorInUrl = memberIdFromUrl != null && !doctorExistsInBranch;

  const weekGrid = useMemo(() => {
    const byDay: Record<number, string> = { 0: "—", 1: "—", 2: "—", 3: "—", 4: "—", 5: "—", 6: "—" };
    (schedule.templates ?? []).forEach((t: any) => {
      const slot = `${t.startTime ?? ""}-${t.endTime ?? ""}`.replace(/^-|-$/g, "") || "—";
      const existing = byDay[t.dayOfWeek];
      byDay[t.dayOfWeek] = existing && existing !== "—" ? `${existing}; ${slot}` : slot;
    });
    return byDay;
  }, [schedule.templates]);

  const displayName = (item: any) =>
    item?.displayName ?? item?.clinicStaffProfile?.branchMember?.user?.profile?.displayName ?? `#${item?.memberId ?? item?.clinicStaffProfile?.branchMemberId}`;

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
      <PageHeader
        title="Availability"
        subtitle={
          memberIdFromUrl != null
            ? "Branch leave board and selected doctor schedule"
            : "Leave and availability across all doctors"
        }
      />
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <Link href={doctors(branchId)} className="btn btn-outline-secondary btn-sm radius-8">
          ← Doctors
        </Link>
        <Link href={`/staff/branch/${branchId}/clinic/doctors/schedule-board`} className="btn btn-outline-primary btn-sm radius-8">
          Schedule Board
        </Link>
      </div>

      <DoctorOperationsFilterBar
        branchId={branchId}
        doctorValue={memberIdFromUrl}
        onDoctorChange={setMemberIdInUrl}
        doctorPlaceholder="All doctors"
        enabled={hasAccess}
        className="mb-3"
      />

      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}

      {/* Branch-wide availability board (default view) */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-4">
          <StatCard
            label="On leave today"
            value={boardLoading ? "—" : board.onLeaveToday.length}
            icon="ri:calendar-event-line"
            variant="warning"
            loading={boardLoading}
          />
        </div>
        <div className="col-6 col-md-4">
          <StatCard
            label="Upcoming leave"
            value={boardLoading ? "—" : board.upcomingLeave.length}
            icon="ri:calendar-schedule-line"
            variant="info"
            loading={boardLoading}
          />
        </div>
        <div className="col-6 col-md-4">
          <StatCard
            label="Pending requests"
            value={boardLoading ? "—" : board.pendingRequests.length}
            icon="ri:time-line"
            variant="secondary"
            loading={boardLoading}
          />
        </div>
      </div>

      {boardLoading ? (
        <SectionCard>
          <LoadingState message="Loading availability board…" />
        </SectionCard>
      ) : (
        <>
          <SectionCard title="On leave today" subtitle={board.onLeaveToday.length ? `${board.onLeaveToday.length} doctor(s)` : undefined}>
            {board.onLeaveToday.length === 0 ? (
              <EmptyState
                title="No doctors on leave today"
                description="All branch doctors are available today."
                icon="ri:calendar-event-line"
                action={<Link href={scheduleBoard(branchId)} className="btn btn-outline-primary btn-sm radius-8">Schedule Board</Link>}
              />
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light">
                    <tr><th>Doctor</th><th>Start</th><th>End</th><th>Reason</th></tr>
                  </thead>
                  <tbody>
                    {board.onLeaveToday.map((item: any, i: number) => {
                      const mid = item.memberId ?? item.clinicStaffProfile?.branchMemberId;
                      return (
                      <tr key={item.id ?? i}>
                        <td>
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 text-start text-body text-decoration-none"
                            onClick={() => mid != null && setDrawerMemberId(mid)}
                          >
                            {displayName(item)}
                          </button>
                          {mid != null && (
                            <Link href={availabilityRoute(branchId, mid)} className="ms-1 small">Filter</Link>
                          )}
                        </td>
                        <td>{item.startDate ? new Date(item.startDate).toLocaleDateString() : "—"}</td>
                        <td>{item.endDate ? new Date(item.endDate).toLocaleDateString() : "—"}</td>
                        <td className="text-muted small">{item.reason ?? "—"}</td>
                      </tr>
                    ); })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Upcoming leave" subtitle={board.upcomingLeave.length ? "Next 30 days" : undefined} className="mt-3">
            {board.upcomingLeave.length === 0 ? (
              <p className="text-muted small mb-0">No upcoming leave in the next 30 days.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light">
                    <tr><th>Doctor</th><th>Start</th><th>End</th><th>Reason</th></tr>
                  </thead>
                  <tbody>
                    {board.upcomingLeave.slice(0, 15).map((item: any, i: number) => (
                      <tr key={item.id ?? i}>
                        <td>
                          <Link href={availabilityRoute(branchId, item.memberId ?? item.clinicStaffProfile?.branchMemberId)} className="text-body">
                            {displayName(item)}
                          </Link>
                        </td>
                        <td>{item.startDate ? new Date(item.startDate).toLocaleDateString() : "—"}</td>
                        <td>{item.endDate ? new Date(item.endDate).toLocaleDateString() : "—"}</td>
                        <td className="text-muted small">{item.reason ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Pending leave requests" subtitle={board.pendingRequests.length ? `${board.pendingRequests.length} pending` : undefined} className="mt-3">
            {board.pendingRequests.length === 0 ? (
              <EmptyState
                title="No pending leave requests"
                description="There are no leave requests awaiting approval."
                icon="ri:time-line"
                action={<Link href={approvals(branchId)} className="btn btn-outline-primary btn-sm radius-8">Pending Approvals</Link>}
              />
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light">
                    <tr><th>Doctor</th><th>Start</th><th>End</th><th>Reason</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {board.pendingRequests.map((item: any, i: number) => {
                      const mid = item.memberId ?? item.clinicStaffProfile?.branchMemberId;
                      return (
                      <tr key={item.id ?? i}>
                        <td>
                          {mid != null ? (
                            <button
                              type="button"
                              className="btn btn-link btn-sm p-0 text-start text-body text-decoration-none"
                              onClick={() => setDrawerMemberId(mid)}
                            >
                              {displayName(item)}
                            </button>
                          ) : (
                            displayName(item)
                          )}
                        </td>
                        <td>{item.startDate ? new Date(item.startDate).toLocaleDateString() : "—"}</td>
                        <td>{item.endDate ? new Date(item.endDate).toLocaleDateString() : "—"}</td>
                        <td className="text-muted small">{item.reason ?? "—"}</td>
                        <td><span className="badge bg-warning radius-8">{item.status ?? "PENDING"}</span></td>
                      </tr>
                    ); })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </>
      )}

      <Doctor360Drawer
        open={drawerMemberId != null}
        onClose={() => setDrawerMemberId(null)}
        branchId={branchId}
        memberId={drawerMemberId}
      />

      {/* Optional: selected doctor detail panel */}
      {memberIdFromUrl != null && (
        <SectionCard title="Selected doctor" subtitle={invalidDoctorInUrl ? undefined : doctorOptions.find((d) => d.memberId === memberIdFromUrl)?.displayName ?? `Doctor #${memberIdFromUrl}`} className="mt-4">
          {invalidDoctorInUrl ? (
            <EmptyState
              title="Doctor not found"
              description="The selected doctor is not assigned to this branch. Clear the filter to see the branch board only."
              icon="ri:user-search-line"
              action={
                <button type="button" className="btn btn-outline-primary btn-sm radius-8" onClick={() => setMemberIdInUrl(undefined)}>
                  Clear filter
                </button>
              }
            />
          ) : doctorDetailLoading ? (
            <LoadingState message="Loading doctor schedule…" />
          ) : (
            <>
              <div className="mb-3">
                <Link href={availabilityRoute(branchId, memberIdFromUrl)} className="btn btn-sm btn-outline-primary radius-8">
                  Edit in profile
                </Link>
              </div>
              <SectionCard title="Weekly schedule" subtitle="Recurring slots" className="mb-3">
                {Object.values(weekGrid).every((v) => v === "—") ? (
                  <p className="text-muted small mb-0">No recurring slots. Add schedule in doctor profile.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered mb-0">
                      <thead className="table-light">
                        <tr>
                          {DAYS.map((d, i) => (
                            <th key={i} className="text-center small">{d}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {[0, 1, 2, 3, 4, 5, 6].map((dow) => (
                            <td key={dow} className="small">
                              {weekGrid[dow] === "—" ? <span className="text-muted">OFF</span> : weekGrid[dow]}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
              <SectionCard title="Leave" subtitle={`${leave.length} record(s)`}>
                {leave.length === 0 ? (
                  <p className="text-muted small mb-0">No leave records.</p>
                ) : (
                  <ul className="list-group list-group-flush mb-0">
                    {leave.map((item: any, i: number) => (
                      <li key={i} className="list-group-item d-flex justify-content-between align-items-center px-0">
                        <span>
                          {item.startDate && new Date(item.startDate).toLocaleDateString()}
                          {item.endDate && ` – ${new Date(item.endDate).toLocaleDateString()}`}
                          {item.reason && ` · ${item.reason}`}
                        </span>
                        <span className="badge bg-secondary-focus radius-8">{item.status ?? "—"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </>
          )}
        </SectionCard>
      )}
    </PageWorkspace>
  );
}
