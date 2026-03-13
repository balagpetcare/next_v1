"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace, PageHeader, LoadingState, SectionCard } from "@/src/components/dashboard";
import { staffClinicRoomDetail, staffClinicRoomPatch, staffClinicRoomSchedule } from "@/lib/api";
import { humanizeEnum } from "@/src/lib/displayFormatters";

const ROOMS_PERMS = ["clinic.rooms.view", "clinic.rooms.manage"];

export default function StaffClinicRoomDetailPage() {
  const params = useParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const roomId = useMemo(() => String(params?.roomId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);
  const [room, setRoom] = useState<any>(null);
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [patching, setPatching] = useState(false);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = ROOMS_PERMS.some((p) => permissions.includes(p));
  const canUpdate = permissions.includes("clinic.rooms.manage");

  useEffect(() => {
    if (!branchId || !roomId || !hasAccess) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const today = new Date().toISOString().slice(0, 10);
        const [data, schedule] = await Promise.all([
          staffClinicRoomDetail(branchId, roomId),
          staffClinicRoomSchedule(branchId, roomId, today),
        ]);
        if (!cancelled) {
          setRoom(data ?? null);
          setTodaySchedule(Array.isArray(schedule) ? schedule : []);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error)?.message ?? "Failed to load room");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [branchId, roomId, hasAccess]);

  const setOperationalStatus = async (status: string) => {
    if (!branchId || !roomId || !canUpdate) return;
    try {
      setPatching(true);
      await staffClinicRoomPatch(branchId, roomId, { operationalStatus: status });
      setRoom((r: any) => (r ? { ...r, operationalStatus: status } : null));
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to update");
    } finally {
      setPatching(false);
    }
  };

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
        missingPerm="clinic.rooms.view"
        onBack={() => window.history.back()}
      />
    );
  }

  if (loading) {
    return (
      <PageWorkspace>
        <LoadingState message="Loading room…" />
      </PageWorkspace>
    );
  }

  if (error || !room) {
    return (
      <PageWorkspace>
        <div className="alert alert-danger radius-12">{error || "Room not found."}</div>
        <Link href={`/staff/branch/${branchId}/clinic/rooms`} className="btn btn-outline-secondary radius-12">← Back to rooms</Link>
      </PageWorkspace>
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
              <span className="fw-semibold">{room.name}</span>
            </nav>
          </div>
          <PageHeader
            title={room.name}
            subtitle={room.code ? `Code: ${room.code}` : "Room detail"}
            breadcrumbs={[
              { label: "Clinic", href: `/staff/branch/${branchId}/clinic` },
              { label: "Rooms", href: `/staff/branch/${branchId}/clinic/rooms` },
              { label: room.name },
            ]}
          />

          <SectionCard title="Overview" noPadding>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <dl className="row mb-0">
                    <dt className="col-sm-4 text-muted">Name</dt>
                    <dd className="col-sm-8">{room.name}</dd>
                    <dt className="col-sm-4 text-muted">Code</dt>
                    <dd className="col-sm-8">{room.code || "—"}</dd>
                    <dt className="col-sm-4 text-muted">Type</dt>
                    <dd className="col-sm-8">{humanizeEnum(room.roomType ?? "")}</dd>
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
                        {humanizeEnum(room.status ?? "")}
                      </span>
                    </dd>
                    <dt className="col-sm-4 text-muted">Operational</dt>
                    <dd className="col-sm-8">
                      <span className={`badge radius-8 ${
                        room.operationalStatus === "AVAILABLE" ? "bg-success" :
                        room.operationalStatus === "OCCUPIED" ? "bg-primary" :
                        room.operationalStatus === "CLEANING" ? "bg-info" : "bg-secondary"
                      }`}>
                        {humanizeEnum(room.operationalStatus ?? "AVAILABLE")}
                      </span>
                    </dd>
                    <dt className="col-sm-4 text-muted">Notes</dt>
                    <dd className="col-sm-8">{room.notes || "—"}</dd>
                  </dl>
                  {canUpdate && room.status === "ACTIVE" && (
                    <div className="mt-3">
                      <label className="form-label small text-muted">Quick status</label>
                      <div className="d-flex flex-wrap gap-2">
                        {["AVAILABLE", "OCCUPIED", "CLEANING", "MAINTENANCE", "BLOCKED"].map((s) => (
                          <button
                            key={s}
                            type="button"
                            className={`btn btn-sm radius-8 ${room.operationalStatus === s ? "btn-primary" : "btn-outline-secondary"}`}
                            disabled={patching}
                            onClick={() => setOperationalStatus(s)}
                          >
                            {humanizeEnum(s)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Today's schedule" noPadding className="mt-3">
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
                      {todaySchedule.map((apt: any) => (
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
          </SectionCard>

          <Link href={`/staff/branch/${branchId}/clinic/rooms`} className="btn btn-outline-secondary radius-12 mt-3">← Back to rooms</Link>
        </div>
      </div>
    </PageWorkspace>
  );
}
