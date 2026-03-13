"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  doctorGetAppointmentDetail,
  doctorCallAppointment,
  doctorStartConsult,
  doctorCompleteAppointment,
  doctorConfirmAppointment,
  doctorCancelAppointment,
  doctorRescheduleAppointment,
  doctorAddNote,
  doctorCreateFollowUp,
  doctorGetPatientHistory,
} from "@/lib/api";
import { PatientSnapshotCard } from "../_components/PatientSnapshotCard";
import { ClinicalAlerts } from "../_components/ClinicalAlerts";
import { ClinicalHistoryTimeline } from "../_components/ClinicalHistoryTimeline";
import { QuickActionBar } from "../_components/QuickActionBar";
import { FollowUpComposer } from "../_components/FollowUpComposer";
import { DoctorAppointmentStatusBadge } from "../_components/DoctorAppointmentStatusBadge";
import { DoctorPriorityBadge } from "../_components/DoctorPriorityBadge";
import { DoctorPaymentBadge } from "../_components/DoctorPaymentBadge";
import type { AppointmentDetailForSnapshot } from "../_components/PatientSnapshotCard";
import type { VisitItem } from "../_components/ClinicalHistoryTimeline";

export default function DoctorAppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id != null ? Number(params.id) : NaN;
  const [appointment, setAppointment] = useState<AppointmentDetailForSnapshot & { events?: { id: number; eventType?: string; createdAt?: string }[]; previousVisits?: unknown[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actioning, setActioning] = useState(false);
  const [history, setHistory] = useState<{ visits?: VisitItem[]; pet?: { vaccinations?: unknown[] } } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [noteText, setNoteText] = useState("");

  const loadAppointment = useCallback(async () => {
    if (!Number.isFinite(id)) return;
    setLoading(true);
    setError("");
    try {
      const data = await doctorGetAppointmentDetail(id);
      setAppointment(data ?? null);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load appointment");
      setAppointment(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadHistory = useCallback(() => {
    if (!appointment?.petId) return;
    setHistoryError(false);
    setHistoryLoading(true);
    doctorGetPatientHistory(appointment.petId)
      .then((data: unknown) => {
        setHistory((data as { visits?: VisitItem[]; pet?: { vaccinations?: unknown[] } }) ?? null);
        setHistoryError(false);
      })
      .catch(() => {
        setHistory(null);
        setHistoryError(true);
      })
      .finally(() => setHistoryLoading(false));
  }, [appointment?.petId]);

  useEffect(() => {
    loadAppointment();
  }, [loadAppointment]);

  useEffect(() => {
    if (appointment?.petId) loadHistory();
    else setHistory(null);
  }, [appointment?.petId, loadHistory]);

  const refresh = useCallback(() => {
    loadAppointment();
    if (appointment?.petId) loadHistory();
  }, [loadAppointment, loadHistory, appointment?.petId]);

  const handleCall = async () => {
    if (!Number.isFinite(id)) return;
    setActioning(true);
    try {
      await doctorCallAppointment(id);
      toast.success("Patient called");
      refresh();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Failed to call");
    } finally {
      setActioning(false);
    }
  };

  const handleStartConsult = async () => {
    if (!Number.isFinite(id)) return;
    setActioning(true);
    try {
      await doctorStartConsult(id);
      toast.success("Consultation started");
      refresh();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Failed to start");
    } finally {
      setActioning(false);
    }
  };

  const handleComplete = async () => {
    if (!Number.isFinite(id)) return;
    setActioning(true);
    try {
      await doctorCompleteAppointment(id);
      toast.success("Visit completed");
      refresh();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Failed to complete");
    } finally {
      setActioning(false);
    }
  };

  const handleConfirm = async () => {
    if (!Number.isFinite(id)) return;
    setActioning(true);
    try {
      await doctorConfirmAppointment(id);
      toast.success("Appointment confirmed");
      refresh();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Confirm failed");
    } finally {
      setActioning(false);
    }
  };

  const handleCancel = async (reason: string) => {
    if (!Number.isFinite(id)) return;
    setActioning(true);
    try {
      await doctorCancelAppointment(id, reason);
      toast.success("Appointment cancelled");
      router.push("/doctor/appointments");
    } catch (e) {
      toast.error((e as Error)?.message ?? "Cancel failed");
    } finally {
      setActioning(false);
    }
  };

  const handleReschedule = async (data: { scheduledStartAt: string; scheduledEndAt: string }) => {
    if (!Number.isFinite(id)) return;
    setActioning(true);
    try {
      await doctorRescheduleAppointment(id, data);
      toast.success("Appointment rescheduled");
      refresh();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Reschedule failed");
    } finally {
      setActioning(false);
    }
  };

  const handleAddNote = async () => {
    if (!Number.isFinite(id) || !noteText.trim()) return;
    try {
      await doctorAddNote(id, { noteType: "SOAP", contentJson: { note: noteText.trim() } });
      setNoteText("");
      toast.success("Note saved");
      refresh();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Failed to add note");
    }
  };

  const handleFollowUp = async (payload: { followUpDate: string; followUpNotes?: string; createAppointment?: boolean }) => {
    if (!Number.isFinite(id)) return;
    setActioning(true);
    try {
      await doctorCreateFollowUp(id, payload);
      toast.success("Follow-up set");
      refresh();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Failed to set follow-up");
    } finally {
      setActioning(false);
    }
  };

  if (!Number.isFinite(id)) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning">Invalid appointment ID.</div>
        <Link href="/doctor/appointments" className="btn btn-outline-primary btn-sm">
          Back to Appointments
        </Link>
      </div>
    );
  }

  if (loading && !appointment) {
    return (
      <div className="dashboard-main-body">
        <div className="placeholder-glow">
          <span className="placeholder col-3 d-block" style={{ height: 28 }} />
          <span className="placeholder col-12 d-block mt-3" style={{ height: 120 }} />
          <span className="placeholder col-12 d-block mt-2" style={{ height: 80 }} />
        </div>
      </div>
    );
  }

  if (error && !appointment) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-danger">{error}</div>
        <Link href="/doctor/appointments" className="btn btn-outline-primary btn-sm">
          Back to Appointments
        </Link>
      </div>
    );
  }

  const a = appointment;
  const status = a?.status ?? "";

  return (
    <div className="dashboard-main-body">
      {/* Breadcrumb & header */}
      <nav className="mb-3" aria-label="Breadcrumb">
        <ol className="breadcrumb mb-0 small">
          <li className="breadcrumb-item">
            <Link href="/doctor/appointments" className="text-decoration-none">
              Appointments
            </Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Appointment #{a?.id ?? id}
          </li>
        </ol>
      </nav>

      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
        <div>
          <h4 className="mb-1 fw-semibold">Appointment #{a?.id ?? id}</h4>
          <p className="text-muted small mb-0">
            {a?.scheduledStartAt
              ? new Date(a.scheduledStartAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : "—"}
            {a?.branch?.name && ` · ${a.branch.name}`}
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <DoctorAppointmentStatusBadge status={status} />
          <DoctorPriorityBadge priority={a?.priority} />
          <DoctorPaymentBadge paymentStatus={a?.paymentStatus} />
          <Link href="/doctor/appointments" className="btn btn-outline-secondary btn-sm">
            Back to list
          </Link>
        </div>
      </div>

      <div className="row g-3">
        {/* Left column: Patient & visit info, alerts, history */}
        <div className="col-lg-7">
          <div className="card radius-12 shadow-sm mb-3">
            <div className="card-header bg-transparent border-bottom py-2">
              <h6 className="mb-0 fw-semibold">Patient & Visit</h6>
            </div>
            <div className="card-body">
              <PatientSnapshotCard appointment={a as AppointmentDetailForSnapshot} />
            </div>
          </div>

          <div className="card radius-12 shadow-sm mb-3">
            <div className="card-header bg-transparent border-bottom py-2">
              <h6 className="mb-0 fw-semibold">Clinical Alerts</h6>
            </div>
            <div className="card-body">
              <ClinicalAlerts
                allergies={a?.pet?.allergies}
                healthDisorders={a?.pet?.healthDisorders}
                isEmergency={a?.priority === "EMERGENCY"}
                isRepeatVisit={Array.isArray(a?.previousVisits) && (a.previousVisits?.length ?? 0) > 0}
              />
              {!a?.pet?.allergies?.length && !a?.pet?.healthDisorders && a?.priority !== "EMERGENCY" && (!a?.previousVisits?.length ?? true) && (
                <p className="small text-muted mb-0">No clinical alerts.</p>
              )}
            </div>
          </div>

          <div className="card radius-12 shadow-sm mb-3">
            <div className="card-header bg-transparent border-bottom py-2">
              <h6 className="mb-0 fw-semibold">Visit Timeline</h6>
            </div>
            <div className="card-body">
              <ClinicalHistoryTimeline
                visits={history?.visits}
                pet={history?.pet}
                loading={historyLoading}
                error={historyError}
                onRetry={loadHistory}
              />
            </div>
          </div>
        </div>

        {/* Right column: Actions, notes, follow-up, events */}
        <div className="col-lg-5">
          <div className="card radius-12 shadow-sm mb-3">
            <div className="card-header bg-transparent border-bottom py-2">
              <h6 className="mb-0 fw-semibold">Quick Actions</h6>
            </div>
            <div className="card-body">
              <QuickActionBar
                status={status}
                appointmentId={id}
                scheduledStartAt={a?.scheduledStartAt}
                actioning={actioning}
                onCall={handleCall}
                onStartConsult={handleStartConsult}
                onComplete={handleComplete}
                onConfirm={handleConfirm}
                onReschedule={handleReschedule}
                onCancel={(_id, reason) => handleCancel(reason)}
                onRefresh={refresh}
              />
            </div>
          </div>

          <div className="card radius-12 shadow-sm mb-3">
            <div className="card-header bg-transparent border-bottom py-2">
              <h6 className="mb-0 fw-semibold">Add Note</h6>
            </div>
            <div className="card-body">
              <textarea
                className="form-control form-control-sm"
                rows={3}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Clinical note..."
              />
              <button
                type="button"
                className="btn btn-sm btn-primary mt-2"
                onClick={handleAddNote}
                disabled={!noteText.trim() || actioning}
              >
                Save Note
              </button>
            </div>
          </div>

          <div className="card radius-12 shadow-sm mb-3">
            <div className="card-header bg-transparent border-bottom py-2">
              <h6 className="mb-0 fw-semibold">Set Follow-up</h6>
            </div>
            <div className="card-body">
              <FollowUpComposer
                appointmentId={id}
                onFollowUp={handleFollowUp}
                onRefresh={refresh}
                disabled={actioning}
              />
            </div>
          </div>

          {Array.isArray(a?.events) && a.events.length > 0 && (
            <div className="card radius-12 shadow-sm mb-3">
              <div className="card-header bg-transparent border-bottom py-2">
                <h6 className="mb-0 fw-semibold">Activity</h6>
              </div>
              <div className="card-body">
                <ul className="list-unstyled small mb-0">
                  {[...a.events].reverse().map((ev) => (
                    <li key={ev.id} className="d-flex justify-content-between py-1 border-bottom border-bottom border-opacity-25">
                      <span className="text-muted">{ev.eventType ?? "—"}</span>
                      {ev.createdAt && (
                        <span className="text-secondary">{new Date(ev.createdAt).toLocaleString()}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
