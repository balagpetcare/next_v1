"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace, PageHeader, LoadingState, SectionCard } from "@/src/components/dashboard";
import { staffClinicRoomsList } from "@/lib/api";
import { humanizeEnum } from "@/src/lib/displayFormatters";

const ROOMS_PERMS = ["clinic.rooms.view", "clinic.rooms.manage"];

type Room = { id: number; name?: string; code?: string; roomType?: string; status?: string; operationalStatus?: string; capacity?: number };

type RoomSummary = { total: number; availableNow: number; occupiedNow: number; cleaning: number; maintenance: number; blocked: number; todayBookings: number };

export default function StaffClinicRoomsPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [summary, setSummary] = useState<RoomSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterOperational, setFilterOperational] = useState("");

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = ROOMS_PERMS.some((p) => permissions.includes(p));

  const loadRooms = useCallback(() => {
    if (!branchId) return;
    setLoading(true);
    setError("");
    staffClinicRoomsList(branchId, {
      summary: true,
      roomType: filterType || undefined,
      operationalStatus: filterOperational || undefined,
    })
      .then((result) => {
        setRooms(result.items ?? []);
        setSummary(result.summary ?? null);
      })
      .catch((e) => {
        setError((e as Error)?.message ?? "Failed to load rooms");
        setRooms([]);
        setSummary(null);
      })
      .finally(() => setLoading(false));
  }, [branchId, filterType, filterOperational]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  if (ctxLoading) {
    return (
      <PageWorkspace>
        <LoadingState message="Loading..." />
      </PageWorkspace>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        missingPerm="clinic.rooms.view"
        onBack={() => router.push(`/staff/branch/${branchId}/clinic`)}
      />
    );
  }

  return (
    <PageWorkspace>
      <div className="row g-0">
        <div className="col-12">
          <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <Link href={`/staff/branch/${branchId}/clinic`} className="btn btn-outline-secondary btn-sm radius-8">← Clinic</Link>
            <nav aria-label="Breadcrumb" className="d-flex align-items-center gap-2">
              <Link href={`/staff/branch/${branchId}/clinic`} className="text-muted small">Clinic</Link>
              <span className="text-muted small">/</span>
              <span className="fw-semibold">Rooms</span>
            </nav>
          </div>
          <PageHeader
            title="Rooms"
            subtitle="View consultation and procedure rooms"
            breadcrumbs={[{ label: "Clinic", href: `/staff/branch/${branchId}/clinic` }, { label: "Rooms" }]}
            actions={[
              permissions.some((p) => ["clinic.rooms.view_schedule", "clinic.rooms.manage"].includes(p)) && (
                <Link key="schedule-board" href={`/staff/branch/${branchId}/clinic/schedule-board`} className="btn btn-outline-primary btn-sm radius-8">
                  Schedule board
                </Link>
              ),
            ].filter(Boolean) as React.ReactNode[]}
          />

          {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

          {summary != null && (
            <div className="row g-2 mb-3">
              <div className="col-6 col-md-4 col-lg-2">
                <div className="card radius-8 border-0 bg-light">
                  <div className="card-body py-2">
                    <div className="text-muted small">Total</div>
                    <div className="fw-semibold">{summary.total}</div>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-4 col-lg-2">
                <div className="card radius-8 border-0 bg-light">
                  <div className="card-body py-2">
                    <div className="text-muted small">Available</div>
                    <div className="fw-semibold text-success">{summary.availableNow}</div>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-4 col-lg-2">
                <div className="card radius-8 border-0 bg-light">
                  <div className="card-body py-2">
                    <div className="text-muted small">Occupied</div>
                    <div className="fw-semibold">{summary.occupiedNow}</div>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-4 col-lg-2">
                <div className="card radius-8 border-0 bg-light">
                  <div className="card-body py-2">
                    <div className="text-muted small">Today bookings</div>
                    <div className="fw-semibold">{summary.todayBookings}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && rooms.length > 0 && (
            <div className="d-flex flex-wrap gap-2 mb-2">
              <select className="form-select form-select-sm radius-8" style={{ width: "auto" }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="">All types</option>
                <option value="CONSULTATION">Consultation</option>
                <option value="PROCEDURE">Procedure</option>
                <option value="SURGERY">Surgery</option>
                <option value="RECOVERY">Recovery</option>
                <option value="GENERAL">General</option>
                <option value="OTHER">Other</option>
              </select>
              <select className="form-select form-select-sm radius-8" style={{ width: "auto" }} value={filterOperational} onChange={(e) => setFilterOperational(e.target.value)}>
                <option value="">All status</option>
                <option value="AVAILABLE">Available</option>
                <option value="OCCUPIED">Occupied</option>
                <option value="CLEANING">Cleaning</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </div>
          )}

          <SectionCard title="Clinic rooms" subtitle="Rooms for this branch. Manage rooms in Owner Panel." noPadding>
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Room</th>
                    <th>Type</th>
                    <th>Lifecycle</th>
                    <th>Operational</th>
                    <th>Capacity</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">Loading…</td>
                    </tr>
                  ) : rooms.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        No rooms configured. Owners can add rooms in Clinic settings.
                      </td>
                    </tr>
                  ) : (
                    rooms.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <Link href={`/staff/branch/${branchId}/clinic/rooms/${r.id}`} className="text-dark text-decoration-none fw-semibold">
                            {r.name ?? `Room ${r.id}`}
                            {r.code ? ` (${r.code})` : ""}
                          </Link>
                        </td>
                        <td>{humanizeEnum(r.roomType ?? "")}</td>
                        <td><span className={`badge radius-8 ${r.status === "ACTIVE" ? "bg-success" : "bg-secondary"}`}>{humanizeEnum(r.status ?? "")}</span></td>
                        <td><span className="badge radius-8 bg-secondary">{humanizeEnum(r.operationalStatus ?? "AVAILABLE")}</span></td>
                        <td>{r.capacity != null ? r.capacity : "—"}</td>
                        <td>
                          <Link href={`/staff/branch/${branchId}/clinic/rooms/${r.id}`} className="btn btn-sm btn-outline-secondary radius-8">View</Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      </div>
    </PageWorkspace>
  );
}
