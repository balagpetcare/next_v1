"use client";

import { useEffect, useState } from "react";
import { staffClinicDoctors, staffClinicAppointmentAssignDoctor } from "@/lib/api";

export default function AssignDoctorModal({ branchId, appointment, onClose, onSuccess, onRefreshList }) {
  const [doctors, setDoctors] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const isAppointmentNotFound = error && (String(error).toLowerCase().includes("appointment not found") || String(error).toLowerCase().includes("appointment or pet not found"));
  useEffect(() => {
    if (!branchId) return;
    staffClinicDoctors(branchId).then((d) => setDoctors(Array.isArray(d) ? d : []));
  }, [branchId]);
  async function handleAssign() {
    if (isAppointmentNotFound) return;
    if (!selectedId) { setError("Select a doctor"); return; }
    setSubmitting(true);
    setError("");
    try {
      await staffClinicAppointmentAssignDoctor(branchId, appointment.id, Number(selectedId));
      onSuccess();
    } catch (e) {
      setError(e?.message || "Assign failed");
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="modal d-block bg-dark bg-opacity-50" tabIndex={-1}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Assign doctor — appointment #{appointment?.id}</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
          </div>
          <div className="modal-body">
            {error && (
              <div className="alert alert-danger py-2">
                {isAppointmentNotFound ? (
                  <>
                    This appointment could not be found (it may have been removed or is not available in this branch). Close and refresh the list to see current data.
                    {typeof onRefreshList === "function" && (
                      <div className="mt-2">
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { onRefreshList(); setError(""); }}>Refresh list</button>
                      </div>
                    )}
                  </>
                ) : (
                  error
                )}
              </div>
            )}
            {!isAppointmentNotFound && (
              <>
                <p className="small">Patient: {appointment?.patient?.profile?.displayName ?? "—"} | Service: {appointment?.service?.name ?? "—"}</p>
                <div className="mb-3">
                  <label className="form-label">Select doctor</label>
                  <select className="form-select" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                    <option value="">—</option>
                    {doctors.map((d) => <option key={d.id} value={d.id}>{d.displayName}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>{isAppointmentNotFound ? "Close" : "Cancel"}</button>
            {!isAppointmentNotFound && (
              <button type="button" className="btn btn-primary" onClick={handleAssign} disabled={submitting}>{submitting ? "…" : "Assign"}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
