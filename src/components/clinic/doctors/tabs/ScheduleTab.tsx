"use client";

import { useState, useCallback } from "react";
import {
  staffDoctorPostSchedule,
  staffDoctorPutSchedule,
  staffDoctorDeleteSchedule,
  staffDoctorPostScheduleException,
  staffDoctorPutScheduleException,
  staffDoctorDeleteScheduleException,
} from "@/lib/api";
import { useToast } from "@/src/hooks/useToast";

const EXCEPTION_TYPES = [
  { value: "OFF", label: "Off / Unavailable" },
  { value: "EXTRA_SHIFT", label: "Extra shift" },
  { value: "CUSTOM_SLOTS", label: "Custom slots" },
  { value: "LEAVE", label: "Leave" },
  { value: "EMERGENCY_AVAILABLE", label: "Emergency available" },
];

type Props = {
  branchId: string;
  memberId: number;
  schedule: { templates: any[]; exceptions: any[] };
  loading?: boolean;
  permissions: string[];
  onRefresh?: () => void;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function hasPerm(permissions: string[], perm: string): boolean {
  return permissions.includes(perm);
}

export default function ScheduleTab({
  branchId,
  memberId,
  schedule,
  loading,
  permissions,
  onRefresh,
}: Props) {
  const [createModal, setCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [exceptionCreateModal, setExceptionCreateModal] = useState(false);
  const [exceptionEditingId, setExceptionEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const [formDay, setFormDay] = useState(1);
  const [exFormDate, setExFormDate] = useState("");
  const [exFormType, setExFormType] = useState("OFF");
  const [exFormStart, setExFormStart] = useState("");
  const [exFormEnd, setExFormEnd] = useState("");
  const [exFormNote, setExFormNote] = useState("");
  const [formStart, setFormStart] = useState("09:00");
  const [formEnd, setFormEnd] = useState("17:00");
  const [formSlot, setFormSlot] = useState(15);
  const [formMaxSlots, setFormMaxSlots] = useState<number | "">("");

  const canManage = hasPerm(permissions, "clinic.schedule.manage");
  const templates = schedule?.templates ?? [];
  const exceptions = schedule?.exceptions ?? [];

  const handleCreate = useCallback(async () => {
    if (!canManage) return;
    setSaving(true);
    setError(null);
    try {
      await staffDoctorPostSchedule(branchId, memberId, {
        dayOfWeek: formDay,
        startTime: formStart,
        endTime: formEnd,
        slotMinutes: formSlot,
        maxSlots: formMaxSlots === "" ? undefined : Number(formMaxSlots),
      });
      onRefresh?.();
      setCreateModal(false);
      setFormDay(1);
      setFormStart("09:00");
      setFormEnd("17:00");
      setFormSlot(15);
      setFormMaxSlots("");
      toast.success("Schedule slot added");
    } catch (e: any) {
      setError(e?.message ?? "Failed to create");
      toast.error(e?.message ?? "Failed to create");
    } finally {
      setSaving(false);
    }
  }, [branchId, memberId, canManage, formDay, formStart, formEnd, formSlot, formMaxSlots, onRefresh]);

  const handleUpdate = useCallback(
    async (scheduleId: number, updates: { startTime?: string; endTime?: string; slotMinutes?: number; maxSlots?: number }) => {
      if (!canManage) return;
      setSaving(true);
      setError(null);
      try {
        await staffDoctorPutSchedule(branchId, memberId, scheduleId, updates);
        onRefresh?.();
        setEditingId(null);
        toast.success("Schedule updated");
      } catch (e: any) {
        setError(e?.message ?? "Failed to update");
        toast.error(e?.message ?? "Failed to update");
      } finally {
        setSaving(false);
      }
    },
    [branchId, memberId, canManage, onRefresh, toast]
  );

  const handleDelete = useCallback(
    async (scheduleId: number) => {
      if (!canManage || !confirm("Remove this schedule slot?")) return;
      setSaving(true);
      setError(null);
      try {
        await staffDoctorDeleteSchedule(branchId, memberId, scheduleId);
        onRefresh?.();
        setEditingId(null);
        toast.success("Schedule slot removed");
      } catch (e: any) {
        setError(e?.message ?? "Failed to delete");
        toast.error(e?.message ?? "Failed to delete");
      } finally {
        setSaving(false);
      }
    },
    [branchId, memberId, canManage, onRefresh, toast]
  );

  const handleExceptionCreate = useCallback(async () => {
    if (!canManage || !exFormDate.trim()) {
      toast.error("Select a date");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await staffDoctorPostScheduleException(branchId, memberId, {
        date: exFormDate,
        type: exFormType,
        startTime: exFormStart || undefined,
        endTime: exFormEnd || undefined,
        note: exFormNote || undefined,
      });
      onRefresh?.();
      setExceptionCreateModal(false);
      setExFormDate("");
      setExFormType("OFF");
      setExFormStart("");
      setExFormEnd("");
      setExFormNote("");
      toast.success("Date override added");
    } catch (e: any) {
      setError(e?.message ?? "Failed to create");
      toast.error(e?.message ?? "Failed to create");
    } finally {
      setSaving(false);
    }
  }, [branchId, memberId, canManage, exFormDate, exFormType, exFormStart, exFormEnd, exFormNote, onRefresh, toast]);

  const handleExceptionUpdate = useCallback(
    async (exceptionId: number, updates: { type?: string; startTime?: string; endTime?: string; note?: string }) => {
      if (!canManage) return;
      setSaving(true);
      setError(null);
      try {
        await staffDoctorPutScheduleException(branchId, memberId, exceptionId, updates);
        onRefresh?.();
        setExceptionEditingId(null);
        toast.success("Date override updated");
      } catch (e: any) {
        setError(e?.message ?? "Failed to update");
        toast.error(e?.message ?? "Failed to update");
      } finally {
        setSaving(false);
      }
    },
    [branchId, memberId, canManage, onRefresh, toast]
  );

  const handleExceptionDelete = useCallback(
    async (exceptionId: number) => {
      if (!canManage || !confirm("Remove this date override?")) return;
      setSaving(true);
      setError(null);
      try {
        await staffDoctorDeleteScheduleException(branchId, memberId, exceptionId);
        onRefresh?.();
        setExceptionEditingId(null);
        toast.success("Date override removed");
      } catch (e: any) {
        setError(e?.message ?? "Failed to delete");
        toast.error(e?.message ?? "Failed to delete");
      } finally {
        setSaving(false);
      }
    },
    [branchId, memberId, canManage, onRefresh, toast]
  );

  const byDay = templates.reduce((acc: Record<number, any[]>, t: any) => {
    const d = t.dayOfWeek;
    if (!acc[d]) acc[d] = [];
    acc[d].push(t);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="card radius-12">
        <div className="card-body text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="text-muted mt-2 mb-0">Loading schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="alert alert-danger alert-dismissible fade show radius-12 mb-3" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)} aria-label="Close" />
        </div>
      )}

      <div className="card radius-12 mb-3">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="mb-0">Weekly schedule</h6>
            {canManage && (
              <button type="button" className="btn btn-primary btn-sm radius-8" onClick={() => setCreateModal(true)}>
                Add slot
              </button>
            )}
          </div>

          {templates.length ? (
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Day</th>
                    <th>Time</th>
                    <th>Slot (min)</th>
                    <th>Max slots</th>
                    {canManage && <th className="text-end">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t: any) => (
                    <tr key={t.id}>
                      <td>{DAY_NAMES[t.dayOfWeek] ?? `Day ${t.dayOfWeek}`}</td>
                      <td>{t.startTime} – {t.endTime}</td>
                      <td>{t.slotMinutes ?? "—"}</td>
                      <td>{t.maxSlots ?? "—"}</td>
                      {canManage && (
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm radius-8 me-1"
                            onClick={() => setEditingId(editingId === t.id ? null : t.id)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm radius-8"
                            disabled={!!saving}
                            onClick={() => handleDelete(t.id)}
                          >
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4">
              <i className="ri-calendar-line fs-1 text-muted d-block mb-2" aria-hidden />
              <p className="text-muted mb-3">No schedule slots yet.</p>
              {canManage && (
                <button type="button" className="btn btn-primary radius-8" onClick={() => setCreateModal(true)}>
                  Add first slot
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card radius-12 mb-3">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="mb-0">Date overrides / exceptions</h6>
            {canManage && (
              <button
                type="button"
                className="btn btn-outline-primary btn-sm radius-8"
                onClick={() => setExceptionCreateModal(true)}
              >
                Add override
              </button>
            )}
          </div>
          {exceptions.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Time</th>
                    <th>Note</th>
                    {canManage && <th className="text-end">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {exceptions.map((ex: any) => (
                    <tr key={ex.id}>
                      <td>{ex.date ? new Date(ex.date).toLocaleDateString() : "—"}</td>
                      <td>
                        <span className="badge bg-secondary-subtle text-secondary-emphasis radius-8">
                          {EXCEPTION_TYPES.find((t) => t.value === ex.type)?.label ?? ex.type ?? "—"}
                        </span>
                      </td>
                      <td>{ex.startTime && ex.endTime ? `${ex.startTime} – ${ex.endTime}` : "—"}</td>
                      <td className="small">{ex.note ?? "—"}</td>
                      {canManage && (
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm radius-8 me-1"
                            onClick={() => setExceptionEditingId(ex.id)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm radius-8"
                            disabled={!!saving}
                            onClick={() => handleExceptionDelete(ex.id)}
                          >
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-3">
              <p className="text-muted small mb-0">No date overrides. Add blackout or custom availability.</p>
              {canManage && (
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm radius-8 mt-2"
                  onClick={() => setExceptionCreateModal(true)}
                >
                  Add override
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {exceptionCreateModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h6 className="modal-title">Add date override</h6>
                <button type="button" className="btn-close" onClick={() => setExceptionCreateModal(false)} aria-label="Close" />
              </div>
              <div className="modal-body">
                <div className="mb-2">
                  <label className="form-label small">Date</label>
                  <input type="date" className="form-control form-control-sm" value={exFormDate} onChange={(e) => setExFormDate(e.target.value)} required />
                </div>
                <div className="mb-2">
                  <label className="form-label small">Type</label>
                  <select className="form-select form-select-sm" value={exFormType} onChange={(e) => setExFormType(e.target.value)}>
                    {EXCEPTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label className="form-label small">Start time (optional)</label>
                    <input type="time" className="form-control form-control-sm" value={exFormStart} onChange={(e) => setExFormStart(e.target.value)} />
                  </div>
                  <div className="col-6">
                    <label className="form-label small">End time (optional)</label>
                    <input type="time" className="form-control form-control-sm" value={exFormEnd} onChange={(e) => setExFormEnd(e.target.value)} />
                  </div>
                </div>
                <div className="mb-2">
                  <label className="form-label small">Note (optional)</label>
                  <input type="text" className="form-control form-control-sm" value={exFormNote} onChange={(e) => setExFormNote(e.target.value)} placeholder="e.g. Conference" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary btn-sm radius-8" onClick={() => setExceptionCreateModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary btn-sm radius-8" disabled={saving} onClick={handleExceptionCreate}>{saving ? "..." : "Add"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {exceptionEditingId != null && (() => {
        const ex = exceptions.find((x: any) => x.id === exceptionEditingId);
        if (!ex) return null;
        return (
          <div className="modal show d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content radius-12">
                <div className="modal-header">
                  <h6 className="modal-title">Edit date override</h6>
                  <button type="button" className="btn-close" onClick={() => setExceptionEditingId(null)} aria-label="Close" />
                </div>
                <div className="modal-body">
                  <p className="small text-muted">{ex.date ? new Date(ex.date).toLocaleDateString() : "—"}</p>
                  <div className="mb-2">
                    <label className="form-label small">Type</label>
                    <select className="form-select form-select-sm" id="ex-edit-type" defaultValue={ex.type}>
                      {EXCEPTION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="row g-2 mb-2">
                    <div className="col-6">
                      <label className="form-label small">Start time</label>
                      <input type="time" className="form-control form-control-sm" id="ex-edit-start" defaultValue={ex.startTime ?? ""} />
                    </div>
                    <div className="col-6">
                      <label className="form-label small">End time</label>
                      <input type="time" className="form-control form-control-sm" id="ex-edit-end" defaultValue={ex.endTime ?? ""} />
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="form-label small">Note</label>
                    <input type="text" className="form-control form-control-sm" id="ex-edit-note" defaultValue={ex.note ?? ""} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary btn-sm radius-8" onClick={() => setExceptionEditingId(null)}>Cancel</button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm radius-8"
                    disabled={saving}
                    onClick={() => {
                      const type = (document.getElementById("ex-edit-type") as HTMLSelectElement)?.value;
                      const start = (document.getElementById("ex-edit-start") as HTMLInputElement)?.value ?? "";
                      const end = (document.getElementById("ex-edit-end") as HTMLInputElement)?.value ?? "";
                      const note = (document.getElementById("ex-edit-note") as HTMLInputElement)?.value ?? "";
                      handleExceptionUpdate(ex.id, { type, startTime: start || undefined, endTime: end || undefined, note: note || undefined });
                    }}
                  >
                    {saving ? "..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {createModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h6 className="modal-title">Add schedule slot</h6>
                <button type="button" className="btn-close" onClick={() => setCreateModal(false)} aria-label="Close" />
              </div>
              <div className="modal-body">
                <div className="mb-2">
                  <label className="form-label small">Day</label>
                  <select className="form-select form-select-sm" value={formDay} onChange={(e) => setFormDay(Number(e.target.value))}>
                    {DAY_NAMES.map((name, i) => (
                      <option key={i} value={i}>{name}</option>
                    ))}
                  </select>
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label className="form-label small">Start</label>
                    <input type="time" className="form-control form-control-sm" value={formStart} onChange={(e) => setFormStart(e.target.value)} />
                  </div>
                  <div className="col-6">
                    <label className="form-label small">End</label>
                    <input type="time" className="form-control form-control-sm" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} />
                  </div>
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label className="form-label small">Slot (min)</label>
                    <input type="number" className="form-control form-control-sm" value={formSlot} onChange={(e) => setFormSlot(Number(e.target.value) || 15)} min={5} max={120} />
                  </div>
                  <div className="col-6">
                    <label className="form-label small">Max slots (optional)</label>
                    <input type="number" className="form-control form-control-sm" value={formMaxSlots} onChange={(e) => setFormMaxSlots(e.target.value === "" ? "" : Number(e.target.value))} min={1} placeholder="—" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary btn-sm radius-8" onClick={() => setCreateModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary btn-sm radius-8" disabled={saving} onClick={handleCreate}>{saving ? "..." : "Add"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingId != null && (() => {
        const t = templates.find((x: any) => x.id === editingId);
        if (!t) return null;
        return (
          <div className="modal show d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content radius-12">
                <div className="modal-header">
                  <h6 className="modal-title">Edit schedule slot</h6>
                  <button type="button" className="btn-close" onClick={() => setEditingId(null)} aria-label="Close" />
                </div>
                <div className="modal-body">
                  <p className="small text-muted">{DAY_NAMES[t.dayOfWeek] ?? `Day ${t.dayOfWeek}`}</p>
                  <div className="row g-2 mb-2">
                    <div className="col-6">
                      <label className="form-label small">Start</label>
                      <input type="time" className="form-control form-control-sm" defaultValue={t.startTime} id="edit-start" />
                    </div>
                    <div className="col-6">
                      <label className="form-label small">End</label>
                      <input type="time" className="form-control form-control-sm" defaultValue={t.endTime} id="edit-end" />
                    </div>
                  </div>
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label small">Slot (min)</label>
                      <input type="number" className="form-control form-control-sm" defaultValue={t.slotMinutes} id="edit-slot" min={5} max={120} />
                    </div>
                    <div className="col-6">
                      <label className="form-label small">Max slots</label>
                      <input type="number" className="form-control form-control-sm" defaultValue={t.maxSlots ?? ""} id="edit-max" min={1} placeholder="—" />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary btn-sm radius-8" onClick={() => setEditingId(null)}>Cancel</button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm radius-8"
                    disabled={saving}
                    onClick={() => {
                      const start = (document.getElementById("edit-start") as HTMLInputElement)?.value ?? t.startTime;
                      const end = (document.getElementById("edit-end") as HTMLInputElement)?.value ?? t.endTime;
                      const slot = parseInt((document.getElementById("edit-slot") as HTMLInputElement)?.value ?? String(t.slotMinutes), 10) || t.slotMinutes;
                      const max = (document.getElementById("edit-max") as HTMLInputElement)?.value;
                      handleUpdate(t.id, { startTime: start, endTime: end, slotMinutes: slot, maxSlots: max ? Number(max) : undefined });
                    }}
                  >
                    {saving ? "..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
