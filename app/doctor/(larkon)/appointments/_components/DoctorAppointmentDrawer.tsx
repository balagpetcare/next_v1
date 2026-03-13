"use client";

import { useEffect, useState, useCallback } from "react";
import { PatientSnapshotCard } from "./PatientSnapshotCard";
import { ClinicalAlerts } from "./ClinicalAlerts";
import { ClinicalHistoryTimeline } from "./ClinicalHistoryTimeline";
import { QuickActionBar } from "./QuickActionBar";
import { FollowUpComposer } from "./FollowUpComposer";
import type { AppointmentDetailForSnapshot } from "./PatientSnapshotCard";
import type { VisitItem } from "./ClinicalHistoryTimeline";
import { doctorGetPatientHistory } from "@/lib/api";

export interface DoctorAppointmentDrawerProps {
  show: boolean;
  onClose: () => void;
  appointmentId: number | null;
  appointment: any;
  loading: boolean;
  onRefresh: () => void;
  onCall: (id: number) => Promise<void>;
  onStartConsult: (id: number) => Promise<void>;
  onComplete: (id: number) => Promise<void>;
  onConfirm?: (id: number) => Promise<void>;
  onCancel: (id: number, reason: string) => Promise<void>;
  onReschedule: (id: number, data: { scheduledStartAt: string; scheduledEndAt: string }) => Promise<void>;
  onAddNote: (id: number, body: { noteType?: string; contentJson?: Record<string, unknown> }) => Promise<void>;
  onFollowUp: (id: number, body: { followUpDate: string; followUpNotes?: string; createAppointment?: boolean }) => Promise<void>;
  actioningId: number | null;
}

export function DoctorAppointmentDrawer({
  show,
  onClose,
  appointmentId,
  appointment,
  loading,
  onRefresh,
  onCall,
  onStartConsult,
  onComplete,
  onConfirm,
  onCancel,
  onReschedule,
  onAddNote,
  onFollowUp,
  actioningId,
}: DoctorAppointmentDrawerProps) {
  const [history, setHistory] = useState<{ visits?: VisitItem[]; pet?: { vaccinations?: unknown[] } } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [noteText, setNoteText] = useState("");

  const loadHistory = useCallback(() => {
    if (!appointment?.petId) return;
    setHistoryError(false);
    setHistoryLoading(true);
    doctorGetPatientHistory(appointment.petId)
      .then((data: any) => {
        setHistory(data);
        setHistoryError(false);
      })
      .catch(() => {
        setHistory(null);
        setHistoryError(true);
      })
      .finally(() => setHistoryLoading(false));
  }, [appointment?.petId]);

  useEffect(() => {
    if (show && appointment?.petId) {
      loadHistory();
    } else {
      setHistory(null);
      setHistoryError(false);
    }
  }, [show, appointment?.petId, loadHistory]);

  const handleAddNote = async () => {
    if (!appointmentId || !noteText.trim()) return;
    await onAddNote(appointmentId, { noteType: "SOAP", contentJson: { note: noteText.trim() } });
    setNoteText("");
    onRefresh();
  };

  if (!show) return null;

  const a = appointment as AppointmentDetailForSnapshot & { events?: { id: number; eventType?: string; createdAt?: string }[] };
  const status = a?.status ?? "";

  return (
    <>
      {show && (
        <div
          className="offcanvas-backdrop fade show"
          style={{ zIndex: 1040 }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div
        className={`offcanvas offcanvas-end ${show ? "show" : ""}`}
        tabIndex={-1}
        style={{ visibility: show ? "visible" : "hidden", width: 480, zIndex: 1045 }}
        aria-modal="true"
      >
        <div className="offcanvas-header border-bottom">
          <h5 className="offcanvas-title">Appointment #{a?.id ?? "—"}</h5>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
        </div>
        <div className="offcanvas-body overflow-auto">
          {loading ? (
            <div className="placeholder-glow">
              <span className="placeholder col-12 d-block" />
              <span className="placeholder col-8 d-block mt-2" />
              <span className="placeholder col-10 d-block mt-2" />
            </div>
          ) : !a ? (
            <p className="text-muted">No data</p>
          ) : (
            <>
              <PatientSnapshotCard appointment={a} />
              <ClinicalAlerts
                allergies={a?.pet?.allergies}
                healthDisorders={a?.pet?.healthDisorders}
                isEmergency={a?.priority === "EMERGENCY"}
                isRepeatVisit={Array.isArray(a?.previousVisits) && (a.previousVisits as unknown[]).length > 0}
              />
              <ClinicalHistoryTimeline
                visits={history?.visits}
                pet={history?.pet}
                loading={historyLoading}
                error={historyError}
                onRetry={loadHistory}
              />
              <div className="mb-3">
                <h6 className="text-secondary border-bottom pb-1 mb-2">Quick Actions</h6>
                <QuickActionBar
                  status={status}
                  appointmentId={appointmentId}
                  scheduledStartAt={a?.scheduledStartAt}
                  actioning={actioningId === appointmentId}
                  onCall={onCall}
                  onStartConsult={onStartConsult}
                  onComplete={onComplete}
                  onConfirm={onConfirm}
                  onReschedule={onReschedule}
                  onCancel={onCancel}
                  onRefresh={onRefresh}
                />
                <div className="mb-2">
                  <label className="form-label small">Add note</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={2}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Clinical note..."
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary mt-1"
                    onClick={handleAddNote}
                    disabled={!noteText.trim()}
                  >
                    Save Note
                  </button>
                </div>
                <FollowUpComposer
                  appointmentId={appointmentId}
                  onFollowUp={(payload) => appointmentId && onFollowUp(appointmentId, payload)}
                  onRefresh={onRefresh}
                  disabled={actioningId === appointmentId}
                />
              </div>
              <div className="mb-3">
                <h6 className="text-secondary border-bottom pb-1 mb-2">Timeline</h6>
                {Array.isArray(a?.events) && a.events.length > 0 ? (
                  <ul className="list-unstyled small">
                    {[...a.events].reverse().map((ev: { id: number; eventType?: string; createdAt?: string }) => (
                      <li key={ev.id} className="mb-1">
                        <span className="text-muted">{ev.eventType}</span>
                        {ev.createdAt && (
                          <span className="ms-2 text-secondary">
                            {new Date(ev.createdAt).toLocaleString()}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="small text-muted">No events</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
