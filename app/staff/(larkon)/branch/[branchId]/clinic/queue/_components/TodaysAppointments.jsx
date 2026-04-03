"use client";

import { useState } from "react";
import Link from "next/link";
import ActionDropdown from "./ActionDropdown";

export default function TodaysAppointments({ 
  branchId, 
  appointments, 
  tickets, 
  onCheckIn,
  onCancel,
  onNoShow,
  onReschedule,
  loading, 
  actioning 
}) {
  const [filterDoctor, setFilterDoctor] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const doctors = [...new Set(appointments.map((a) => a.doctor?.user?.profile?.displayName).filter(Boolean))];
  const statuses = [...new Set(appointments.map((a) => a.status).filter(Boolean))];

  const filtered = appointments.filter((apt) => {
    if (filterDoctor && apt.doctor?.user?.profile?.displayName !== filterDoctor) return false;
    if (filterStatus && apt.status !== filterStatus) return false;
    return true;
  });

  const getQueueToken = (appointmentId) => {
    const ticket = tickets.find((t) => t.appointmentId === appointmentId);
    return ticket?.tokenNo || null;
  };

  const canCheckIn = (status) => {
    return ["BOOKED", "CONFIRMED"].includes(status?.toUpperCase());
  };

  const getSecondaryActions = (apt, statusUpper, queueToken) => {
    const actions = [];

    // BOOKED/CONFIRMED
    if (["BOOKED", "CONFIRMED"].includes(statusUpper)) {
      actions.push({
        label: "Open Intake",
        icon: "📋",
        onClick: () => window.location.href = `/staff/branch/${branchId}/clinic/intake/${apt.id}`,
      });
      if (onCancel) {
        actions.push({
          label: "Cancel",
          icon: "❌",
          danger: true,
          onClick: () => {
            const reason = prompt("Cancellation reason (optional):");
            if (reason !== null) onCancel(apt.id, reason);
          },
        });
      }
      if (onNoShow) {
        actions.push({
          label: "Mark No-Show",
          icon: "🚫",
          danger: true,
          onClick: () => {
            if (confirm("Mark this appointment as no-show?")) onNoShow(apt.id);
          },
        });
      }
      if (onReschedule) {
        actions.push({
          label: "Reschedule",
          icon: "📅",
          onClick: () => {
            alert("Reschedule functionality - implement date/time picker");
          },
        });
      }
    }

    // CHECKED_IN
    if (statusUpper === "CHECKED_IN") {
      actions.push({
        label: "Open Intake",
        icon: "📋",
        onClick: () => window.location.href = `/staff/branch/${branchId}/clinic/intake/${apt.id}`,
      });
      if (queueToken) {
        actions.push({
          label: "View in Queue",
          icon: "👁️",
          onClick: () => {
            // Switch to queue tickets tab
            alert(`Queue Token: ${queueToken}`);
          },
        });
      }
    }

    // IN_QUEUE, CALLED, IN_CONSULT
    if (["IN_QUEUE", "CALLED", "IN_CONSULT"].includes(statusUpper)) {
      actions.push({
        label: "Open Intake",
        icon: "📋",
        onClick: () => window.location.href = `/staff/branch/${branchId}/clinic/intake/${apt.id}`,
      });
    }

    return actions;
  };

  return (
    <div>
      <div className="d-flex gap-2 mb-3 flex-wrap">
        <select
          className="form-select form-select-sm"
          style={{ width: "150px" }}
          value={filterDoctor}
          onChange={(e) => setFilterDoctor(e.target.value)}
        >
          <option value="">All Doctors</option>
          {doctors.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
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
      </div>

      {loading ? (
        <p className="text-muted">Loading appointments...</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered table-hover align-middle table-sm">
            <thead>
              <tr>
                <th>Time</th>
                <th>Patient / Pet</th>
                <th>Doctor</th>
                <th>Service</th>
                <th>Status</th>
                <th>Queue</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    No appointments for this date.
                  </td>
                </tr>
              )}
              {filtered.map((apt) => {
                const time = apt.scheduledStartAt
                  ? new Date(apt.scheduledStartAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—";
                const patientName = apt.patient?.user?.profile?.displayName || "—";
                const petName = apt.pet?.name || "—";
                const species = apt.pet?.species || "";
                const doctorName = apt.doctor?.user?.profile?.displayName || "—";
                const serviceName = apt.service?.name || "—";
                const status = apt.status || "BOOKED";
                const statusUpper = status.toUpperCase();
                const queueToken = getQueueToken(apt.id);
                const statusBadge = 
                  statusUpper === "COMPLETED" ? "success" :
                  statusUpper === "IN_CONSULT" ? "primary" :
                  statusUpper === "CALLED" ? "warning" :
                  statusUpper === "IN_QUEUE" ? "info" :
                  statusUpper === "CHECKED_IN" ? "info" :
                  statusUpper === "CONFIRMED" ? "secondary" :
                  "secondary";

                return (
                  <tr key={apt.id}>
                    <td>{time}</td>
                    <td>
                      {patientName}
                      <br />
                      <small className="text-muted">
                        {petName} {species && `(${species})`}
                      </small>
                    </td>
                    <td>{doctorName}</td>
                    <td>{serviceName}</td>
                    <td>
                      <span className={`badge bg-${statusBadge} radius-12`}>
                        {status}
                      </span>
                    </td>
                    <td>
                      {queueToken ? (
                        <span className="badge bg-success radius-12">{queueToken}</span>
                      ) : (
                        <span className="text-muted small">—</span>
                      )}
                    </td>
                    <td className="text-end">
                      <div className="d-flex gap-1 justify-content-end align-items-center">
                        {/* Primary Action */}
                        {canCheckIn(status) && (
                          <button
                            type="button"
                            className="btn btn-sm btn-primary radius-12"
                            onClick={() => onCheckIn(apt.id)}
                            disabled={!!actioning}
                          >
                            {actioning === apt.id ? "..." : "Check In"}
                          </button>
                        )}
                        {statusUpper === "CHECKED_IN" && (
                          <Link
                            href={`/staff/branch/${branchId}/clinic/intake/${apt.id}`}
                            className="btn btn-sm btn-primary radius-12"
                          >
                            Open Intake
                          </Link>
                        )}
                        {statusUpper === "CHECKED_IN" && queueToken && (
                          <span className="badge bg-success radius-12 ms-1">{queueToken}</span>
                        )}
                        {["IN_QUEUE", "CALLED", "IN_CONSULT"].includes(statusUpper) && (
                          <Link
                            href={`/staff/branch/${branchId}/clinic/intake/${apt.id}`}
                            className="btn btn-sm btn-outline-secondary radius-12"
                          >
                            View
                          </Link>
                        )}
                        {statusUpper === "COMPLETED" && (
                          <Link
                            href={`/staff/branch/${branchId}/clinic/intake/${apt.id}`}
                            className="btn btn-sm btn-outline-secondary radius-12"
                          >
                            View
                          </Link>
                        )}

                        {/* Secondary Actions Dropdown */}
                        {getSecondaryActions(apt, statusUpper, queueToken).length > 0 && (
                          <ActionDropdown
                            actions={getSecondaryActions(apt, statusUpper, queueToken)}
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
      )}
    </div>
  );
}
