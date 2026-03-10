"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  doctorGetMe,
  doctorGetMySchedule,
  doctorPutMySchedule,
  doctorGetMyExceptions,
  doctorCreateMyException,
  doctorDeleteMyException,
} from "@/lib/api";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DoctorSchedulePage() {
  const [profile, setProfile] = useState<{ branches: { branchId: number; branchName: string }[] } | null>(null);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [templates, setTemplates] = useState<Array<{ id?: number; dayOfWeek: number; startTime: string; endTime: string; slotMinutes?: number }>>([]);
  const [exceptions, setExceptions] = useState<Array<{ id: number; date: string; type: string; startTime?: string | null; endTime?: string | null; note?: string | null }>>([]);
  const [exceptionDraft, setExceptionDraft] = useState<{
    date: string;
    type: "OFF" | "EXTRA_SHIFT" | "CUSTOM_SLOTS" | "LEAVE" | "EMERGENCY_AVAILABLE";
    startTime: string;
    endTime: string;
    note: string;
  }>({
    date: new Date().toISOString().slice(0, 10),
    type: "LEAVE",
    startTime: "",
    endTime: "",
    note: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const p = await doctorGetMe();
        setProfile(p ?? null);
        if (p?.branches?.length && branchId === null) setBranchId(p.branches[0].branchId);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadSchedule = useCallback(async () => {
    if (branchId == null) return;
    setLoading(true);
    setError("");
    try {
      const list = await doctorGetMySchedule(branchId);
      setTemplates(Array.isArray(list) ? list.map((t: any) => ({
        id: t.id,
        dayOfWeek: t.dayOfWeek ?? 0,
        startTime: t.startTime ?? "09:00",
        endTime: t.endTime ?? "17:00",
        slotMinutes: t.slotMinutes ?? 15,
      })) : []);
      const ex = await doctorGetMyExceptions(branchId);
      setExceptions(Array.isArray(ex) ? ex : []);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load");
      setTemplates([]);
      setExceptions([]);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const addBlock = () => {
    setTemplates((prev) => [...prev, { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", slotMinutes: 15 }]);
  };

  const removeBlock = (idx: number) => {
    setTemplates((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateBlock = (idx: number, field: string, value: any) => {
    setTemplates((prev) => {
      const next = [...prev];
      if (next[idx]) (next[idx] as any)[field] = value;
      return next;
    });
  };

  const handleSave = async () => {
    if (branchId == null) return;
    setSaving(true);
    setError("");
    try {
      await doctorPutMySchedule(branchId, {
        templates: templates.map((t) => ({
          dayOfWeek: t.dayOfWeek,
          startTime: t.startTime,
          endTime: t.endTime,
          slotMinutes: t.slotMinutes ?? 15,
        })),
      });
      await loadSchedule();
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to save. Schedule may be managed by clinic only.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddException = async () => {
    if (branchId == null || !exceptionDraft.date) return;
    try {
      await doctorCreateMyException(branchId, {
        date: exceptionDraft.date,
        type: exceptionDraft.type,
        startTime: exceptionDraft.startTime || null,
        endTime: exceptionDraft.endTime || null,
        note: exceptionDraft.note || null,
      });
      const ex = await doctorGetMyExceptions(branchId);
      setExceptions(Array.isArray(ex) ? ex : []);
      setExceptionDraft((d) => ({ ...d, note: "", startTime: "", endTime: "" }));
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to add exception");
    }
  };

  const handleDeleteException = async (exceptionId: number) => {
    if (branchId == null) return;
    try {
      await doctorDeleteMyException(branchId, exceptionId);
      const ex = await doctorGetMyExceptions(branchId);
      setExceptions(Array.isArray(ex) ? ex : []);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to delete exception");
    }
  };

  if (!profile) {
    return (
      <div className="dashboard-main-body">
        <div className="card radius-12"><div className="card-body text-center py-5">Loading…</div></div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <h5 className="mb-0">My schedule</h5>
        <Link href="/doctor/dashboard" className="btn btn-sm btn-outline-secondary radius-12">Dashboard</Link>
      </div>

      {profile.branches?.length > 1 && (
        <div className="mb-3">
          <label className="form-label">Clinic</label>
          <select
            className="form-select w-auto"
            value={branchId ?? ""}
            onChange={(e) => setBranchId(Number(e.target.value))}
          >
            {profile.branches.map((b) => (
              <option key={b.branchId} value={b.branchId}>{b.branchName}</option>
            ))}
          </select>
        </div>
      )}

      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}

      {loading ? (
        <div className="card radius-12"><div className="card-body text-center py-5">Loading…</div></div>
      ) : (
        <>
          <div className="card radius-12 mb-3">
            <div className="card-body p-24">
              <p className="text-muted small mb-3">Add your weekly availability. Each block is one day and time range.</p>
              {templates.map((t, idx) => (
                <div key={idx} className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                  <select
                    className="form-select form-select-sm"
                    style={{ width: 100 }}
                    value={t.dayOfWeek}
                    onChange={(e) => updateBlock(idx, "dayOfWeek", parseInt(e.target.value, 10))}
                  >
                    {DAYS.map((d, i) => (
                      <option key={i} value={i}>{d}</option>
                    ))}
                  </select>
                  <input type="time" className="form-control form-control-sm" style={{ width: 100 }} value={t.startTime} onChange={(e) => updateBlock(idx, "startTime", e.target.value)} />
                  <span>–</span>
                  <input type="time" className="form-control form-control-sm" style={{ width: 100 }} value={t.endTime} onChange={(e) => updateBlock(idx, "endTime", e.target.value)} />
                  <input type="number" placeholder="Slot min" className="form-control form-control-sm" style={{ width: 80 }} value={t.slotMinutes ?? 15} onChange={(e) => updateBlock(idx, "slotMinutes", parseInt(e.target.value, 10) || 15)} />
                  <button type="button" className="btn btn-sm btn-outline-danger radius-12" onClick={() => removeBlock(idx)}>Remove</button>
                </div>
              ))}
              <button type="button" className="btn btn-outline-primary btn-sm radius-12 mb-3" onClick={addBlock}>+ Add block</button>
              <div>
                <button type="button" className="btn btn-primary radius-12" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : "Save schedule"}
                </button>
              </div>
            </div>
          </div>

          <div className="card radius-12">
            <div className="card-header">
              <h6 className="mb-0">Leave / Exceptions</h6>
            </div>
            <div className="card-body p-24">
              <div className="row g-2 align-items-end mb-3">
                <div className="col-md-2">
                  <label className="form-label small">Date</label>
                  <input type="date" className="form-control form-control-sm" value={exceptionDraft.date} onChange={(e) => setExceptionDraft((d) => ({ ...d, date: e.target.value }))} />
                </div>
                <div className="col-md-3">
                  <label className="form-label small">Type</label>
                  <select className="form-select form-select-sm" value={exceptionDraft.type} onChange={(e) => setExceptionDraft((d) => ({ ...d, type: e.target.value as any }))}>
                    <option value="OFF">OFF</option>
                    <option value="LEAVE">LEAVE</option>
                    <option value="EXTRA_SHIFT">EXTRA_SHIFT</option>
                    <option value="CUSTOM_SLOTS">CUSTOM_SLOTS</option>
                    <option value="EMERGENCY_AVAILABLE">EMERGENCY_AVAILABLE</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label small">Start</label>
                  <input type="time" className="form-control form-control-sm" value={exceptionDraft.startTime} onChange={(e) => setExceptionDraft((d) => ({ ...d, startTime: e.target.value }))} />
                </div>
                <div className="col-md-2">
                  <label className="form-label small">End</label>
                  <input type="time" className="form-control form-control-sm" value={exceptionDraft.endTime} onChange={(e) => setExceptionDraft((d) => ({ ...d, endTime: e.target.value }))} />
                </div>
                <div className="col-md-3">
                  <label className="form-label small">Note</label>
                  <input type="text" className="form-control form-control-sm" value={exceptionDraft.note} onChange={(e) => setExceptionDraft((d) => ({ ...d, note: e.target.value }))} />
                </div>
                <div className="col-md-12">
                  <button type="button" className="btn btn-sm btn-outline-primary radius-12" onClick={handleAddException}>
                    Add Exception
                  </button>
                </div>
              </div>

              {exceptions.length === 0 ? (
                <p className="small text-muted mb-0">No exceptions added.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Time</th>
                        <th>Note</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {exceptions.map((ex) => (
                        <tr key={ex.id}>
                          <td>{new Date(ex.date).toLocaleDateString()}</td>
                          <td>{ex.type}</td>
                          <td>{ex.startTime && ex.endTime ? `${ex.startTime}-${ex.endTime}` : "—"}</td>
                          <td>{ex.note ?? "—"}</td>
                          <td>
                            <button type="button" className="btn btn-sm btn-outline-danger radius-12" onClick={() => handleDeleteException(ex.id)}>
                              Delete
                            </button>
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
      )}
    </div>
  );
}
