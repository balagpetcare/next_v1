"use client";

import { useState } from "react";
import { staffDoctorPostLeave } from "@/lib/api";
import { useToast } from "@/src/hooks/useToast";

type Props = {
  branchId: string;
  memberId: number;
  leave: any[];
  loading?: boolean;
  permissions: string[];
  onRefresh?: () => void;
};

const LEAVE_TYPES = ["FULL_DAY", "HALF_DAY", "EMERGENCY", "HOLIDAY_EXEMPTION"];

function hasPerm(permissions: string[], perm: string): boolean {
  return permissions.includes(perm);
}

export default function LeaveTab({
  branchId,
  memberId,
  leave,
  loading,
  permissions,
  onRefresh,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState("FULL_DAY");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formReason, setFormReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const canManage = hasPerm(permissions, "clinic.doctors.manage_leave");

  const handleSubmit = async () => {
    if (!formStart || !formEnd) {
      setError("Select start and end dates");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await staffDoctorPostLeave(branchId, memberId, {
        leaveType: formType,
        startDate: formStart,
        endDate: formEnd,
        reason: formReason || undefined,
      });
      onRefresh?.();
      setShowForm(false);
      setFormStart("");
      setFormEnd("");
      setFormReason("");
      toast.success("Leave request submitted");
    } catch (e: any) {
      setError(e?.message ?? "Failed to create leave");
      toast.error(e?.message ?? "Failed to create leave");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card radius-12">
        <div className="card-body text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="text-muted mt-2 mb-0">Loading leave...</p>
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
            <h6 className="mb-0">Leave &amp; availability</h6>
            {canManage && (
              <button type="button" className="btn btn-primary btn-sm radius-8" onClick={() => setShowForm(true)}>
                Add leave
              </button>
            )}
          </div>

          {leave.some((l: any) => l.affectedAppointmentsCount > 0) && (
            <div className="alert alert-warning radius-12 mb-3 small">
              <i className="ri-alert-line me-1" aria-hidden />
              Some leave periods have existing appointments. Consider rescheduling or cancelling them.
            </div>
          )}
          {leave.length ? (
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Type</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Affected appointments</th>
                  </tr>
                </thead>
                <tbody>
                  {leave.map((l: any) => (
                    <tr key={l.id}>
                      <td><span className="badge bg-secondary-subtle text-secondary-emphasis radius-8">{l.leaveType}</span></td>
                      <td>{l.startDate ? new Date(l.startDate).toLocaleDateString() : "—"}</td>
                      <td>{l.endDate ? new Date(l.endDate).toLocaleDateString() : "—"}</td>
                      <td>{l.reason ?? "—"}</td>
                      <td><span className={`badge radius-8 ${l.status === "APPROVED" ? "bg-success-subtle text-success-emphasis" : l.status === "REJECTED" ? "bg-danger-subtle text-danger-emphasis" : "bg-warning-subtle text-warning-emphasis"}`}>{l.status}</span></td>
                      <td>
                        {l.affectedAppointmentsCount != null && l.affectedAppointmentsCount > 0 ? (
                          <span className="text-warning-emphasis" title="Appointments in this period may need reschedule or cancellation">
                            {l.affectedAppointmentsCount} appointment{l.affectedAppointmentsCount !== 1 ? "s" : ""}
                          </span>
                        ) : (
                          l.affectedAppointmentsCount === 0 ? "0" : "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4">
              <i className="ri-calendar-event-line fs-1 text-muted d-block mb-2" aria-hidden />
              <p className="text-muted mb-3">No leave requests.</p>
              {canManage && (
                <button type="button" className="btn btn-primary radius-8" onClick={() => setShowForm(true)}>
                  Add leave
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="modal show d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h6 className="modal-title">Add leave</h6>
                <button type="button" className="btn-close" onClick={() => setShowForm(false)} aria-label="Close" />
              </div>
              <div className="modal-body">
                <div className="mb-2">
                  <label className="form-label small">Type</label>
                  <select className="form-select form-select-sm" value={formType} onChange={(e) => setFormType(e.target.value)}>
                    {LEAVE_TYPES.map((t) => (
                      <option key={t} value={t}>{t.replace("_", " ")}</option>
                    ))}
                  </select>
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label className="form-label small">Start date</label>
                    <input type="date" className="form-control form-control-sm" value={formStart} onChange={(e) => setFormStart(e.target.value)} />
                  </div>
                  <div className="col-6">
                    <label className="form-label small">End date</label>
                    <input type="date" className="form-control form-control-sm" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} />
                  </div>
                </div>
                <div className="mb-2">
                  <label className="form-label small">Reason (optional)</label>
                  <input type="text" className="form-control form-control-sm" value={formReason} onChange={(e) => setFormReason(e.target.value)} placeholder="Reason" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary btn-sm radius-8" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="button" className="btn btn-primary btn-sm radius-8" disabled={saving} onClick={handleSubmit}>{saving ? "..." : "Submit"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
