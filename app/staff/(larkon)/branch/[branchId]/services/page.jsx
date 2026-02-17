"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import LkFormGroup from "@larkon-ui/components/LkFormGroup";
import LkInput from "@larkon-ui/components/LkInput";
import LkSelect from "@larkon-ui/components/LkSelect";
import LkTextarea from "@larkon-ui/components/LkTextarea";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicQueueToday,
  staffClinicAppointmentsList,
  staffClinicAppointmentCreate,
  staffClinicAppointmentUpdate,
  staffClinicAppointmentSetStatus,
  staffClinicServiceTypes,
} from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import PermissionGate from "@/src/components/branch/PermissionGate";

const STATUS_OPTIONS = ["SCHEDULED", "CHECKED_IN", "IN_SERVICE", "COMPLETED", "CANCELED"];
const STATUS_BADGE_CLASS = {
  SCHEDULED: "bg-secondary",
  CHECKED_IN: "bg-info",
  IN_SERVICE: "bg-primary",
  COMPLETED: "bg-success",
  CANCELED: "bg-danger",
};

function statusBadgeClass(s) {
  return STATUS_BADGE_CLASS[s?.toUpperCase()] ?? "bg-light text-dark";
}

export default function StaffBranchServicesPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading, errorCode, hasViewPermission } = useBranchContext(branchId);

  const isClinic = (branch?.type ?? "").toUpperCase() === "CLINIC";
  const permissions = myAccess?.permissions ?? [];
  const canView = permissions.includes("services.view") || permissions.includes("appointments.view");
  const canManage = permissions.includes("appointments.manage") || permissions.includes("services.manage");
  const managePerms = ["appointments.manage", "services.manage"];

  const [activeTab, setActiveTab] = useState("queue"); // queue | appointments | billing
  const [queue, setQueue] = useState([]);
  const [queueApiAvailable, setQueueApiAvailable] = useState(false);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [appointmentsApiAvailable, setAppointmentsApiAvailable] = useState(false);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsDate, setAppointmentsDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [appointmentsStatusFilter, setAppointmentsStatusFilter] = useState("");
  const [appointmentsAssignedFilter, setAppointmentsAssignedFilter] = useState("");
  const [serviceTypes, setServiceTypes] = useState([]);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [appointmentForm, setAppointmentForm] = useState({
    dateTime: "",
    patientName: "",
    serviceTypeId: "",
    serviceType: "",
    assignedVetId: "",
    notes: "",
  });
  const [saveSubmitting, setSaveSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // id being acted on

  useEffect(() => {
    if (errorCode === "unauthorized") router.replace("/staff/login");
  }, [errorCode, router]);

  useEffect(() => {
    if (!branchId || !canView || !isClinic) return;
    let cancelled = false;
    setQueueLoading(true);
    setQueueError("");
    staffClinicQueueToday(branchId)
      .then(({ items, apiAvailable }) => {
        if (!cancelled) {
          setQueue(Array.isArray(items) ? items : []);
          setQueueApiAvailable(apiAvailable);
        }
      })
      .catch((e) => { if (!cancelled) setQueueError(e?.message ?? "Failed to load queue"); })
      .finally(() => { if (!cancelled) setQueueLoading(false); });
    return () => { cancelled = true; };
  }, [branchId, canView, isClinic]);

  useEffect(() => {
    if (!branchId || !canView || !isClinic || activeTab !== "appointments") return;
    let cancelled = false;
    setAppointmentsLoading(true);
    staffClinicAppointmentsList(branchId, {
      date: appointmentsDate,
      status: appointmentsStatusFilter || undefined,
      assignedVetId: appointmentsAssignedFilter || undefined,
    })
      .then(({ items, apiAvailable }) => {
        if (!cancelled) {
          setAppointments(Array.isArray(items) ? items : []);
          setAppointmentsApiAvailable(apiAvailable);
        }
      })
      .catch(() => { if (!cancelled) setAppointments([]); })
      .finally(() => { if (!cancelled) setAppointmentsLoading(false); });
    return () => { cancelled = true; };
  }, [branchId, canView, isClinic, activeTab, appointmentsDate, appointmentsStatusFilter, appointmentsAssignedFilter]);

  useEffect(() => {
    if (!branchId || !isClinic) return;
    staffClinicServiceTypes(branchId).then(({ items }) => setServiceTypes(Array.isArray(items) ? items : []));
  }, [branchId, isClinic]);

  const todayCount = queue.length;
  const waitingCount = queue.filter((a) => ["SCHEDULED", "CHECKED_IN"].includes((a.status || "").toUpperCase())).length;
  const followUpsDue = 0;

  const openCreateModal = () => {
    setEditingAppointment(null);
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);
    const timeStr = "09:00";
    setAppointmentForm({
      dateTime: `${dateStr}T${timeStr}`,
      patientName: "",
      serviceTypeId: "",
      serviceType: "",
      assignedVetId: "",
      notes: "",
    });
    setShowAppointmentModal(true);
  };

  const openEditModal = (apt) => {
    setEditingAppointment(apt);
    const dt = apt?.scheduledAt ?? apt?.dateTime ?? apt?.createdAt;
    const dateTime = dt ? new Date(dt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16);
    setAppointmentForm({
      dateTime,
      patientName: apt?.patientName ?? apt?.customer?.name ?? apt?.patient ?? "",
      serviceTypeId: apt?.serviceTypeId ?? "",
      serviceType: apt?.serviceType ?? apt?.service?.name ?? "",
      assignedVetId: apt?.assignedVetId ?? apt?.assignedVet?.id ?? "",
      notes: apt?.notes ?? "",
    });
    setShowAppointmentModal(true);
  };

  const handleSaveAppointment = async (e) => {
    e.preventDefault();
    if (!canManage) return;
    setSaveSubmitting(true);
    try {
      if (editingAppointment?.id) {
        const res = await staffClinicAppointmentUpdate(branchId, editingAppointment.id, {
          dateTime: appointmentForm.dateTime,
          patientName: appointmentForm.patientName || undefined,
          serviceType: appointmentForm.serviceType || undefined,
          serviceTypeId: appointmentForm.serviceTypeId ? Number(appointmentForm.serviceTypeId) : undefined,
          assignedVetId: appointmentForm.assignedVetId ? Number(appointmentForm.assignedVetId) : undefined,
          notes: appointmentForm.notes || undefined,
        });
        if (res.apiAvailable && res.data) {
          setToast("Appointment updated.");
          setShowAppointmentModal(false);
          const { items } = await staffClinicAppointmentsList(branchId, { date: appointmentsDate });
          setAppointments(items ?? []);
          const { items: qItems } = await staffClinicQueueToday(branchId);
          setQueue(qItems ?? []);
        } else {
          setToast("Appointments API not configured. Update not sent.");
        }
      } else {
        const res = await staffClinicAppointmentCreate(branchId, {
          dateTime: appointmentForm.dateTime,
          patientName: appointmentForm.patientName || undefined,
          serviceType: appointmentForm.serviceType || (appointmentForm.serviceTypeId ? serviceTypes.find((s) => s.id === Number(appointmentForm.serviceTypeId))?.name : undefined),
          serviceTypeId: appointmentForm.serviceTypeId ? Number(appointmentForm.serviceTypeId) : undefined,
          assignedVetId: appointmentForm.assignedVetId ? Number(appointmentForm.assignedVetId) : undefined,
          notes: appointmentForm.notes || undefined,
        });
        if (res.apiAvailable && res.data) {
          setToast("Appointment created.");
          setShowAppointmentModal(false);
          const { items } = await staffClinicAppointmentsList(branchId, { date: appointmentsDate });
          setAppointments(items ?? []);
          const { items: qItems } = await staffClinicQueueToday(branchId);
          setQueue(qItems ?? []);
        } else {
          setToast("Appointments API not configured. Create not sent.");
        }
      }
    } catch {
      setToast("Failed to save.");
    } finally {
      setSaveSubmitting(false);
    }
  };

  const handleQueueAction = async (appointmentId, status) => {
    if (!canManage && status === "CANCELED") return;
    setActionLoading(appointmentId);
    try {
      const res = await staffClinicAppointmentSetStatus(branchId, appointmentId, status);
      if (res.apiAvailable) {
        setToast(`Status set to ${status}.`);
        const { items } = await staffClinicQueueToday(branchId);
        setQueue(items ?? []);
      } else {
        setToast("Queue/Appointments API not configured. Action not sent.");
      }
    } catch {
      setToast("Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }

  if (!isClinic) {
    return (
      <AccessDenied
        title="Not a clinic branch"
        message="This page is only available for clinic branches. Select a clinic branch to access Services."
        onBack={() => router.push(`/staff/branch/${branchId}`)}
      />
    );
  }

  if (!canView) {
    return (
      <AccessDenied
        missingPerm="services.view or appointments.view"
        onBack={() => router.push(`/staff/branch/${branchId}`)}
      />
    );
  }

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />

      <div className="d-flex align-items-center gap-12 mb-24">
        <Link href={`/staff/branch/${branchId}`} className="btn btn-outline-secondary btn-sm">
          ← Branch
        </Link>
        <h5 className="mb-0">Clinic Services</h5>
      </div>

      {toast && (
        <div className="alert alert-info d-flex align-items-center justify-content-between">
          <span>{toast}</span>
          <button type="button" className="btn btn-sm btn-outline-info" onClick={() => setToast(null)}>Dismiss</button>
        </div>
      )}

      {queueError && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between">
          <span>{queueError}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      <div className="row g-20 mb-24">
        <div className="col-md-4">
          <Card>
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <p className="text-secondary-light text-sm mb-4">Today Appointments</p>
                <p className="mb-0 fw-semibold">{queueLoading ? "—" : todayCount}</p>
              </div>
              <i className="ri-calendar-check-line text-primary-600 fs-24" aria-hidden />
            </div>
          </Card>
        </div>
        <div className="col-md-4">
          <Card>
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <p className="text-secondary-light text-sm mb-4">Waiting / Queue</p>
                <p className="mb-0 fw-semibold">{queueLoading ? "—" : waitingCount}</p>
              </div>
              <i className="ri-user-search-line text-info fs-24" aria-hidden />
            </div>
          </Card>
        </div>
        <div className="col-md-4">
          <Card>
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <p className="text-secondary-light text-sm mb-4">Follow-ups due</p>
                <p className="mb-0 fw-semibold">{followUpsDue}</p>
              </div>
              <i className="ri-repeat-line text-secondary fs-24" aria-hidden />
            </div>
          </Card>
        </div>
      </div>

      <ul className="nav nav-tabs mb-16">
        <li className="nav-item">
          <button type="button" className={`nav-link ${activeTab === "queue" ? "active" : ""}`} onClick={() => setActiveTab("queue")}>
            Today Queue
          </button>
        </li>
        <li className="nav-item">
          <button type="button" className={`nav-link ${activeTab === "appointments" ? "active" : ""}`} onClick={() => setActiveTab("appointments")}>
            Appointments
          </button>
        </li>
        <li className="nav-item">
          <button type="button" className={`nav-link ${activeTab === "billing" ? "active" : ""}`} onClick={() => setActiveTab("billing")}>
            Service Billing
          </button>
        </li>
      </ul>

      {activeTab === "queue" && (
        <Card title="Today Queue" subtitle={!queueApiAvailable ? "Queue API not configured for this branch. Data is placeholder/empty." : "Today's patients and appointments."}>
          {queueLoading ? (
            <div className="py-24">
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Patient / Customer</th>
                      <th>Service</th>
                      <th>Assigned vet</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3].map((i) => (
                      <tr key={i}>
                        <td><span className="placeholder col-3" /></td>
                        <td><span className="placeholder col-4" /></td>
                        <td><span className="placeholder col-3" /></td>
                        <td><span className="placeholder col-2" /></td>
                        <td><span className="placeholder col-2" /></td>
                        <td><span className="placeholder col-2" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-center text-secondary-light mt-12">Loading...</p>
            </div>
          ) : queue.length === 0 ? (
            <div className="py-24 text-center text-secondary-light">No appointments in today&apos;s queue.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Patient / Customer</th>
                    <th>Service</th>
                    <th>Assigned vet</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((a) => {
                    const time = a.scheduledAt ?? a.dateTime ?? a.createdAt;
                    const patient = a.patientName ?? a.customer?.name ?? a.patient ?? "—";
                    const service = a.serviceType ?? a.service?.name ?? "—";
                    const vet = a.assignedVet?.profile?.displayName ?? a.assignedVetName ?? "—";
                    const status = (a.status || "SCHEDULED").toUpperCase();
                    const id = a.id;
                    return (
                      <tr key={id ?? a.key ?? Math.random()}>
                        <td>{time ? new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                        <td>{patient}</td>
                        <td>{service}</td>
                        <td>{vet}</td>
                        <td><span className={`badge ${statusBadgeClass(status)}`}>{status}</span></td>
                        <td>
                          <div className="d-flex gap-8 flex-wrap">
                            {status === "SCHEDULED" && (
                              <PermissionGate oneOfPerms={managePerms} mode="disable" permissions={permissions}>
                                <button type="button" className="btn btn-sm btn-outline-info" disabled={actionLoading === id} onClick={() => handleQueueAction(id, "CHECKED_IN")}>Check-in</button>
                              </PermissionGate>
                            )}
                            {status === "CHECKED_IN" && (
                              <PermissionGate oneOfPerms={managePerms} mode="disable" permissions={permissions}>
                                <button type="button" className="btn btn-sm btn-outline-primary" disabled={actionLoading === id} onClick={() => handleQueueAction(id, "IN_SERVICE")}>Start</button>
                              </PermissionGate>
                            )}
                            {["CHECKED_IN", "IN_SERVICE"].includes(status) && (
                              <PermissionGate oneOfPerms={managePerms} mode="disable" permissions={permissions}>
                                <button type="button" className="btn btn-sm btn-outline-success" disabled={actionLoading === id} onClick={() => handleQueueAction(id, "COMPLETED")}>Complete</button>
                              </PermissionGate>
                            )}
                            {status !== "CANCELED" && (
                              <PermissionGate oneOfPerms={managePerms} mode="disable" permissions={permissions}>
                                <button type="button" className="btn btn-sm btn-outline-danger" disabled={actionLoading === id} onClick={() => handleQueueAction(id, "CANCELED")}>Cancel</button>
                              </PermissionGate>
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
        </Card>
      )}

      {activeTab === "appointments" && (
        <Card
          title="Appointments"
          subtitle={!appointmentsApiAvailable ? "Appointments API not configured. List is empty until backend adds branch-scoped appointments." : "List view. Use filters and Create to add appointments."}
        >
          <div className="mb-16 d-flex flex-wrap gap-12 align-items-center">
            <LkInput
              type="date"
              size="sm"
              className="radius-12"
              style={{ width: 160 }}
              value={appointmentsDate}
              onChange={(e) => setAppointmentsDate(e.target.value)}
            />
            <LkSelect
              size="sm"
              className="radius-12"
              style={{ width: 140 }}
              value={appointmentsStatusFilter}
              onChange={(e) => setAppointmentsStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </LkSelect>
            <LkInput
              type="text"
              size="sm"
              className="radius-12"
              style={{ width: 120 }}
              placeholder="Assigned vet ID"
              value={appointmentsAssignedFilter}
              onChange={(e) => setAppointmentsAssignedFilter(e.target.value)}
            />
            <PermissionGate oneOfPerms={managePerms} mode="hide" permissions={permissions}>
              <button type="button" className="btn btn-primary btn-sm" onClick={openCreateModal}>Create Appointment</button>
            </PermissionGate>
            {!canManage && <span className="text-secondary-light text-sm">(Create requires appointments.manage or services.manage)</span>}
          </div>
          {appointmentsLoading ? (
            <div className="py-24 text-center text-secondary-light">Loading...</div>
          ) : appointments.length === 0 ? (
            <div className="py-24 text-center text-secondary-light">No appointments for this date.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Date / Time</th>
                    <th>Patient</th>
                    <th>Service</th>
                    <th>Assigned</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((a) => (
                    <tr key={a.id}>
                      <td>{a.scheduledAt ?? a.dateTime ?? a.createdAt ? new Date(a.scheduledAt ?? a.dateTime ?? a.createdAt).toLocaleString() : "—"}</td>
                      <td>{a.patientName ?? a.customer?.name ?? "—"}</td>
                      <td>{a.serviceType ?? a.service?.name ?? "—"}</td>
                      <td>{a.assignedVet?.profile?.displayName ?? "—"}</td>
                      <td><span className={`badge ${statusBadgeClass(a.status)}`}>{a.status ?? "—"}</span></td>
                      <td>
                        <PermissionGate oneOfPerms={managePerms} mode="hide" permissions={permissions}>
                          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => openEditModal(a)}>Edit</button>
                        </PermissionGate>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === "billing" && (
        <Card title="Service Billing" subtitle="Placeholder. Link to POS or dedicated billing when available.">
          <div className="py-24 text-center text-secondary-light">Service billing is not implemented in this phase.</div>
        </Card>
      )}

      {showAppointmentModal && (
        <div className="modal show d-block" style={{ background: "rgba(0,0,0,0.5)" }} aria-modal="true">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">{editingAppointment ? "Edit appointment" : "Create appointment"}</h6>
                <button type="button" className="btn-close" onClick={() => setShowAppointmentModal(false)} aria-label="Close" />
              </div>
              <form onSubmit={handleSaveAppointment}>
                <div className="modal-body">
                  <LkFormGroup label="Date & time (required)" className="text-sm mb-16">
                    <LkInput
                      type="datetime-local"
                      size="sm"
                      className="radius-12"
                      value={appointmentForm.dateTime}
                      onChange={(e) => setAppointmentForm((f) => ({ ...f, dateTime: e.target.value }))}
                      required
                    />
                  </LkFormGroup>
                  <LkFormGroup label="Patient / Customer name" className="text-sm mb-16">
                    <LkInput
                      type="text"
                      size="sm"
                      className="radius-12"
                      placeholder="Patient or customer name"
                      value={appointmentForm.patientName}
                      onChange={(e) => setAppointmentForm((f) => ({ ...f, patientName: e.target.value }))}
                    />
                  </LkFormGroup>
                  <LkFormGroup label="Service type" className="text-sm mb-16">
                    <LkSelect
                      size="sm"
                      className="radius-12"
                      value={appointmentForm.serviceTypeId}
                      onChange={(e) => {
                        const id = e.target.value;
                        const s = serviceTypes.find((x) => x.id === Number(id));
                        setAppointmentForm((f) => ({ ...f, serviceTypeId: id, serviceType: s?.name ?? f.serviceType }));
                      }}
                    >
                      <option value="">Select or type below</option>
                      {serviceTypes.map((s) => (
                        <option key={s.id} value={s.id}>{s.name ?? s.id}</option>
                      ))}
                    </LkSelect>
                    <LkInput
                      type="text"
                      size="sm"
                      className="radius-12 mt-8"
                      placeholder="Or enter service type name"
                      value={appointmentForm.serviceType}
                      onChange={(e) => setAppointmentForm((f) => ({ ...f, serviceType: e.target.value }))}
                    />
                  </LkFormGroup>
                  <LkFormGroup label="Assigned vet / staff (optional)" className="text-sm mb-16">
                    <LkInput
                      type="text"
                      size="sm"
                      className="radius-12"
                      placeholder="Staff ID or name"
                      value={appointmentForm.assignedVetId}
                      onChange={(e) => setAppointmentForm((f) => ({ ...f, assignedVetId: e.target.value }))}
                    />
                  </LkFormGroup>
                  <LkFormGroup label="Notes (optional)" className="text-sm mb-16">
                    <LkTextarea
                      size="sm"
                      className="radius-12"
                      rows={2}
                      value={appointmentForm.notes}
                      onChange={(e) => setAppointmentForm((f) => ({ ...f, notes: e.target.value }))}
                    />
                  </LkFormGroup>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAppointmentModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saveSubmitting}>
                    {saveSubmitting ? "Saving..." : editingAppointment ? "Update" : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
