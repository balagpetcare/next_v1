"use client";

import { DoctorAppointmentStatusBadge } from "./DoctorAppointmentStatusBadge";
import { DoctorPriorityBadge, getPriorityRowBorderClass } from "./DoctorPriorityBadge";
import { DoctorPaymentBadge } from "./DoctorPaymentBadge";

export interface AppointmentRow {
  id: number;
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
  tokenNo?: string | null;
  status: string;
  priority?: string | null;
  paymentStatus?: string | null;
  visitType?: string | null;
  notes?: string | null;
  patient?: { profile?: { displayName?: string }; auth?: { phone?: string } };
  ownerNameSnapshot?: string | null;
  mobileSnapshot?: string | null;
  pet?: { name?: string; animalType?: { name?: string } };
  petNameSnapshot?: string | null;
  branch?: { name?: string };
  service?: { name?: string };
  visit?: { completedAt?: string | null };
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
  actioningId: number | null;
  date: string;
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
function completedAt(apt: AppointmentRow) {
  const at = apt?.visit?.completedAt;
  return at ? new Date(at).toLocaleDateString() : "—";
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
  actioningId,
  date,
}: DoctorAppointmentTableProps) {
  return (
    <div className="table-responsive">
      <table className="table table-sm table-hover mb-0">
        <thead className="table-light sticky-top">
          <tr>
            <th>Time</th>
            <th>Token</th>
            <th>Pet</th>
            <th>Owner</th>
            <th>Clinic</th>
            <th>Complaint</th>
            <th>Visit</th>
            <th>Priority</th>
            <th>Payment</th>
            <th>Status</th>
            <th>Completed</th>
            <th className="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((apt) => (
            <tr
              key={apt.id}
              className={`${getPriorityRowBorderClass(apt.priority)} ${selectedId === apt.id ? "table-active" : ""}`}
              style={{ cursor: "pointer" }}
              onClick={() => onSelect(apt.id)}
            >
              <td>
                {apt.scheduledStartAt
                  ? new Date(apt.scheduledStartAt).toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" })
                  : "—"}
              </td>
              <td>{apt.tokenNo ?? "—"}</td>
              <td>
                {petName(apt)}
                {apt?.pet?.animalType?.name && (
                  <span className="d-block small text-muted">{apt.pet.animalType.name}</span>
                )}
              </td>
              <td>
                {patientName(apt)}
                {phone(apt) && <span className="d-block small text-muted">{phone(apt)}</span>}
              </td>
              <td>{branchName(apt)}</td>
              <td className="small text-muted">{complaintShort(apt)}</td>
              <td>{apt.visitType ?? "—"}</td>
              <td>
                <DoctorPriorityBadge priority={apt.priority} />
              </td>
              <td>
                <DoctorPaymentBadge paymentStatus={apt.paymentStatus} />
              </td>
              <td>
                <DoctorAppointmentStatusBadge status={apt.status} />
              </td>
              <td className="small">{completedAt(apt)}</td>
              <td className="text-end" onClick={(e) => e.stopPropagation()}>
                {["IN_QUEUE", "CHECKED_IN"].includes(apt.status) && (
                  <button
                    type="button"
                    className="btn btn-sm btn-info me-1"
                    disabled={actioningId === apt.id}
                    onClick={() => onCall(apt.id)}
                  >
                    Call
                  </button>
                )}
                {apt.status === "CALLED" && (
                  <button
                    type="button"
                    className="btn btn-sm btn-success me-1"
                    disabled={actioningId === apt.id}
                    onClick={() => onStartConsult(apt.id)}
                  >
                    Start
                  </button>
                )}
                {apt.status === "IN_CONSULT" && (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary me-1"
                    disabled={actioningId === apt.id}
                    onClick={() => onComplete(apt.id)}
                  >
                    Complete
                  </button>
                )}
                {["BOOKED", "CONFIRMED"].includes(apt.status) && (
                  <>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-warning me-1"
                      disabled={actioningId === apt.id}
                      onClick={() => {
                        const start = prompt(
                          "New start (HH:mm)",
                          apt.scheduledStartAt ? new Date(apt.scheduledStartAt).toTimeString().slice(0, 5) : "09:00"
                        );
                        const end = prompt(
                          "New end (HH:mm)",
                          apt.scheduledEndAt ? new Date(apt.scheduledEndAt).toTimeString().slice(0, 5) : "09:15"
                        );
                        if (start != null && end != null)
                          onReschedule(apt.id, {
                            scheduledStartAt: `${date}T${start}:00.000Z`,
                            scheduledEndAt: `${date}T${end}:00.000Z`,
                          });
                      }}
                    >
                      Reschedule
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger me-1"
                      disabled={actioningId === apt.id}
                      onClick={() => confirm("Cancel?") && onCancel(apt.id, "Cancelled by doctor")}
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
