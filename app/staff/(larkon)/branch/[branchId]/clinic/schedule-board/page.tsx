"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace, PageHeader, LoadingState } from "@/src/components/dashboard";
import { staffClinicScheduleBoard, staffClinicRoomsList } from "@/lib/api";

const SCHEDULE_PERMS = ["clinic.rooms.view_schedule", "clinic.rooms.view", "clinic.rooms.manage"];

export default function StaffScheduleBoardPage() {
  const params = useParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);
  const [data, setData] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 6);
    return d.toISOString().slice(0, 10);
  });
  const [filterRoomId, setFilterRoomId] = useState<string>("");

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = SCHEDULE_PERMS.some((p) => permissions.includes(p));

  const load = useCallback(() => {
    if (!branchId || !hasAccess) return;
    setLoading(true);
    setError("");
    Promise.all([
      staffClinicScheduleBoard(branchId, {
        dateFrom,
        dateTo,
        roomId: filterRoomId ? Number(filterRoomId) : undefined,
      }),
      staffClinicRoomsList(branchId),
    ])
      .then(([board, roomsResult]) => {
        setData(board ?? null);
        setRooms(roomsResult?.items ?? []);
      })
      .catch((e) => {
        setError((e as Error)?.message ?? "Failed to load schedule board");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [branchId, hasAccess, dateFrom, dateTo, filterRoomId]);

  useEffect(() => {
    load();
  }, [load]);

  if (ctxLoading) {
    return (
      <PageWorkspace>
        <LoadingState message="Loading…" />
      </PageWorkspace>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        missingPerm="clinic.rooms.view_schedule"
        onBack={() => window.history.back()}
      />
    );
  }

  return (
    <PageWorkspace>
      <div className="row g-0">
        <div className="col-12">
          <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <Link href={`/staff/branch/${branchId}/clinic/rooms`} className="btn btn-outline-secondary btn-sm radius-8">← Rooms</Link>
            <nav aria-label="Breadcrumb" className="d-flex align-items-center gap-2">
              <Link href={`/staff/branch/${branchId}/clinic`} className="text-muted small">Clinic</Link>
              <span className="text-muted small">/</span>
              <Link href={`/staff/branch/${branchId}/clinic/rooms`} className="text-muted small">Rooms</Link>
              <span className="text-muted small">/</span>
              <span className="fw-semibold">Schedule board</span>
            </nav>
          </div>
          <PageHeader
            title="Schedule board"
            subtitle="Room and appointment view by date range"
            breadcrumbs={[
              { label: "Clinic", href: `/staff/branch/${branchId}/clinic` },
              { label: "Rooms", href: `/staff/branch/${branchId}/clinic/rooms` },
              { label: "Schedule board" },
            ]}
          />

          <div className="card radius-12 mb-4">
            <div className="card-body">
              <div className="row g-2 align-items-end">
                <div className="col-auto">
                  <label className="form-label small mb-0">From</label>
                  <input type="date" className="form-control form-control-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div className="col-auto">
                  <label className="form-label small mb-0">To</label>
                  <input type="date" className="form-control form-control-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
                <div className="col-auto">
                  <label className="form-label small mb-0">Room</label>
                  <select className="form-select form-select-sm" value={filterRoomId} onChange={(e) => setFilterRoomId(e.target.value)}>
                    <option value="">All rooms</option>
                    {rooms.map((r: any) => (
                      <option key={r.id} value={r.id}>{r.name}{r.code ? ` (${r.code})` : ""}</option>
                    ))}
                  </select>
                </div>
                <div className="col-auto">
                  <button type="button" className="btn btn-primary btn-sm radius-12" onClick={load} disabled={loading}>
                    {loading ? "Loading…" : "Refresh"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {error && <div className="alert alert-danger radius-12">{error}</div>}

          {loading && !data ? (
            <div className="card radius-12">
              <div className="card-body text-center py-5">
                <div className="spinner-border text-primary" role="status" />
              </div>
            </div>
          ) : data ? (
            <>
              {data.conflicts?.length > 0 && (
                <div className="alert alert-warning radius-12 mb-3">
                  <strong>Conflicts:</strong> {data.conflicts.length} overlapping appointment(s) in the same room.
                </div>
              )}
              <div className="card radius-12">
                <div className="card-body p-0">
                  {!data.appointments?.length ? (
                    <p className="text-muted mb-0 p-4">No appointments in this range.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead>
                          <tr>
                            <th>Date / Time</th>
                            <th>Room</th>
                            <th>Pet / Service</th>
                            <th>Doctor</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.appointments.map((apt: any) => (
                            <tr key={apt.id}>
                              <td>
                                {new Date(apt.scheduledStartAt).toLocaleDateString()}{" "}
                                {new Date(apt.scheduledStartAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                –{new Date(apt.scheduledEndAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </td>
                              <td>{apt.roomName || "—"}</td>
                              <td>{apt.petName || "—"} / {apt.serviceName}</td>
                              <td>{apt.doctorName || "—"}</td>
                              <td>
                                <span className={`badge radius-8 ${apt.hasConflict ? "bg-danger" : "bg-secondary"}`}>
                                  {apt.status}
                                  {apt.hasConflict ? " (conflict)" : ""}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}

          <Link href={`/staff/branch/${branchId}/clinic/rooms`} className="btn btn-outline-secondary radius-12 mt-3">← Back to rooms</Link>
        </div>
      </div>
    </PageWorkspace>
  );
}
