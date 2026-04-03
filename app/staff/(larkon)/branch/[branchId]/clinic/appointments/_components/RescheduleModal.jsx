"use client";

import { useEffect, useState } from "react";
import { staffClinicDoctors, staffClinicSlots } from "@/lib/api";

function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function RescheduleModal({ branchId, appointment, onClose, onSuccess }) {
  const [doctors, setDoctors] = useState([]);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [date, setDate] = useState(() => todayYMD());
  const [doctorId, setDoctorId] = useState(appointment?.doctorId ?? "");
  const [slotStart, setSlotStart] = useState("");
  const [slotEnd, setSlotEnd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!branchId) return;
    staffClinicDoctors(branchId).then((d) => setDoctors(Array.isArray(d) ? d : []));
  }, [branchId]);

  useEffect(() => {
    if (!date || !branchId) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    staffClinicSlots(branchId, {
      date,
      doctorId: doctorId ? Number(doctorId) : undefined,
    })
      .then((s) => setSlots(Array.isArray(s) ? s : []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [branchId, date, doctorId]);

  const isTodayReschedule = date === todayYMD();
  const now = new Date();
  const slotsFilteredReschedule = isTodayReschedule
    ? slots.filter((s) => s.end && new Date(s.end) > now)
    : slots;

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (!slotStart || !slotEnd) {
      setFormError("Please select a time slot.");
      return;
    }
    setSubmitting(true);
    try {
      await onSuccess({
        scheduledStartAt: slotStart,
        scheduledEndAt: slotEnd,
        doctorId: doctorId ? Number(doctorId) : undefined,
      });
    } catch (_) {
      // Error shown by parent
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal d-block bg-dark bg-opacity-50" tabIndex={-1}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Reschedule appointment #{appointment?.id}</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {formError && <div className="alert alert-danger py-2">{formError}</div>}
              <div className="mb-3">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setSlotStart("");
                    setSlotEnd("");
                  }}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Doctor (optional)</label>
                <select
                  className="form-select"
                  value={doctorId}
                  onChange={(e) => {
                    setDoctorId(e.target.value);
                    setSlotStart("");
                    setSlotEnd("");
                  }}
                >
                  <option value="">Any</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Time slot</label>
                {slotsLoading ? (
                  <p className="text-muted small">Loading slots…</p>
                ) : (
                  <select
                    className="form-select"
                    value={slotStart && slotsFilteredReschedule.some((s) => s.start && new Date(s.start).toISOString() === slotStart) ? slotStart : ""}
                    onChange={(e) => {
                      const iso = e.target.value;
                      const s = slotsFilteredReschedule.find((x) => x.start && new Date(x.start).toISOString() === iso);
                      if (s?.start != null && s?.end != null) {
                        setSlotStart(new Date(s.start).toISOString());
                        setSlotEnd(new Date(s.end).toISOString());
                      }
                    }}
                  >
                    <option value="">Select</option>
                    {slotsFilteredReschedule.map((s) => {
                      const iso = s.start ? new Date(s.start).toISOString() : "";
                      return (
                        <option key={iso || "s"} value={iso}>
                          {s.start && new Date(s.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {" – "}
                          {s.end && new Date(s.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "…" : "Reschedule"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
