"use client";

import { DoctorAppointmentStatusBadge } from "./DoctorAppointmentStatusBadge";
import { DoctorPriorityBadge, getPriorityRowBorderClass } from "./DoctorPriorityBadge";
import { DoctorPaymentBadge } from "./DoctorPaymentBadge";

export interface AppointmentCardItem {
  id: number;
  scheduledStartAt?: string | null;
  tokenNo?: string | null;
  status: string;
  priority?: string | null;
  paymentStatus?: string | null;
  notes?: string | null;
  patient?: { profile?: { displayName?: string }; auth?: { phone?: string } };
  ownerNameSnapshot?: string | null;
  mobileSnapshot?: string | null;
  pet?: { name?: string; animalType?: { name?: string } };
  petNameSnapshot?: string | null;
  branch?: { name?: string };
  service?: { name?: string };
}

export interface DoctorAppointmentCardProps {
  appointment: AppointmentCardItem;
  onSelect: () => void;
  onCall: () => void;
  onStartConsult: () => void;
  onComplete: () => void;
  actioning: boolean;
}

function patientName(apt: AppointmentCardItem) {
  return apt?.patient?.profile?.displayName ?? apt?.ownerNameSnapshot ?? "—";
}
function petName(apt: AppointmentCardItem) {
  return apt?.pet?.name ?? apt?.petNameSnapshot ?? "—";
}
function branchName(apt: AppointmentCardItem) {
  return apt?.branch?.name ?? "—";
}
function serviceName(apt: AppointmentCardItem) {
  return apt?.service?.name ?? "—";
}
function complaintShort(apt: AppointmentCardItem) {
  const n = apt?.notes ?? "";
  return n.length > 50 ? n.slice(0, 50) + "…" : n || "—";
}

export function DoctorAppointmentCard({
  appointment: apt,
  onSelect,
  onCall,
  onStartConsult,
  onComplete,
  actioning,
}: DoctorAppointmentCardProps) {
  const borderClass = getPriorityRowBorderClass(apt.priority);

  return (
    <div
      className={`card border-0 border-bottom rounded-0 p-3 ${borderClass ? `border-start border-danger border-3` : ""}`}
      style={{ cursor: "pointer" }}
      onClick={onSelect}
    >
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <strong>
            {apt.scheduledStartAt
              ? new Date(apt.scheduledStartAt).toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" })
              : "—"}
          </strong>
          <span className="badge bg-secondary ms-2">Token {apt.tokenNo ?? "—"}</span>
          <DoctorAppointmentStatusBadge status={apt.status} className="ms-1" />
          <DoctorPriorityBadge priority={apt.priority} className="ms-1" />
        </div>
        <span className="d-flex gap-1" onClick={(e) => e.stopPropagation()}>
          {["IN_QUEUE", "CHECKED_IN"].includes(apt.status) && (
            <button type="button" className="btn btn-sm btn-info" disabled={actioning} onClick={onCall}>
              Call
            </button>
          )}
          {apt.status === "CALLED" && (
            <button type="button" className="btn btn-sm btn-success" disabled={actioning} onClick={onStartConsult}>
              Start
            </button>
          )}
          {apt.status === "IN_CONSULT" && (
            <button type="button" className="btn btn-sm btn-primary" disabled={actioning} onClick={onComplete}>
              Complete
            </button>
          )}
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onSelect}>
            View
          </button>
        </span>
      </div>
      <div className="small text-muted mt-1">{branchName(apt)}</div>
      <div className="mt-1">
        {patientName(apt)} — {petName(apt)}
      </div>
      <div className="small">{serviceName(apt)}</div>
      {complaintShort(apt) !== "—" && (
        <div className="small text-muted mt-1">Reason: {complaintShort(apt)}</div>
      )}
      <div className="mt-1">
        <DoctorPaymentBadge paymentStatus={apt.paymentStatus} className="me-1" />
      </div>
    </div>
  );
}
