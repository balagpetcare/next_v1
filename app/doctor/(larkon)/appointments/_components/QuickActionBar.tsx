"use client";

import { useState } from "react";
import { branchLocalToUTCISO, DEFAULT_CLINIC_TIMEZONE } from "@/lib/clinicScheduleTime";

export interface QuickActionBarProps {
  status: string;
  appointmentId: number | null;
  scheduledStartAt?: string | null;
  /** Branch timezone (e.g. Asia/Dhaka) so reschedule time is sent as UTC. Defaults to Asia/Dhaka. */
  branchTimezone?: string;
  actioning: boolean;
  onCall: (id: number) => void;
  onStartConsult: (id: number) => void;
  onComplete: (id: number) => void;
  onConfirm?: (id: number) => void;
  onReschedule: (id: number, data: { scheduledStartAt: string; scheduledEndAt: string }) => void;
  onCancel: (id: number, reason: string) => void;
  onRefresh?: () => void;
  /** When IN_CONSULT and visit exists, show Open Visit to go to treatment workspace */
  visitId?: number | null;
  onOpenVisit?: (visitId: number) => void;
}

export function QuickActionBar({
  status,
  appointmentId,
  scheduledStartAt,
  branchTimezone = DEFAULT_CLINIC_TIMEZONE,
  actioning,
  onCall,
  onStartConsult,
  onComplete,
  onConfirm,
  onReschedule,
  onCancel,
  onRefresh,
  visitId,
  onOpenVisit,
}: QuickActionBarProps) {
  const [showReschedule, setShowReschedule] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("Cancelled by doctor");
  const [rescheduleDate, setRescheduleDate] = useState(
    scheduledStartAt ? new Date(scheduledStartAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [rescheduleStart, setRescheduleStart] = useState(
    scheduledStartAt ? new Date(scheduledStartAt).toTimeString().slice(0, 5) : "09:00"
  );
  const [rescheduleEnd, setRescheduleEnd] = useState(
    scheduledStartAt ? new Date(scheduledStartAt).toTimeString().slice(0, 5) : "09:15"
  );

  if (!appointmentId) return null;

  const statusUpper = (status ?? "").toUpperCase();

  // CALL is only valid from IN_QUEUE (state machine: CALL: [IN_QUEUE] → CALLED)
  const canCallPatient = statusUpper === "IN_QUEUE";
  // Start consultation only after being CALLED; also allow from IN_QUEUE (auto-calls first)
  const canStartTreatment = visitId == null && ["IN_QUEUE", "CALLED"].includes(statusUpper);

  const handleRescheduleSubmit = () => {
    if (!rescheduleStart || !rescheduleEnd) return;
    onReschedule(appointmentId, {
      scheduledStartAt: branchLocalToUTCISO(rescheduleDate, rescheduleStart, branchTimezone),
      scheduledEndAt: branchLocalToUTCISO(rescheduleDate, rescheduleEnd, branchTimezone),
    });
    setShowReschedule(false);
    onRefresh?.();
  };

  const handleCancelSubmit = () => {
    onCancel(appointmentId, cancelReason || "Cancelled by doctor");
    setShowCancel(false);
    onRefresh?.();
  };

  return (
    <div className="mb-2">
      <div className="d-flex flex-wrap gap-1">
        {statusUpper === "BOOKED" && onConfirm && (
          <button
            type="button"
            className="btn btn-sm btn-success"
            disabled={actioning}
            onClick={() => onConfirm(appointmentId)}
          >
            Confirm
          </button>
        )}

        {/* CHECKED_IN: patient is waiting; staff must call from queue console */}
        {statusUpper === "CHECKED_IN" && (
          <span className="badge bg-warning text-dark align-self-center px-2 py-1">
            Waiting — call from Queue Console
          </span>
        )}

        {/* CALL only valid from IN_QUEUE per state machine */}
        {canCallPatient && (
          <button
            type="button"
            className="btn btn-sm btn-info"
            disabled={actioning}
            onClick={() => onCall(appointmentId)}
          >
            {actioning ? "Calling…" : "Call Patient"}
          </button>
        )}

        {visitId != null && onOpenVisit && (
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => onOpenVisit(visitId)}
          >
            Open Visit
          </button>
        )}

        {canStartTreatment && (
          <button
            type="button"
            className="btn btn-sm btn-success"
            disabled={actioning}
            onClick={() => onStartConsult(appointmentId)}
          >
            {actioning ? "Starting…" : "Start Consultation"}
          </button>
        )}

        {statusUpper === "IN_CONSULT" && (
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            disabled={actioning}
            onClick={() => onComplete(appointmentId)}
          >
            {actioning ? "Completing…" : "Complete Visit"}
          </button>
        )}

        {["BOOKED", "CONFIRMED"].includes(statusUpper) && (
          <>
            <button
              type="button"
              className="btn btn-sm btn-outline-warning"
              onClick={() => { setShowReschedule(!showReschedule); setShowCancel(false); }}
            >
              Reschedule
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              disabled={actioning}
              onClick={() => { setShowCancel(!showCancel); setShowReschedule(false); }}
            >
              Cancel
            </button>
          </>
        )}
      </div>

      {/* Inline reschedule form — replaces browser prompt() */}
      {showReschedule && (
        <div className="card card-body p-2 mt-2 border-warning">
          <div className="row g-2 align-items-end">
            <div className="col-auto">
              <label className="form-label form-label-sm mb-0">Date</label>
              <input type="date" className="form-control form-control-sm" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} />
            </div>
            <div className="col-auto">
              <label className="form-label form-label-sm mb-0">Start</label>
              <input type="time" className="form-control form-control-sm" value={rescheduleStart} onChange={e => setRescheduleStart(e.target.value)} />
            </div>
            <div className="col-auto">
              <label className="form-label form-label-sm mb-0">End</label>
              <input type="time" className="form-control form-control-sm" value={rescheduleEnd} onChange={e => setRescheduleEnd(e.target.value)} />
            </div>
            <div className="col-auto d-flex gap-1">
              <button type="button" className="btn btn-sm btn-warning" onClick={handleRescheduleSubmit}>Confirm Reschedule</button>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowReschedule(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Inline cancel form — replaces browser confirm() */}
      {showCancel && (
        <div className="card card-body p-2 mt-2 border-danger">
          <div className="row g-2 align-items-end">
            <div className="col">
              <label className="form-label form-label-sm mb-0">Cancellation reason</label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation"
              />
            </div>
            <div className="col-auto d-flex gap-1">
              <button type="button" className="btn btn-sm btn-danger" disabled={actioning} onClick={handleCancelSubmit}>Confirm Cancel</button>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowCancel(false)}>Back</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
