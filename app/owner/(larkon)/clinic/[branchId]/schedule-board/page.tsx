"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ownerScheduleBoard, ownerClinicRooms, type ScheduleBoardResult, type ClinicRoom } from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

export default function OwnerScheduleBoardPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const [data, setData] = useState<ScheduleBoardResult | null>(null);
  const [rooms, setRooms] = useState<ClinicRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 6);
    return d.toISOString().slice(0, 10);
  });
  const [filterRoomId, setFilterRoomId] = useState<string>("");

  const load = useCallback(async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      setError("");
      const [board, roomsList] = await Promise.all([
        ownerScheduleBoard(branchId, {
          dateFrom,
          dateTo,
          roomId: filterRoomId ? Number(filterRoomId) : undefined,
        }),
        ownerClinicRooms(branchId),
      ]);
      setData(board ?? null);
      setRooms(Array.isArray(roomsList) ? roomsList : []);
    } catch (e) {
      setError((e as Error)?.message || "Failed to load schedule board");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [branchId, dateFrom, dateTo, filterRoomId]);

  useEffect(() => {
    load();
  }, [load]);

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
        title="Schedule board"
        subtitle="Room and appointment view by date range"
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Rooms", href: `/owner/clinic/${branchId}/rooms` },
          { label: "Schedule board", href: `/owner/clinic/${branchId}/schedule-board` },
        ]}
        actions={[
          <Link key="rooms" href={`/owner/clinic/${branchId}/rooms`} className="btn btn-outline-primary radius-12">
            Rooms
          </Link>,
        ]}
      />

      <div className="card radius-12 mb-4">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-auto">
              <label className="form-label small mb-0">From</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="col-auto">
              <label className="form-label small mb-0">To</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="col-auto">
              <label className="form-label small mb-0">Room</label>
              <select
                className="form-select form-select-sm"
                value={filterRoomId}
                onChange={(e) => setFilterRoomId(e.target.value)}
              >
                <option value="">All rooms</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                    {r.code ? ` (${r.code})` : ""}
                  </option>
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

      {error && (
        <div className="alert alert-danger radius-12">{error}</div>
      )}

      {loading && !data ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status" />
          </div>
        </div>
      ) : data ? (
        <>
          {data.conflicts.length > 0 && (
            <div className="alert alert-warning radius-12 mb-3">
              <strong>Conflicts:</strong> {data.conflicts.length} overlapping appointment(s) in the same room. Resolve in appointments or reschedule.
            </div>
          )}
          <div className="card radius-12">
            <div className="card-body p-0">
              {data.appointments.length === 0 ? (
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
                      {data.appointments.map((apt) => (
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

      <Link href={`/owner/clinic/${branchId}/rooms`} className="btn btn-outline-secondary radius-12 mt-3">
        ← Back to rooms
      </Link>
    </div>
  );
}
