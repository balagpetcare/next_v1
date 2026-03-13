"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ownerClinicAppointments,
  ownerClinicAppointmentCancel,
  ownerClinicAppointmentReschedule,
  ownerClinicAppointmentConfirm,
  ownerClinicSlots,
  ownerClinicBookingEligibleDoctors,
} from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

const STATUS_BADGES: Record<string, string> = {
  BOOKED: "primary",
  CONFIRMED: "info",
  CHECKED_IN: "warning",
  IN_QUEUE: "secondary",
  CALLED: "secondary",
  IN_CONSULT: "secondary",
  COMPLETED: "success",
  CANCELLED: "danger",
  NO_SHOW: "dark",
};

function statusBadgeClass(s: string) {
  return STATUS_BADGES[s?.toUpperCase()] ?? "bg-light text-dark";
}

type AppointmentItem = {
  id: number;
  status: string;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  patient?: { profile?: { displayName?: string; username?: string } };
  pet?: { name?: string };
  service?: { name?: string };
  doctor?: { user?: { profile?: { displayName?: string } } };
};

export default function OwnerClinicAppointmentsPage() {
  const params = useParams();
  const branchId = (params?.branchId as string) ?? "";
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [statusFilter, setStatusFilter] = useState("");
  const [doctorFilter, setDoctorFilter] = useState<string | number>("");
  const [serviceFilter, setServiceFilter] = useState<string | number>("");
  const [appointmentTypeFilter, setAppointmentTypeFilter] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [doctorsForFilter, setDoctorsForFilter] = useState<{ id: number; displayName?: string }[]>([]);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [rescheduleApt, setRescheduleApt] = useState<AppointmentItem | null>(null);

  const loadAppointments = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError("");
    try {
      const result = await ownerClinicAppointments(branchId, {
        date,
        status: statusFilter || undefined,
        doctorId: doctorFilter !== "" ? Number(doctorFilter) : undefined,
        serviceId: serviceFilter !== "" ? Number(serviceFilter) : undefined,
        appointmentType: appointmentTypeFilter || undefined,
        limit: 100,
        offset: 0,
      });
      const items = (result as { items?: AppointmentItem[] })?.items ?? [];
      const tot = (result as { total?: number })?.total ?? 0;
      setAppointments(items);
      setTotal(tot);
    } catch (e) {
      setError((e as Error)?.message || "Failed to load appointments");
      setAppointments([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [branchId, date, statusFilter, doctorFilter, serviceFilter, appointmentTypeFilter]);

  useEffect(() => {
    if (!branchId) return;
    loadAppointments();
  }, [branchId, loadAppointments]);

  useEffect(() => {
    if (!branchId) return;
    ownerClinicBookingEligibleDoctors(branchId, {})
      .then((list: unknown) => setDoctorsForFilter(Array.isArray(list) ? list as { id: number; displayName?: string }[] : []))
      .catch(() => setDoctorsForFilter([]));
  }, [branchId]);

  async function handleCancel(appointmentId: number, reason?: string) {
    if (!branchId) return;
    setActioningId(appointmentId);
    setError("");
    try {
      await ownerClinicAppointmentCancel(branchId, appointmentId, { reason });
      await loadAppointments();
    } catch (e) {
      setError((e as Error)?.message || "Cancel failed");
    } finally {
      setActioningId(null);
    }
  }

  async function handleReschedule(appointmentId: number, data: { scheduledStartAt: string; scheduledEndAt: string; doctorId?: number }) {
    if (!branchId) return;
    setActioningId(appointmentId);
    setError("");
    try {
      await ownerClinicAppointmentReschedule(branchId, appointmentId, data);
      setRescheduleApt(null);
      await loadAppointments();
    } catch (e) {
      setError((e as Error)?.message || "Reschedule failed");
      throw e;
    } finally {
      setActioningId(null);
    }
  }

  async function handleConfirm(appointmentId: number) {
    if (!branchId) return;
    setActioningId(appointmentId);
    setError("");
    try {
      await ownerClinicAppointmentConfirm(branchId, appointmentId);
      await loadAppointments();
    } catch (e) {
      setError((e as Error)?.message || "Confirm failed");
    } finally {
      setActioningId(null);
    }
  }

  const canCancel = (s: string) => ["BOOKED", "CONFIRMED", "CHECKED_IN"].includes(s);
  const canReschedule = (s: string) => ["BOOKED", "CONFIRMED"].includes(s);
  const canConfirm = (s: string) => s === "BOOKED";

  if (!branchId) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">Invalid branch.</div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Appointments"
        subtitle={"Branch #" + branchId}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Appointments", href: `/owner/clinic/${branchId}/appointments` },
        ]}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-3">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      <div className="card radius-12 mb-4">
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <input
              type="date"
              className="form-control form-control-sm"
              style={{ width: 160 }}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <select
              className="form-select form-select-sm"
              style={{ width: 140 }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="BOOKED">BOOKED</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="CHECKED_IN">CHECKED_IN</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="NO_SHOW">NO_SHOW</option>
            </select>
            <select
              className="form-select form-select-sm"
              style={{ width: 160 }}
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value === "" ? "" : Number(e.target.value))}
            >
              <option value="">All doctors</option>
              {doctorsForFilter.map((d) => (
                <option key={d.id} value={d.id}>{d.displayName ?? `Doctor ${d.id}`}</option>
              ))}
            </select>
            <select
              className="form-select form-select-sm"
              style={{ width: 150 }}
              value={appointmentTypeFilter}
              onChange={(e) => setAppointmentTypeFilter(e.target.value)}
            >
              <option value="">All types</option>
              <option value="CONSULTATION">Consultation</option>
              <option value="SERVICE">Service</option>
              <option value="PACKAGE">Package</option>
              <option value="SURGERY">Surgery</option>
              <option value="FOLLOW_UP">Follow-up</option>
            </select>
            <input
              type="number"
              className="form-control form-control-sm"
              style={{ width: 90 }}
              placeholder="Service ID"
              value={serviceFilter === "" ? "" : serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value === "" ? "" : Number(e.target.value))}
            />
            <Link href={`/owner/clinic/${branchId}`} className="btn btn-outline-secondary btn-sm radius-12">
              ← Branch
            </Link>
            <Link href={`/owner/clinic/${branchId}/calendar`} className="btn btn-outline-primary btn-sm radius-12">
              Calendar
            </Link>
            <button type="button" className="btn btn-primary btn-sm radius-12" onClick={() => setShowNewModal(true)}>
              New appointment
            </button>
          </div>
          <p className="text-muted small mb-0">
            To create or run day-to-day appointments (check-in, queue), use the <strong>Staff Panel</strong> for this branch.
          </p>
        </div>
      </div>

      <div className="card radius-12">
        <div className="card-body">
          <h5 className="card-title mb-3">Appointments</h5>
          {loading ? (
            <div className="py-24 text-center text-secondary-light">Loading...</div>
          ) : appointments.length === 0 ? (
            <div className="py-24 text-center text-secondary-light">No appointments for this date.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Patient</th>
                    <th>Pet</th>
                    <th>Service</th>
                    <th>Doctor</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((a) => {
                    const start =
                      a.scheduledStartAt &&
                      new Date(a.scheduledStartAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                    const patientName = a.patient?.profile?.displayName ?? a.patient?.profile?.username ?? "—";
                    const petName = a.pet?.name ?? "—";
                    const serviceName = a.service?.name ?? "—";
                    const doctorName = a.doctor?.user?.profile?.displayName ?? "—";
                    const status = a.status ?? "BOOKED";
                    const acting = actioningId === a.id;
                    return (
                      <tr key={a.id}>
                        <td>{start ?? "—"}</td>
                        <td>{patientName}</td>
                        <td>{petName}</td>
                        <td>{serviceName}</td>
                        <td>{doctorName}</td>
                        <td>
                          <span className={`badge bg-${statusBadgeClass(status)}`}>{status}</span>
                        </td>
                        <td className="text-end">
                          <div className="btn-group btn-group-sm">
                            {canConfirm(status) && (
                              <button
                                type="button"
                                className="btn btn-outline-success"
                                onClick={() => handleConfirm(a.id)}
                                disabled={acting}
                              >
                                {acting ? "…" : "Confirm"}
                              </button>
                            )}
                            {canCancel(status) && (
                              <button
                                type="button"
                                className="btn btn-outline-danger"
                                onClick={() => {
                                  const reason = window.prompt("Cancel reason (optional):");
                                  handleCancel(a.id, reason ?? undefined);
                                }}
                                disabled={acting}
                              >
                                {acting ? "…" : "Cancel"}
                              </button>
                            )}
                            {canReschedule(status) && (
                              <button
                                type="button"
                                className="btn btn-outline-primary"
                                onClick={() => setRescheduleApt(a)}
                                disabled={acting}
                              >
                                Reschedule
                              </button>
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
          {total > 0 && <small className="text-muted d-block mt-2">Total: {total}</small>}
        </div>
      </div>

      {showNewModal && (
        <div className="modal d-block bg-dark bg-opacity-50" tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h5 className="modal-title">New appointment</h5>
                <button type="button" className="btn-close" onClick={() => setShowNewModal(false)} aria-label="Close" />
              </div>
              <div className="modal-body">
                <p className="mb-0">
                  To create an appointment with the full booking flow (patient, service/package, doctor, slot), use the <strong>Staff Panel</strong> for this branch.
                </p>
                <Link href={`/staff/branch/${branchId}/clinic/appointments`} className="btn btn-primary mt-3">
                  Open Staff Appointments
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {rescheduleApt && (
        <RescheduleModal
          branchId={branchId}
          appointment={rescheduleApt}
          onClose={() => setRescheduleApt(null)}
          onSuccess={(data) => handleReschedule(rescheduleApt.id, data)}
        />
      )}
    </div>
  );
}

function RescheduleModal({
  branchId,
  appointment,
  onClose,
  onSuccess,
}: {
  branchId: string;
  appointment: AppointmentItem;
  onClose: () => void;
  onSuccess: (data: { scheduledStartAt: string; scheduledEndAt: string; doctorId?: number }) => Promise<void>;
}) {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [slots, setSlots] = useState<{ start: string; end: string; doctorId?: number }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotStart, setSlotStart] = useState("");
  const [slotEnd, setSlotEnd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!date || !branchId) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    ownerClinicSlots(branchId, { date, doctorId: undefined, serviceId: undefined })
      .then((s) => setSlots(Array.isArray(s) ? s : []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [branchId, date]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!slotStart || !slotEnd) {
      setFormError("Please select a time slot.");
      return;
    }
    setSubmitting(true);
    try {
      await onSuccess({
        scheduledStartAt: slotStart,
        scheduledEndAt: slotEnd,
      });
    } catch {
      // Error shown by parent
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal d-block bg-dark bg-opacity-50" tabIndex={-1}>
      <div className="modal-dialog">
        <div className="modal-content radius-12">
          <div className="modal-header">
            <h5 className="modal-title">Reschedule appointment #{appointment?.id}</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {formError && <div className="alert alert-danger py-2">{formError}</div>}
              <div className="mb-3">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setSlotStart("");
                    setSlotEnd("");
                  }}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Time slot</label>
                {slotsLoading ? (
                  <p className="text-muted small">Loading slots…</p>
                ) : (
                  <select
                    className="form-select"
                    value={slots.findIndex((s) => s.start && new Date(s.start).toISOString() === slotStart)}
                    onChange={(e) => {
                      const idx = Number(e.target.value);
                      const s = slots[idx];
                      if (s?.start != null && s?.end != null) {
                        setSlotStart(new Date(s.start).toISOString());
                        setSlotEnd(new Date(s.end).toISOString());
                      }
                    }}
                  >
                    <option value={-1}>Select</option>
                    {slots.map((s, i) => (
                      <option key={i} value={i}>
                        {s.start && new Date(s.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {" – "}
                        {s.end && new Date(s.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "…" : "Reschedule"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
