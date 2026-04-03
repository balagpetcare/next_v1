"use client";

import { useState } from "react";
import { DoctorAppointmentStatusBadge } from "./DoctorAppointmentStatusBadge";
import { DoctorPriorityBadge, getPriorityRowBorderClass } from "./DoctorPriorityBadge";
import { DoctorPaymentBadge } from "./DoctorPaymentBadge";
import { formatVisitType, formatAppointmentType } from "@/src/lib/displayFormatters";
import { formatPetTaxonomyLine } from "@/lib/formatPetTaxonomy";
import { branchLocalToUTCISO, DEFAULT_CLINIC_TIMEZONE } from "@/lib/clinicScheduleTime";
import { PaginationBar } from "@/src/components/common/PaginationBar";

export interface AppointmentRow {
  id: number;
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
  tokenNo?: string | null;
  status: string;
  priority?: string | null;
  paymentStatus?: string | null;
  visitType?: string | null;
  appointmentType?: string | null;
  notes?: string | null;
  patient?: { profile?: { displayName?: string }; auth?: { phone?: string } };
  ownerNameSnapshot?: string | null;
  mobileSnapshot?: string | null;
  pet?: { name?: string; animalType?: { name?: string } };
  petNameSnapshot?: string | null;
  branch?: { name?: string };
  service?: { name?: string };
  visit?: { id?: number; completedAt?: string | null };
}

export interface DoctorAppointmentTableProps {
  appointments: AppointmentRow[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onCall: (id: number) => void;
  onStartConsult: (id: number) => void;
  onComplete: (id: number) => void;
  onReschedule: (id: number, data: { scheduledStartAt: string; scheduledEndAt: string }) => void;
  onCancel: (id: number, reason: string) => void;
  onOpenVisit?: (visitId: number) => void;
  actioningId: number | null;
  date: string;
  /** Branch timezone (e.g. Asia/Dhaka) so reschedule date+time is sent as UTC. Defaults to Asia/Dhaka. */
  branchTimezone?: string;
  total?: number;
  limit?: number;
  offset?: number;
  onPaginate?: (offset: number) => void;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function patientName(apt: AppointmentRow) {
  return apt?.patient?.profile?.displayName ?? apt?.ownerNameSnapshot ?? "—";
}
function petName(apt: AppointmentRow) {
  return apt?.pet?.name ?? apt?.petNameSnapshot ?? "—";
}
function phone(apt: AppointmentRow) {
  return apt?.patient?.auth?.phone ?? apt?.mobileSnapshot ?? "";
}
function branchName(apt: AppointmentRow) {
  return apt?.branch?.name ?? "—";
}
function serviceName(apt: AppointmentRow) {
  return apt?.service?.name ?? "—";
}
function complaintShort(apt: AppointmentRow) {
  const n = apt?.notes ?? "";
  return n.length > 40 ? n.slice(0, 40) + "…" : n || "—";
}

export function DoctorAppointmentTable({
  appointments,
  selectedId,
  onSelect,
  onCall,
  onStartConsult,
  onComplete,
  onReschedule,
  onCancel,
  onOpenVisit,
  actioningId,
  date,
  branchTimezone = DEFAULT_CLINIC_TIMEZONE,
  total = 0,
  limit = 50,
  offset = 0,
  onPaginate,
}: DoctorAppointmentTableProps) {
  const [rescheduleApt, setRescheduleApt] = useState<AppointmentRow | null>(null);
  const [cancelApt, setCancelApt] = useState<AppointmentRow | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleStart, setRescheduleStart] = useState("");
  const [rescheduleEnd, setRescheduleEnd] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const openReschedule = (apt: AppointmentRow) => {
    const d = apt.scheduledStartAt ? new Date(apt.scheduledStartAt) : new Date();
    const dateStr = d.toISOString().slice(0, 10);
    setRescheduleDate(dateStr);
    setRescheduleStart(apt.scheduledStartAt ? new Date(apt.scheduledStartAt).toTimeString().slice(0, 5) : "09:00");
    setRescheduleEnd(apt.scheduledEndAt ? new Date(apt.scheduledEndAt).toTimeString().slice(0, 5) : "09:15");
    setRescheduleApt(apt);
  };

  const submitReschedule = () => {
    if (!rescheduleApt || !rescheduleDate || !rescheduleStart || !rescheduleEnd) return;
    onReschedule(rescheduleApt.id, {
      scheduledStartAt: branchLocalToUTCISO(rescheduleDate, rescheduleStart, branchTimezone),
      scheduledEndAt: branchLocalToUTCISO(rescheduleDate, rescheduleEnd, branchTimezone),
    });
    setRescheduleApt(null);
  };

  const openCancel = (apt: AppointmentRow) => {
    setCancelReason("Cancelled by doctor");
    setCancelApt(apt);
  };

  const submitCancel = () => {
    if (!cancelApt) return;
    onCancel(cancelApt.id, cancelReason.trim() || "Cancelled by doctor");
    setCancelApt(null);
    setCancelReason("");
  };

  const totalPages = limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;
  const currentPage = limit > 0 ? Math.floor(offset / limit) + 1 : 1;
  const hasPagination = Boolean(onPaginate && limit > 0 && total > 0);

  return (
    <>
      <div className="table-responsive">
        <table className="table table-sm table-hover mb-0">
          <thead className="table-light sticky-top">
            <tr>
              <th>Ref</th>
              <th>Date</th>
              <th>Time</th>
              <th>Token</th>
              <th>Patient / Owner</th>
              <th>Pet</th>
              <th>Service</th>
              <th>Visit type</th>
              <th>Appt type</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Payment</th>
              <th>Branch</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((apt) => {
              const isToday =
                apt.scheduledStartAt &&
                new Date(apt.scheduledStartAt).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);
              const statusUpper = (apt.status ?? "").toString().toUpperCase();
              const isInConsult = statusUpper === "IN_CONSULT";
              const visitId = apt.visit != null && typeof apt.visit === "object" && "id" in apt.visit ? (apt.visit as { id?: number }).id : undefined;
              const canStart = visitId == null && ["BOOKED", "CONFIRMED", "CHECKED_IN", "IN_QUEUE", "CALLED"].includes(statusUpper);
              const isOverdue =
                apt.scheduledStartAt &&
                ["BOOKED", "CONFIRMED"].includes(apt.status) &&
                new Date(apt.scheduledStartAt).getTime() < Date.now();
              return (
                <tr
                  key={apt.id}
                  className={`${getPriorityRowBorderClass(apt.priority)} ${selectedId === apt.id ? "table-active" : ""} ${isInConsult ? "table-primary table-opacity-75" : ""} ${isOverdue ? "table-warning table-opacity-75" : ""}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => onSelect(apt.id)}
                >
                  <td className="small text-muted">{apt.id}</td>
                  <td>
                    {apt.scheduledStartAt ? (
                      <>
                        {formatDate(apt.scheduledStartAt)}
                        {isToday && <span className="d-block small text-primary">Today</span>}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{formatTime(apt.scheduledStartAt)}</td>
                  <td>{apt.tokenNo ?? "—"}</td>
                  <td>
                    <span className="d-block text-truncate" style={{ maxWidth: 120 }} title={patientName(apt)}>
                      {patientName(apt)}
                    </span>
                    {phone(apt) && (
                      <span className="d-block small text-muted text-truncate" style={{ maxWidth: 120 }} title={phone(apt)}>
                        {phone(apt)}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="d-block text-truncate" style={{ maxWidth: 100 }} title={petName(apt)}>
                      {petName(apt)}
                    </span>
                    {apt?.pet && (formatPetTaxonomyLine(apt.pet) || apt.pet.animalType?.name) && (
                      <span className="d-block small text-muted">{formatPetTaxonomyLine(apt.pet) || apt.pet.animalType?.name}</span>
                    )}
                  </td>
                  <td className="small text-truncate" style={{ maxWidth: 100 }} title={serviceName(apt)}>
                    {serviceName(apt)}
                  </td>
                  <td className="small">{formatVisitType(apt.visitType)}</td>
                  <td className="small">{formatAppointmentType(apt.appointmentType)}</td>
                  <td>
                    <DoctorAppointmentStatusBadge status={apt.status} />
                  </td>
                  <td>
                    <DoctorPriorityBadge priority={apt.priority} />
                  </td>
                  <td>
                    <DoctorPaymentBadge paymentStatus={apt.paymentStatus} />
                  </td>
                  <td className="small text-truncate" style={{ maxWidth: 100 }} title={branchName(apt)}>
                    {branchName(apt)}
                  </td>
                  <td className="text-end" onClick={(e) => e.stopPropagation()}>
                    {["IN_QUEUE", "CHECKED_IN"].includes(statusUpper) && (
                      <button
                        type="button"
                        className="btn btn-sm btn-info me-1"
                        disabled={actioningId === apt.id}
                        onClick={() => onCall(apt.id)}
                      >
                        Call
                      </button>
                    )}
                    {visitId != null && onOpenVisit && (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary me-1"
                        onClick={() => onOpenVisit(visitId)}
                      >
                        Open Visit
                      </button>
                    )}
                    {canStart && (
                      <button
                        type="button"
                        className="btn btn-sm btn-success me-1"
                        disabled={actioningId === apt.id}
                        onClick={() => onStartConsult(apt.id)}
                      >
                        Start
                      </button>
                    )}
                    {statusUpper === "IN_CONSULT" && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary me-1"
                        disabled={actioningId === apt.id}
                        onClick={() => onComplete(apt.id)}
                      >
                        Complete
                      </button>
                    )}
                    {["BOOKED", "CONFIRMED"].includes(statusUpper) && (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-warning me-1"
                          disabled={actioningId === apt.id}
                          onClick={() => openReschedule(apt)}
                        >
                          Reschedule
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger me-1"
                          disabled={actioningId === apt.id}
                          onClick={() => openCancel(apt)}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => onSelect(apt.id)}>
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasPagination && (
        <PaginationBar
          page={currentPage}
          pageSize={limit}
          total={total}
          totalPages={totalPages}
          disabled={false}
          onPageChange={(p) => onPaginate!((p - 1) * limit)}
          className="mt-2 pt-2 border-top"
          ariaLabel="Appointments pages"
        />
      )}

      {/* Reschedule modal */}
      {rescheduleApt && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">Reschedule appointment #{rescheduleApt.id}</h6>
                <button type="button" className="btn-close" onClick={() => setRescheduleApt(null)} aria-label="Close" />
              </div>
              <div className="modal-body">
                <div className="mb-2">
                  <label className="form-label small">Date</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label small">Start time (HH:mm)</label>
                  <input
                    type="time"
                    className="form-control form-control-sm"
                    value={rescheduleStart}
                    onChange={(e) => setRescheduleStart(e.target.value)}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label small">End time (HH:mm)</label>
                  <input
                    type="time"
                    className="form-control form-control-sm"
                    value={rescheduleEnd}
                    onChange={(e) => setRescheduleEnd(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setRescheduleApt(null)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-sm btn-primary" onClick={submitReschedule}>
                  Reschedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {cancelApt && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">Cancel appointment #{cancelApt.id}</h6>
                <button type="button" className="btn-close" onClick={() => setCancelApt(null)} aria-label="Close" />
              </div>
              <div className="modal-body">
                <label className="form-label small">Reason</label>
                <textarea
                  className="form-control form-control-sm"
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Cancelled by doctor"
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setCancelApt(null)}>
                  Close
                </button>
                <button type="button" className="btn btn-sm btn-danger" onClick={submitCancel}>
                  Cancel appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
