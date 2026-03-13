"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ownerClinicRoomDetail, ownerClinicRoomUpdate, ownerClinicRoomAudit, ownerRoomSchedule, type ClinicRoom, type RoomAuditEntry, type ScheduleBoardAppointment } from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { humanizeEnum } from "@/src/lib/displayFormatters";

export default function OwnerClinicRoomDetailPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const roomId = params?.roomId as string | undefined;
  const [room, setRoom] = useState<ClinicRoom | null>(null);
  const [audit, setAudit] = useState<RoomAuditEntry[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<ScheduleBoardAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!branchId || !roomId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const today = new Date().toISOString().slice(0, 10);
        const [roomData, auditData, scheduleData] = await Promise.all([
          ownerClinicRoomDetail(branchId, roomId),
          ownerClinicRoomAudit(branchId, roomId, 30),
          ownerRoomSchedule(branchId, roomId, today),
        ]);
        if (!cancelled) {
          setRoom(roomData ?? null);
          setAudit(Array.isArray(auditData) ? auditData : []);
          setTodaySchedule(Array.isArray(scheduleData) ? scheduleData : []);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error)?.message || "Failed to load room");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [branchId, roomId]);

  const handleReactivate = async () => {
    if (!branchId || !roomId || !confirm("Reactivate this room?")) return;
    try {
      await ownerClinicRoomUpdate(branchId, roomId, { status: "ACTIVE" });
      setRoom((r) => (r ? { ...r, status: "ACTIVE" } : null));
    } catch (e) {
      setError((e as Error)?.message || "Failed to reactivate");
    }
  };

  if (!branchId || !roomId) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">Invalid branch or room.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard-main-body">
        <PageHeader
          title="Room"
          subtitle="Loading…"
          breadcrumbs={[
            { label: "Home", href: "/owner" },
            { label: "Clinic", href: "/owner/clinic" },
            { label: "Branch", href: `/owner/clinic/${branchId}` },
            { label: "Rooms", href: `/owner/clinic/${branchId}/rooms` },
            { label: "Detail", href: `/owner/clinic/${branchId}/rooms/${roomId}` },
          ]}
        />
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="dashboard-main-body">
        <PageHeader
          title="Room"
          subtitle="Not found"
          breadcrumbs={[
            { label: "Home", href: "/owner" },
            { label: "Clinic", href: "/owner/clinic" },
            { label: "Branch", href: `/owner/clinic/${branchId}` },
            { label: "Rooms", href: `/owner/clinic/${branchId}/rooms` },
          ]}
        />
        <div className="alert alert-danger radius-12">{error || "Room not found."}</div>
        <Link href={`/owner/clinic/${branchId}/rooms`} className="btn btn-outline-secondary radius-12">← Back to rooms</Link>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title={room.name}
        subtitle={room.code ? `Code: ${room.code}` : `Branch #${branchId}`}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Rooms", href: `/owner/clinic/${branchId}/rooms` },
          { label: room.name, href: `/owner/clinic/${branchId}/rooms/${roomId}` },
        ]}
        actions={[
          room.status === "ACTIVE" && (
            <Link key="edit" href={`/owner/clinic/${branchId}/rooms/${roomId}/edit`} className="btn btn-primary radius-12">
              <i className="ri-edit-line me-1" />
              Edit
            </Link>
          ),
          room.status === "INACTIVE" && (
            <button key="reactivate" type="button" className="btn btn-outline-success radius-12" onClick={handleReactivate}>
              Reactivate
            </button>
          ),
        ].filter(Boolean) as React.ReactNode[]}
      />

      <div className="card radius-12 mb-4">
        <div className="card-header bg-light">
          <h6 className="mb-0">Overview</h6>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <dl className="row mb-0">
                <dt className="col-sm-4 text-muted">Name</dt>
                <dd className="col-sm-8">{room.name}</dd>
                <dt className="col-sm-4 text-muted">Code</dt>
                <dd className="col-sm-8">{room.code || "—"}</dd>
                <dt className="col-sm-4 text-muted">Type</dt>
                <dd className="col-sm-8">{humanizeEnum(room.roomType)}</dd>
                <dt className="col-sm-4 text-muted">Floor / Zone</dt>
                <dd className="col-sm-8">{[room.floor, room.zone].filter(Boolean).join(" / ") || "—"}</dd>
                <dt className="col-sm-4 text-muted">Capacity</dt>
                <dd className="col-sm-8">{room.capacity != null ? room.capacity : "—"}</dd>
              </dl>
            </div>
            <div className="col-md-6">
              <dl className="row mb-0">
                <dt className="col-sm-4 text-muted">Lifecycle</dt>
                <dd className="col-sm-8">
                  <span className={`badge radius-8 ${room.status === "ACTIVE" ? "bg-success" : "bg-secondary"}`}>
                    {humanizeEnum(room.status)}
                  </span>
                </dd>
                <dt className="col-sm-4 text-muted">Operational</dt>
                <dd className="col-sm-8">
                  <span
                    className={`badge radius-8 ${
                      room.operationalStatus === "AVAILABLE" ? "bg-success" :
                      room.operationalStatus === "OCCUPIED" ? "bg-primary" :
                      room.operationalStatus === "CLEANING" ? "bg-info" :
                      "bg-secondary"
                    }`}
                  >
                    {humanizeEnum(room.operationalStatus ?? "AVAILABLE")}
                  </span>
                </dd>
                <dt className="col-sm-4 text-muted">Bookable</dt>
                <dd className="col-sm-8">{room.bookable !== false ? "Yes" : "No"}</dd>
                <dt className="col-sm-4 text-muted">Notes</dt>
                <dd className="col-sm-8">{room.notes || "—"}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="card radius-12 mb-4">
        <div className="card-header bg-light">
          <h6 className="mb-0">Today&apos;s schedule</h6>
        </div>
        <div className="card-body p-0">
          {todaySchedule.length === 0 ? (
            <p className="text-muted mb-0 p-3">No appointments today.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Pet / Service</th>
                    <th>Doctor</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {todaySchedule.map((apt) => (
                    <tr key={apt.id}>
                      <td>
                        {new Date(apt.scheduledStartAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        –{new Date(apt.scheduledEndAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
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

      {audit.length > 0 && (
        <div className="card radius-12 mb-4">
          <div className="card-header bg-light">
            <h6 className="mb-0">Audit history</h6>
          </div>
          <div className="card-body p-0">
            <ul className="list-group list-group-flush">
              {audit.map((entry) => (
                <li key={entry.id} className="list-group-item d-flex justify-content-between align-items-start">
                  <span className="text-break">{entry.summaryText}</span>
                  <small className="text-muted ms-2 text-nowrap">{new Date(entry.createdAt).toLocaleString()}</small>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <Link href={`/owner/clinic/${branchId}/rooms`} className="btn btn-outline-secondary radius-12">
        ← Back to rooms
      </Link>
    </div>
  );
}
