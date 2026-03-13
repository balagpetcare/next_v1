"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ownerClinicRoomsWithSummary,
  ownerClinicRoomCreate,
  ownerClinicRoomUpdate,
  ownerClinicRoomDelete,
  type ClinicRoom,
  type RoomSummary,
} from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { humanizeEnum } from "@/src/lib/displayFormatters";

const ROOM_TYPES = ["GENERAL", "CONSULTATION", "PROCEDURE", "RECOVERY", "LAB", "GROOMING", "IMAGING", "VACCINATION", "ISOLATION", "MULTIPURPOSE", "SURGERY", "OTHER"];
const OPERATIONAL_STATUSES = ["AVAILABLE", "RESERVED", "OCCUPIED", "CLEANING", "MAINTENANCE", "BLOCKED"];

export default function ClinicRoomsPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const [rooms, setRooms] = useState<ClinicRoom[]>([]);
  const [summary, setSummary] = useState<RoomSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formRoomType, setFormRoomType] = useState("GENERAL");
  const [formCapacity, setFormCapacity] = useState<string>("");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [filterOperational, setFilterOperational] = useState("");

  const load = useCallback(async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      setError("");
      const result = await ownerClinicRoomsWithSummary(branchId, {
        roomType: filterType || undefined,
        operationalStatus: filterOperational || undefined,
      });
      if (result) {
        setRooms(result.rooms);
        setSummary(result.summary);
      } else {
        setRooms([]);
        setSummary(null);
      }
    } catch (e) {
      setError((e as Error)?.message || "Failed to load rooms");
      setRooms([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [branchId, filterType, filterOperational]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setFormName("");
    setFormRoomType("GENERAL");
    setFormCapacity("");
    setFormNotes("");
    setEditingId(null);
    setShowForm(false);
  };

  const fillForm = (room: ClinicRoom) => {
    setFormName(room.name);
    setFormRoomType(room.roomType || "GENERAL");
    setFormCapacity(room.capacity != null ? String(room.capacity) : "");
    setFormNotes(room.notes ?? "");
    setEditingId(room.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId || !formName.trim()) return;
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const capacityNum = formCapacity.trim() ? parseInt(formCapacity, 10) : undefined;
      if (capacityNum !== undefined && (Number.isNaN(capacityNum) || capacityNum < 1)) {
        setError("Capacity must be at least 1 when provided.");
        setSaving(false);
        return;
      }
      if (editingId) {
        await ownerClinicRoomUpdate(branchId, editingId, {
          name: formName.trim(),
          roomType: formRoomType,
          capacity: capacityNum,
          notes: formNotes.trim() || undefined,
        });
        setSuccess("Room updated.");
      } else {
        await ownerClinicRoomCreate(branchId, {
          name: formName.trim(),
          roomType: formRoomType,
          capacity: capacityNum,
          notes: formNotes.trim() || undefined,
        });
        setSuccess("Room created.");
      }
      resetForm();
      load();
    } catch (e) {
      setError((e as Error)?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (roomId: number) => {
    if (!branchId || !confirm("Deactivate this room? It can be reactivated later.")) return;
    try {
      setError("");
      await ownerClinicRoomUpdate(branchId, roomId, { status: "INACTIVE" });
      setSuccess("Room deactivated.");
      load();
    } catch (e) {
      setError((e as Error)?.message || "Failed to deactivate");
    }
  };

  const handleReactivate = async (roomId: number) => {
    if (!branchId || !confirm("Reactivate this room?")) return;
    try {
      setError("");
      await ownerClinicRoomUpdate(branchId, roomId, { status: "ACTIVE" });
      setSuccess("Room reactivated.");
      load();
    } catch (e) {
      setError((e as Error)?.message || "Failed to reactivate");
    }
  };

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
        title="Clinic rooms"
        subtitle={`Branch #${branchId}`}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Rooms", href: `/owner/clinic/${branchId}/rooms` },
        ]}
        actions={[
          <Link key="schedule-board" href={`/owner/clinic/${branchId}/schedule-board`} className="btn btn-outline-primary radius-12">
            Schedule board
          </Link>,
          <button
            key="add"
            type="button"
            className="btn btn-primary radius-12"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <i className="ri-add-line me-1" />
            Add room
          </button>,
        ]}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success radius-12 mb-24">
          <i className="ri-check-line me-2" />
          {success}
        </div>
      )}

      {summary != null && (
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-4 col-lg-2">
            <div className="card radius-12 border-0 bg-light">
              <div className="card-body py-3">
                <div className="text-muted small">Total rooms</div>
                <div className="fw-semibold fs-5">{summary.total}</div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-4 col-lg-2">
            <div className="card radius-12 border-0 bg-light">
              <div className="card-body py-3">
                <div className="text-muted small">Available now</div>
                <div className="fw-semibold fs-5 text-success">{summary.availableNow}</div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-4 col-lg-2">
            <div className="card radius-12 border-0 bg-light">
              <div className="card-body py-3">
                <div className="text-muted small">Occupied</div>
                <div className="fw-semibold fs-5">{summary.occupiedNow}</div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-4 col-lg-2">
            <div className="card radius-12 border-0 bg-light">
              <div className="card-body py-3">
                <div className="text-muted small">Cleaning</div>
                <div className="fw-semibold fs-5">{summary.cleaning}</div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-4 col-lg-2">
            <div className="card radius-12 border-0 bg-light">
              <div className="card-body py-3">
                <div className="text-muted small">Maintenance</div>
                <div className="fw-semibold fs-5">{summary.maintenance}</div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-4 col-lg-2">
            <div className="card radius-12 border-0 bg-light">
              <div className="card-body py-3">
                <div className="text-muted small">Today bookings</div>
                <div className="fw-semibold fs-5">{summary.todayBookings}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && rooms.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mb-3">
          <select
            className="form-select form-select-sm radius-8"
            style={{ width: "auto" }}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All types</option>
            {ROOM_TYPES.map((t) => (
              <option key={t} value={t}>{humanizeEnum(t)}</option>
            ))}
          </select>
          <select
            className="form-select form-select-sm radius-8"
            style={{ width: "auto" }}
            value={filterOperational}
            onChange={(e) => setFilterOperational(e.target.value)}
          >
            <option value="">All status</option>
            {OPERATIONAL_STATUSES.map((s) => (
              <option key={s} value={s}>{humanizeEnum(s)}</option>
            ))}
          </select>
        </div>
      )}

      {showForm && (
        <div className="card radius-12 mb-4">
          <div className="card-body p-24">
            <h6 className="mb-3">{editingId ? "Edit room" : "New room"}</h6>
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    className="form-control radius-12"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    maxLength={128}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Type</label>
                  <select
                    className="form-select radius-12"
                    value={formRoomType}
                    onChange={(e) => setFormRoomType(e.target.value)}
                  >
                    {ROOM_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label">Capacity</label>
                  <input
                    type="number"
                    className="form-control radius-12"
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(e.target.value)}
                    min={1}
                    placeholder="Optional"
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Notes</label>
                  <input
                    type="text"
                    className="form-control radius-12"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="mt-3 d-flex gap-2">
                <button type="submit" className="btn btn-primary radius-12" disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary radius-12"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status" />
          </div>
        </div>
      ) : rooms.length === 0 ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <i className="ri-door-open-line fs-1 text-muted mb-3 d-block" />
            <h5 className="mb-3">No rooms yet</h5>
            <p className="text-muted mb-4">Add rooms or chambers for this clinic branch.</p>
            <button
              type="button"
              className="btn btn-primary radius-12"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              <i className="ri-add-line me-1" />
              Add first room
            </button>
          </div>
        </div>
      ) : (
        <div className="card radius-12">
          <div className="card-body p-24">
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Capacity</th>
                    <th>Lifecycle</th>
                    <th>Operational</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((r) => (
                    <tr key={r.id}>
                      <td className="fw-semibold">
                        <Link href={`/owner/clinic/${branchId}/rooms/${r.id}`} className="text-dark text-decoration-none">
                          {r.name}
                          {r.code ? ` (${r.code})` : ""}
                        </Link>
                      </td>
                      <td>{humanizeEnum(r.roomType)}</td>
                      <td>{r.capacity != null ? r.capacity : "—"}</td>
                      <td>
                        <span
                          className={`badge radius-8 ${
                            r.status === "ACTIVE" ? "bg-success" : "bg-secondary"
                          }`}
                        >
                          {humanizeEnum(r.status)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge radius-8 ${
                            r.operationalStatus === "AVAILABLE" ? "bg-success" :
                            r.operationalStatus === "OCCUPIED" ? "bg-primary" :
                            r.operationalStatus === "CLEANING" ? "bg-info" :
                            r.operationalStatus === "MAINTENANCE" || r.operationalStatus === "BLOCKED" ? "bg-warning text-dark" : "bg-secondary"
                          }`}
                        >
                          {humanizeEnum(r.operationalStatus ?? "AVAILABLE")}
                        </span>
                      </td>
                      <td className="text-muted small">{r.notes || "—"}</td>
                      <td>
                        <div className="d-flex flex-wrap gap-2">
                          <Link
                            href={`/owner/clinic/${branchId}/rooms/${r.id}`}
                            className="btn btn-sm btn-outline-secondary radius-12"
                          >
                            View
                          </Link>
                          {r.status === "ACTIVE" && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary radius-12"
                              onClick={() => fillForm(r)}
                            >
                              Edit
                            </button>
                          )}
                          {r.status === "ACTIVE" ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger radius-12"
                              onClick={() => handleDeactivate(r.id)}
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success radius-12"
                              onClick={() => handleReactivate(r.id)}
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
