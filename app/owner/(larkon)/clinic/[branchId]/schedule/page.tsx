"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ownerClinicScheduleTemplates,
  ownerClinicScheduleTemplatesPut,
  ownerClinicStaff,
  ownerClinicHolidays,
  ownerClinicHolidayCreate,
  ownerClinicHolidayDelete,
  ownerClinicEmergencyPolicy,
  ownerClinicEmergencyPolicyPut,
  type BranchHolidayRow,
  type EmergencyPolicy,
  type DoctorScheduleTemplateRow,
  type RoomScheduleTemplateRow,
} from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ClinicSchedulePage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const [templates, setTemplates] = useState<{
    doctorTemplates: DoctorScheduleTemplateRow[];
    roomTemplates: RoomScheduleTemplateRow[];
  } | null>(null);
  const [holidays, setHolidays] = useState<BranchHolidayRow[]>([]);
  const [emergency, setEmergency] = useState<EmergencyPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayName, setNewHolidayName] = useState("");
  const [addingHoliday, setAddingHoliday] = useState(false);
  const [emergencyForm, setEmergencyForm] = useState({ enabled: false, reservedSlotsPerDay: "0", allowedHours: "" });
  const [savingEmergency, setSavingEmergency] = useState(false);
  const [staff, setStaff] = useState<{ id: number; displayName?: string; staffType?: string }[]>([]);
  const [doctorRows, setDoctorRows] = useState<DoctorScheduleTemplateRow[]>([]);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [newRow, setNewRow] = useState({ branchMemberId: "", dayOfWeek: 0, startTime: "09:00", endTime: "17:00", slotMinutes: 15 });

  const load = async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      setError("");
      const [t, h, e, s] = await Promise.all([
        ownerClinicScheduleTemplates(branchId),
        ownerClinicHolidays(branchId),
        ownerClinicEmergencyPolicy(branchId),
        ownerClinicStaff(branchId),
      ]);
      setTemplates(t ?? { doctorTemplates: [], roomTemplates: [] });
      setHolidays(Array.isArray(h) ? h : []);
      setEmergency(e ?? null);
      setEmergencyForm({
        enabled: e?.enabled ?? false,
        reservedSlotsPerDay: e?.reservedSlotsPerDay != null ? String(e.reservedSlotsPerDay) : "0",
        allowedHours: e?.allowedHours ?? "",
      });
      const rawMembers = (s?.members as { id: number; user?: { profile?: { displayName?: string } }; profileSummary?: { staffType?: string } }[]) ?? [];
      setStaff(
        rawMembers.map((m) => ({
          id: m.id,
          displayName: m.user?.profile?.displayName ?? m.profileSummary?.staffType ?? `Staff #${m.id}`,
          staffType: m.profileSummary?.staffType,
        }))
      );
      const dt = t?.doctorTemplates ?? [];
      setDoctorRows(
        dt.map((x) => ({
          ...x,
          startTime: x.startTime ?? "09:00",
          endTime: x.endTime ?? "17:00",
          slotMinutes: x.slotMinutes ?? 15,
          status: x.status ?? "ACTIVE",
        }))
      );
    } catch (err) {
      setError((err as Error)?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [branchId]);

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId || !newHolidayDate.trim()) return;
    try {
      setAddingHoliday(true);
      setError("");
      await ownerClinicHolidayCreate(branchId, { date: newHolidayDate.trim(), name: newHolidayName.trim() || undefined });
      setSuccess("Holiday added.");
      setNewHolidayDate("");
      setNewHolidayName("");
      load();
    } catch (err) {
      setError((err as Error)?.message || "Failed to add holiday");
    } finally {
      setAddingHoliday(false);
    }
  };

  const handleDeleteHoliday = async (id: number) => {
    if (!branchId || !confirm("Remove this holiday?")) return;
    try {
      setError("");
      await ownerClinicHolidayDelete(branchId, id);
      setSuccess("Holiday removed.");
      load();
    } catch (err) {
      setError((err as Error)?.message || "Failed to delete");
    }
  };

  const handleSaveEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) return;
    try {
      setSavingEmergency(true);
      setError("");
      await ownerClinicEmergencyPolicyPut(branchId, {
        enabled: emergencyForm.enabled,
        reservedSlotsPerDay: parseInt(emergencyForm.reservedSlotsPerDay, 10) || 0,
        allowedHours: emergencyForm.allowedHours.trim() || null,
      });
      setSuccess("Emergency policy saved.");
      load();
    } catch (err) {
      setError((err as Error)?.message || "Failed to save");
    } finally {
      setSavingEmergency(false);
    }
  };

  const addDoctorRow = () => {
    const id = parseInt(newRow.branchMemberId, 10);
    if (!Number.isFinite(id)) return;
    setDoctorRows((r) => [
      ...r,
      {
        id: 0,
        branchMemberId: id,
        dayOfWeek: newRow.dayOfWeek,
        startTime: newRow.startTime,
        endTime: newRow.endTime,
        slotMinutes: newRow.slotMinutes,
        status: "ACTIVE",
      },
    ]);
    setNewRow({ ...newRow, branchMemberId: "" });
  };

  const removeDoctorRow = (index: number) => {
    setDoctorRows((r) => r.filter((_, i) => i !== index));
  };

  const saveDoctorSchedule = async () => {
    if (!branchId || !templates) return;
    try {
      setSavingSchedule(true);
      setError("");
      await ownerClinicScheduleTemplatesPut(branchId, {
        doctorTemplates: doctorRows.map((r) => ({
          ...r,
          slotMinutes: r.slotMinutes ?? 15,
        })),
        roomTemplates: templates.roomTemplates ?? [],
      });
      setSuccess("Doctor schedule saved.");
      load();
    } catch (err) {
      setError((err as Error)?.message || "Failed to save schedule");
    } finally {
      setSavingSchedule(false);
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
        title="Clinic schedule"
        subtitle={`Branch #${branchId}`}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Schedule", href: `/owner/clinic/${branchId}/schedule` },
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

      <div className="d-flex flex-wrap gap-2 mb-3">
        <Link href={`/owner/clinic/${branchId}/schedule-proposals`} className="btn btn-outline-primary btn-sm radius-12">
          <i className="ri-calendar-todo-line me-1" />
          Review schedule proposals
        </Link>
      </div>

      {loading ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status" />
          </div>
        </div>
      ) : (
        <>
          <div className="card radius-12 mb-4">
            <div className="card-body p-24">
              <h6 className="mb-3">Doctor schedule templates</h6>
              <p className="text-muted small mb-3">
                Set weekly slots per doctor. Appointments can be booked only within these slots.
              </p>
              <div className="table-responsive mb-3">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Doctor</th>
                      <th>Day</th>
                      <th>Start</th>
                      <th>End</th>
                      <th>Slot (min)</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctorRows.map((r, i) => (
                      <tr key={i}>
                        <td>{staff.find((s) => s.id === r.branchMemberId)?.displayName ?? `#${r.branchMemberId}`}</td>
                        <td>{DAY_NAMES[r.dayOfWeek]}</td>
                        <td>{r.startTime}</td>
                        <td>{r.endTime}</td>
                        <td>{r.slotMinutes}</td>
                        <td>
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeDoctorRow(i)}>Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="d-flex flex-wrap gap-2 align-items-end mb-3">
                <select
                  className="form-select form-select-sm"
                  style={{ width: "auto", minWidth: 140 }}
                  value={newRow.branchMemberId}
                  onChange={(e) => setNewRow((r) => ({ ...r, branchMemberId: e.target.value }))}
                >
                  <option value="">Select doctor</option>
                  {staff.map((m) => (
                    <option key={m.id} value={String(m.id)}>{m.displayName ?? `Staff #${m.id}`}</option>
                  ))}
                </select>
                <select
                  className="form-select form-select-sm"
                  style={{ width: "auto" }}
                  value={newRow.dayOfWeek}
                  onChange={(e) => setNewRow((r) => ({ ...r, dayOfWeek: parseInt(e.target.value, 10) }))}
                >
                  {DAY_NAMES.map((d, i) => (
                    <option key={i} value={i}>{d}</option>
                  ))}
                </select>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="09:00"
                  value={newRow.startTime}
                  onChange={(e) => setNewRow((r) => ({ ...r, startTime: e.target.value }))}
                  style={{ width: 80 }}
                />
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="17:00"
                  value={newRow.endTime}
                  onChange={(e) => setNewRow((r) => ({ ...r, endTime: e.target.value }))}
                  style={{ width: 80 }}
                />
                <input
                  type="number"
                  className="form-control form-control-sm"
                  min={5}
                  max={60}
                  value={newRow.slotMinutes}
                  onChange={(e) => setNewRow((r) => ({ ...r, slotMinutes: parseInt(e.target.value, 10) || 15 }))}
                  style={{ width: 70 }}
                />
                <button type="button" className="btn btn-sm btn-outline-primary" onClick={addDoctorRow} disabled={!newRow.branchMemberId}>
                  Add row
                </button>
              </div>
              <button type="button" className="btn btn-primary radius-12" onClick={saveDoctorSchedule} disabled={savingSchedule}>
                {savingSchedule ? "Saving..." : "Save doctor schedule"}
              </button>
              {templates && templates.roomTemplates.length > 0 && (
                <div className="mt-4 pt-3 border-top">
                  <strong>Room templates</strong>
                  <ul className="list-unstyled small mt-1">
                    {templates.roomTemplates.map((rt) => (
                      <li key={rt.id}>
                        {rt.branchRoom?.name ?? `Room #${rt.branchRoomId}`} — {DAY_NAMES[rt.dayOfWeek]} {rt.startTime}-{rt.endTime}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="card radius-12 mb-4">
            <div className="card-body p-24">
              <h6 className="mb-3">Holidays</h6>
              <form onSubmit={handleAddHoliday} className="d-flex flex-wrap gap-2 mb-3">
                <input
                  type="date"
                  className="form-control radius-12"
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                  required
                />
                <input
                  type="text"
                  className="form-control radius-12"
                  placeholder="Name (optional)"
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                />
                <button type="submit" className="btn btn-primary radius-12" disabled={addingHoliday}>
                  {addingHoliday ? "Adding..." : "Add"}
                </button>
              </form>
              <div className="table-responsive">
                <table className="table table-sm table-hover">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Name</th>
                      <th>Closed</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {holidays.map((h) => (
                      <tr key={h.id}>
                        <td>{typeof h.date === "string" ? h.date.slice(0, 10) : String(h.date).slice(0, 10)}</td>
                        <td>{h.name ?? "—"}</td>
                        <td>{h.isClosed ? "Yes" : "No"}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger radius-12"
                            onClick={() => handleDeleteHoliday(h.id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {holidays.length === 0 && <p className="text-muted small mb-0">No holidays configured.</p>}
            </div>
          </div>

          <div className="card radius-12">
            <div className="card-body p-24">
              <h6 className="mb-3">Emergency slot policy</h6>
              <form onSubmit={handleSaveEmergency}>
                <div className="row g-3">
                  <div className="col-md-4">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={emergencyForm.enabled}
                        onChange={(e) => setEmergencyForm((f) => ({ ...f, enabled: e.target.checked }))}
                      />
                      <label className="form-check-label">Enabled</label>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Reserved slots per day</label>
                    <input
                      type="number"
                      className="form-control radius-12"
                      value={emergencyForm.reservedSlotsPerDay}
                      onChange={(e) => setEmergencyForm((f) => ({ ...f, reservedSlotsPerDay: e.target.value }))}
                      min={0}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Allowed hours (optional)</label>
                    <input
                      type="text"
                      className="form-control radius-12"
                      value={emergencyForm.allowedHours}
                      onChange={(e) => setEmergencyForm((f) => ({ ...f, allowedHours: e.target.value }))}
                      placeholder="e.g. 09:00-17:00"
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary radius-12 mt-3" disabled={savingEmergency}>
                  {savingEmergency ? "Saving..." : "Save policy"}
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
