"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ownerClinicRooms,
  ownerClinicRoomCreate,
  ownerClinicRoomUpdate,
  ownerClinicRoomDelete,
  type ClinicRoom,
} from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

const ROOM_TYPES = ["GENERAL", "CONSULTATION", "PROCEDURE", "RECOVERY", "LAB", "GROOMING", "OTHER"];

export default function ClinicRoomsPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const [rooms, setRooms] = useState<ClinicRoom[]>([]);
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

  const load = async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      setError("");
      const data = await ownerClinicRooms(branchId);
      setRooms(Array.isArray(data) ? data : []);
    } catch (e) {
      setError((e as Error)?.message || "Failed to load rooms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [branchId]);

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
                    <th>Status</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((r) => (
                    <tr key={r.id}>
                      <td className="fw-semibold">{r.name}</td>
                      <td>{r.roomType}</td>
                      <td>{r.capacity != null ? r.capacity : "—"}</td>
                      <td>
                        <span
                          className={`badge radius-8 ${
                            r.status === "ACTIVE" ? "bg-success" : "bg-secondary"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="text-muted small">{r.notes || "—"}</td>
                      <td>
                        <div className="d-flex gap-2">
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
