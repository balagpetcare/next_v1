"use client";

import { useState } from "react";
import Link from "next/link";
import ActionDropdown from "./ActionDropdown";

export default function QueueTicketsTable({
  branchId,
  tickets,
  onSkip,
  onStart,
  onComplete,
  onAssignDoctor,
  onSetPriority,
  onRecall,
  onNoShow,
  onCancel,
  doctors,
  services,
  actioning,
}) {
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDoctor, setFilterDoctor] = useState("");

  const statuses = ["WAITING", "CALLED", "IN_SERVICE", "COMPLETED", "SKIPPED"];
  
  const filtered = tickets.filter((t) => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterDoctor && t.doctorId !== Number(filterDoctor)) return false;
    return true;
  });

  const calculateWaitTime = (ticket) => {
    if (!ticket.checkInAt && !ticket.calledAt) return "—";
    const start = ticket.calledAt ? new Date(ticket.calledAt) : new Date(ticket.checkInAt);
    const now = new Date();
    const diffMs = now - start;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "<1min";
    if (diffMins < 60) return `${diffMins}min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const TICKET_STATUS_BADGES = {
    CREATED: "secondary",
    WAITING: "info",
    CALLED: "warning",
    IN_SERVICE: "primary",
    COMPLETED: "success",
    DONE: "success",
    SKIPPED: "dark",
  };

  const getSecondaryActions = (ticket, status) => {
    const actions = [];

    // WAITING
    if (status === "WAITING") {
      if (onAssignDoctor && doctors.length > 0) {
        actions.push({
          label: "Assign Doctor",
          icon: "👨‍⚕️",
          onClick: () => {
            const doctorList = doctors.map((d, i) => `${i + 1}. ${d.user?.profile?.displayName || `Doctor ${d.id}`} (ID: ${d.id})`).join("\n");
            const choice = prompt(`Select doctor:\n${doctorList}\n\nEnter doctor ID:`);
            if (choice) onAssignDoctor(ticket.id, Number(choice));
          },
        });
      }
      if (onSetPriority) {
        actions.push({
          label: "Set Priority",
          icon: "🏷️",
          onClick: () => {
            const priority = prompt("Priority (NORMAL/EMERGENCY/FOLLOWUP):");
            if (priority) onSetPriority(ticket.id, priority.toUpperCase());
          },
        });
      }
      if (onCancel) {
        actions.push({ divider: true });
        actions.push({
          label: "Cancel Ticket",
          icon: "❌",
          danger: true,
          onClick: () => {
            if (confirm("Cancel this ticket?")) onCancel(ticket.id);
          },
        });
      }
    }

    // CALLED
    if (status === "CALLED") {
      if (onRecall) {
        actions.push({
          label: "Recall (Return to Waiting)",
          icon: "↩️",
          onClick: () => onRecall(ticket.id),
        });
      }
      if (onNoShow) {
        actions.push({
          label: "Mark No-Show",
          icon: "🚫",
          danger: true,
          onClick: () => {
            if (confirm("Mark this patient as no-show?")) onNoShow(ticket.id);
          },
        });
      }
      if (onCancel) {
        actions.push({ divider: true });
        actions.push({
          label: "Cancel Ticket",
          icon: "❌",
          danger: true,
          onClick: () => {
            if (confirm("Cancel this ticket?")) onCancel(ticket.id);
          },
        });
      }
    }

    // IN_SERVICE
    if (status === "IN_SERVICE") {
      if (ticket.visitId) {
        actions.push({
          label: "Open Visit",
          icon: "🏥",
          onClick: () => {
            window.location.href = `/staff/branch/${branchId}/clinic/visits/${ticket.visitId}`;
          },
        });
      } else if (ticket.appointmentId) {
        actions.push({
          label: "Open Intake",
          icon: "📋",
          onClick: () => {
            window.location.href = `/staff/branch/${branchId}/clinic/intake/${ticket.appointmentId}`;
          },
        });
      }
      if (onAssignDoctor && doctors.length > 0) {
        actions.push({
          label: "Transfer Doctor",
          icon: "🔄",
          onClick: () => {
            const doctorList = doctors.map((d, i) => `${i + 1}. ${d.user?.profile?.displayName || `Doctor ${d.id}`} (ID: ${d.id})`).join("\n");
            const choice = prompt(`Transfer to doctor:\n${doctorList}\n\nEnter doctor ID:`);
            if (choice) onAssignDoctor(ticket.id, Number(choice));
          },
        });
      }
      if (onCancel) {
        actions.push({ divider: true });
        actions.push({
          label: "Cancel Ticket",
          icon: "❌",
          danger: true,
          onClick: () => {
            if (confirm("Cancel this ticket?")) onCancel(ticket.id);
          },
        });
      }
    }

    // COMPLETED/DONE
    if (status === "COMPLETED" || status === "DONE") {
      if (ticket.appointmentId) {
        actions.push({
          label: "View Appointment",
          icon: "👁️",
          onClick: () => {
            window.location.href = `/staff/branch/${branchId}/clinic/intake/${ticket.appointmentId}`;
          },
        });
      }
    }

    return actions;
  };

  return (
    <div>
      <div className="d-flex gap-2 mb-3 flex-wrap">
        <select
          className="form-select form-select-sm"
          style={{ width: "150px" }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          className="form-select form-select-sm"
          style={{ width: "150px" }}
          value={filterDoctor}
          onChange={(e) => setFilterDoctor(e.target.value)}
        >
          <option value="">All Doctors</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.user?.profile?.displayName || `Doctor ${d.id}`}
            </option>
          ))}
        </select>
      </div>

      <div className="table-responsive">
        <table className="table table-bordered table-hover align-middle table-sm">
          <thead>
            <tr>
              <th>Token</th>
              <th>Status</th>
              <th>Patient / Pet</th>
              <th>Doctor</th>
              <th>Service</th>
              <th>Source</th>
              <th>Intake</th>
              <th>Flags</th>
              <th>Wait</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center text-muted py-4">
                  No tickets.
                </td>
              </tr>
            )}
            {filtered.map((t) => {
              const status = t.status || "CREATED";
              const badge = TICKET_STATUS_BADGES[status] || "secondary";
              const doctorName = t.doctor?.user?.profile?.displayName ?? "—";
              const serviceName = t.appointment?.service?.name ?? "—";
              const intakeStatus = t.appointment?.intakeStatus ?? "NOT_STARTED";
              const intakeBadge = 
                intakeStatus === "COMPLETE" ? "success" : 
                intakeStatus === "PARTIAL" ? "warning" : 
                "secondary";
              const rf = t.appointment?.intake?.riskFlagsJson && typeof t.appointment.intake.riskFlagsJson === "object" ? t.appointment.intake.riskFlagsJson : {};
              const isEmergency = !!rf.isEmergency;
              const isAggressive = !!rf.isAggressive;
              const isInfectious = !!rf.infectiousSuspicion;
              const pendingVitals = t.appointment?.intake && (t.appointment.intake.weightKg == null && t.appointment.intake.tempC == null);
              const source = t.appointmentId ? "Scheduled" : "Walk-in";
              const patientName = t.appointment?.patient?.user?.profile?.displayName || "Walk-in";
              const petName = t.appointment?.pet?.name || t.pet?.name || "—";
              const species = t.appointment?.pet?.species || t.pet?.species || "";
              const waitTime = calculateWaitTime(t);

              return (
                <tr key={t.id}>
                  <td>
                    <strong>{t.tokenNo ?? t.id}</strong>
                    {t.priorityTag === "EMERGENCY" && (
                      <span className="ms-1 badge bg-danger text-white" title="Emergency">!</span>
                    )}
                    {t.priorityTag === "FOLLOWUP" && (
                      <span className="ms-1 badge bg-info text-white" title="Follow-up">F</span>
                    )}
                    {pendingVitals && (
                      <span className="ms-1 badge bg-warning text-dark" title="Vitals not recorded">V?</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge bg-${badge} radius-12`}>{status}</span>
                  </td>
                  <td>
                    {patientName}
                    <br />
                    <small className="text-muted">
                      {petName} {species && `(${species})`}
                    </small>
                  </td>
                  <td>
                    {doctorName}
                    {status === "WAITING" && onAssignDoctor && (
                      <button
                        type="button"
                        className="btn btn-sm btn-link p-0 ms-1"
                        onClick={() => {
                          const newDoctorId = prompt("Enter doctor ID:");
                          if (newDoctorId) onAssignDoctor(t.id, Number(newDoctorId));
                        }}
                        title="Assign doctor"
                      >
                        ✏️
                      </button>
                    )}
                  </td>
                  <td>{serviceName}</td>
                  <td>
                    <span className={`badge ${source === "Scheduled" ? "bg-secondary" : "bg-info"} radius-12`}>
                      {source}
                    </span>
                  </td>
                  <td>
                    <span className={`badge bg-${intakeBadge} radius-12`}>
                      {intakeStatus === "COMPLETE" ? "Complete" : intakeStatus === "PARTIAL" ? "Partial" : "—"}
                    </span>
                    {t.appointmentId && (
                      <Link href={`/staff/branch/${branchId}/clinic/intake/${t.appointmentId}`} className="ms-1 small">
                        Fill
                      </Link>
                    )}
                  </td>
                  <td>
                    {isEmergency && <span className="badge bg-danger me-1 radius-12">Emergency</span>}
                    {isAggressive && <span className="badge bg-warning text-dark me-1 radius-12">Aggressive</span>}
                    {isInfectious && <span className="badge bg-secondary me-1 radius-12">Infectious?</span>}
                    {!isEmergency && !isAggressive && !isInfectious && "—"}
                  </td>
                  <td>{waitTime}</td>
                  <td className="text-end">
                    <div className="d-flex gap-1 justify-content-end align-items-center">
                      {/* Primary Action */}
                      {status === "WAITING" && onSkip && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => onSkip(t.id)}
                          disabled={!!actioning}
                          title="Skip"
                        >
                          Skip
                        </button>
                      )}
                      {status === "CALLED" && onStart && (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => onStart(t.id)}
                          disabled={!!actioning}
                        >
                          {actioning === t.id ? "..." : "Start"}
                        </button>
                      )}
                      {status === "IN_SERVICE" && onComplete && (
                        <button
                          type="button"
                          className="btn btn-sm btn-success"
                          onClick={() => onComplete(t.id)}
                          disabled={!!actioning}
                        >
                          {actioning === t.id ? "..." : "Complete"}
                        </button>
                      )}
                      {(status === "COMPLETED" || status === "DONE") && t.appointmentId && (
                        <Link
                          href={`/staff/branch/${branchId}/clinic/intake/${t.appointmentId}`}
                          className="btn btn-sm btn-outline-secondary"
                        >
                          View
                        </Link>
                      )}

                      {/* Secondary Actions Dropdown */}
                      {getSecondaryActions(t, status).length > 0 && (
                        <ActionDropdown
                          actions={getSecondaryActions(t, status)}
                          disabled={!!actioning}
                          label="⋮"
                        />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
