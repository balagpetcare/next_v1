"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicQueueSession,
  staffClinicQueueSessionOpen,
  staffClinicQueueSessionClose,
  staffClinicQueueTickets,
  staffClinicQueueCallNext,
  staffClinicQueueSkip,
  staffClinicQueueStart,
  staffClinicQueueComplete,
  staffClinicQueueAssignDoctor,
  staffClinicQueueSetPriority,
  staffClinicQueueIssueTicket,
  staffClinicAppointmentsListV2,
  staffClinicAppointmentCheckIn,
  staffClinicAppointmentCancel,
  staffClinicAppointmentNoShow,
  staffClinicAppointmentReschedule,
  staffClinicPatientsList,
} from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import QueueKPICards from "./_components/QueueKPICards";
import QueueTicketsTable from "./_components/QueueTicketsTable";
import TodaysAppointments from "./_components/TodaysAppointments";
import WalkInForm from "./_components/WalkInForm";

const QUEUE_PERMS = ["clinic.queue.read", "clinic.queue.manage"];

const TICKET_STATUS_BADGES = {
  CREATED: "secondary",
  WAITING: "info",
  CALLED: "warning",
  IN_SERVICE: "primary",
  COMPLETED: "success",
  SKIPPED: "dark",
};

export default function StaffBranchClinicQueuePage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [session, setSession] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actioning, setActioning] = useState(null);
  const [activeTab, setActiveTab] = useState("tickets");

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = QUEUE_PERMS.some((p) => permissions.includes(p));

  useEffect(() => {
    if (!branchId) return;
    loadSession();
  }, [branchId, date]);

  useEffect(() => {
    if (!branchId) return;
    loadTickets();
    loadAppointments();
  }, [branchId, date, session]);

  useEffect(() => {
    if (branch?.doctors) setDoctors(branch.doctors);
    if (branch?.services) setServices(branch.services);
  }, [branch]);

  async function loadSession() {
    if (!branchId) return;
    setLoading(true);
    setError("");
    try {
      const data = await staffClinicQueueSession(branchId, date);
      setSession(data ?? null);
    } catch (e) {
      setError((e && e.message) || "Failed to load session");
      setSession(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadTickets() {
    if (!branchId) return;
    try {
      const list = await staffClinicQueueTickets(branchId, { date, status: undefined });
      setTickets(Array.isArray(list) ? list : []);
    } catch {
      setTickets([]);
    }
  }

  async function loadAppointments() {
    if (!branchId) return;
    setAppointmentsLoading(true);
    try {
      const result = await staffClinicAppointmentsListV2(branchId, { date });
      setAppointments(result.items || []);
    } catch {
      setAppointments([]);
    } finally {
      setAppointmentsLoading(false);
    }
  }

  async function handleOpenSession() {
    if (!branchId) return;
    setActioning("open");
    setError("");
    try {
      await staffClinicQueueSessionOpen(branchId);
      await loadSession();
    } catch (e) {
      setError((e && e.message) || "Open session failed");
    } finally {
      setActioning(null);
    }
  }

  async function handleCloseSession() {
    if (!branchId || !session?.id) return;
    setActioning("close");
    setError("");
    try {
      await staffClinicQueueSessionClose(branchId, session.id);
      await loadSession();
    } catch (e) {
      setError((e && e.message) || "Close session failed");
    } finally {
      setActioning(null);
    }
  }

  async function handleCallNext() {
    if (!branchId) return;
    setActioning("callNext");
    setError("");
    try {
      await staffClinicQueueCallNext(branchId);
      await loadTickets();
    } catch (e) {
      setError((e && e.message) || "Call next failed");
    } finally {
      setActioning(null);
    }
  }

  async function handleSkip(ticketId) {
    if (!branchId) return;
    setActioning(ticketId);
    setError("");
    try {
      await staffClinicQueueSkip(branchId, ticketId);
      await loadTickets();
    } catch (e) {
      setError((e && e.message) || "Skip failed");
    } finally {
      setActioning(null);
    }
  }

  async function handleStart(ticketId) {
    if (!branchId) return;
    setActioning(ticketId);
    setError("");
    try {
      await staffClinicQueueStart(branchId, ticketId);
      await loadTickets();
    } catch (e) {
      setError((e && e.message) || "Start failed");
    } finally {
      setActioning(null);
    }
  }

  async function handleComplete(ticketId) {
    if (!branchId) return;
    setActioning(ticketId);
    setError("");
    try {
      await staffClinicQueueComplete(branchId, ticketId);
      setSuccess("Service completed");
      await loadTickets();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError((e && e.message) || "Complete failed");
    } finally {
      setActioning(null);
    }
  }

  async function handleAssignDoctor(ticketId, doctorId) {
    if (!branchId) return;
    setActioning(ticketId);
    setError("");
    try {
      await staffClinicQueueAssignDoctor(branchId, ticketId, doctorId);
      setSuccess("Doctor assigned");
      await loadTickets();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError((e && e.message) || "Assign failed");
    } finally {
      setActioning(null);
    }
  }

  async function handleSetPriority(ticketId, priorityTag) {
    if (!branchId) return;
    setActioning(ticketId);
    setError("");
    try {
      await staffClinicQueueSetPriority(branchId, ticketId, priorityTag);
      setSuccess("Priority updated");
      await loadTickets();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError((e && e.message) || "Priority update failed");
    } finally {
      setActioning(null);
    }
  }

  async function handleCheckIn(appointmentId) {
    if (!branchId) return;
    setActioning(appointmentId);
    setError("");
    try {
      await staffClinicAppointmentCheckIn(branchId, appointmentId);
      setSuccess("Checked in successfully");
      await loadTickets();
      await loadAppointments();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError((e && e.message) || "Check-in failed");
    } finally {
      setActioning(null);
    }
  }

  async function handleCreateWalkIn(data) {
    if (!branchId) return;
    setActioning("walkIn");
    setError("");
    try {
      await staffClinicQueueIssueTicket(branchId, data);
      setSuccess("Walk-in ticket created");
      await loadTickets();
      setActiveTab("tickets");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError((e && e.message) || "Walk-in creation failed");
    } finally {
      setActioning(null);
    }
  }

  async function handleSearchPatients(query) {
    if (!branchId) return [];
    try {
      const { patients = [] } = await staffClinicPatientsList(branchId, { search: query, limit: 15, offset: 0 });
      return patients
        .map((p) => ({
          id: p.owner?.userId ?? p.userId,
          user: {
            profile: { displayName: p.owner?.displayName ?? "—" },
            phone: p.owner?.phone || p.owner?.email || "—",
          },
          name: p.name,
          species: p.animalType?.name ?? "—",
          pets: [
            {
              id: p.id,
              name: p.name,
              species: p.animalType?.name,
              breed: p.breed?.name || "Unknown breed",
            },
          ],
        }))
        .filter((row) => row.id != null);
    } catch {
      return [];
    }
  }

  async function handleCancelAppointment(appointmentId, reason) {
    if (!branchId) return;
    setActioning(appointmentId);
    setError("");
    try {
      await staffClinicAppointmentCancel(branchId, appointmentId, reason);
      setSuccess("Appointment cancelled");
      await loadAppointments();
      await loadTickets();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError((e && e.message) || "Cancel failed");
    } finally {
      setActioning(null);
    }
  }

  async function handleNoShowAppointment(appointmentId) {
    if (!branchId) return;
    setActioning(appointmentId);
    setError("");
    try {
      await staffClinicAppointmentNoShow(branchId, appointmentId);
      setSuccess("Marked as no-show");
      await loadAppointments();
      await loadTickets();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError((e && e.message) || "No-show failed");
    } finally {
      setActioning(null);
    }
  }

  async function handleRescheduleAppointment(appointmentId, data) {
    if (!branchId) return;
    setActioning(appointmentId);
    setError("");
    try {
      await staffClinicAppointmentReschedule(branchId, appointmentId, data);
      setSuccess("Appointment rescheduled");
      await loadAppointments();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError((e && e.message) || "Reschedule failed");
    } finally {
      setActioning(null);
    }
  }

  async function handleCallTicket(ticketId) {
    if (!branchId) return;
    setActioning(ticketId);
    setError("");
    try {
      // Use callNext endpoint - backend will handle the specific ticket
      await staffClinicQueueCallNext(branchId);
      setSuccess("Patient called");
      await loadTickets();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError((e && e.message) || "Call failed");
    } finally {
      setActioning(null);
    }
  }

  async function handleRecallTicket(ticketId) {
    if (!branchId) return;
    setActioning(ticketId);
    setError("");
    try {
      // Recall = return to waiting (skip back)
      await staffClinicQueueSkip(branchId, ticketId);
      setSuccess("Patient recalled to waiting");
      await loadTickets();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError((e && e.message) || "Recall failed");
    } finally {
      setActioning(null);
    }
  }

  async function handleNoShowTicket(ticketId) {
    if (!branchId) return;
    setActioning(ticketId);
    setError("");
    try {
      // Mark ticket as skipped/no-show
      await staffClinicQueueSkip(branchId, ticketId);
      setSuccess("Marked as no-show");
      await loadTickets();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError((e && e.message) || "No-show failed");
    } finally {
      setActioning(null);
    }
  }

  async function handleCancelTicket(ticketId) {
    if (!branchId) return;
    setActioning(ticketId);
    setError("");
    try {
      // Cancel = skip ticket
      await staffClinicQueueSkip(branchId, ticketId);
      setSuccess("Ticket cancelled");
      await loadTickets();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError((e && e.message) || "Cancel failed");
    } finally {
      setActioning(null);
    }
  }

  const isOpen = session?.status === "OPEN";
  const waitingOrCalled = tickets.filter((t) => t.status === "WAITING" || t.status === "CALLED");

  const tabs = [
    { id: "tickets", label: "Queue Tickets", count: tickets.length },
    { id: "appointments", label: "Today's Appointments", count: appointments.length },
    { id: "walkin", label: "Walk-In", count: null },
  ];

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        missingPerm="clinic.queue.read"
        onBack={() => router.push(`/staff/branch/${branchId}/clinic`)}
      />
    );
  }

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      
      <div className="d-flex align-items-center gap-12 mb-24 flex-wrap">
        <Link href={`/staff/branch/${branchId}/clinic/dashboard`} className="btn btn-outline-secondary btn-sm">
          ← Clinic
        </Link>
        <h5 className="mb-0">Queue Console</h5>
      </div>

      {error && (
        <div className="alert alert-danger radius-12 mb-3" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success radius-12 mb-3" role="alert">
          {success}
        </div>
      )}

      <QueueKPICards tickets={tickets} />

      <Card title="Session Controls" className="mb-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div className="d-flex align-items-center gap-2">
            <label className="mb-0 small text-muted">Date:</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: "150px" }}
            />
            {session && (
              <span className={`badge ${session.status === "OPEN" ? "bg-success" : "bg-secondary"} radius-12`}>
                {session.status}
              </span>
            )}
          </div>
          
          {branchId && session != null && (
            <div className="d-flex align-items-center gap-2 flex-wrap">
              {session.status !== "OPEN" && (
                <button
                  type="button"
                  className="btn btn-sm btn-success radius-12"
                  onClick={handleOpenSession}
                  disabled={!!actioning}
                >
                  {actioning === "open" ? "Opening..." : "Open Session"}
                </button>
              )}
              {session.status === "OPEN" && (
                <>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary radius-12"
                    onClick={handleCallNext}
                    disabled={!!actioning || waitingOrCalled.length === 0}
                  >
                    {actioning === "callNext" ? "Calling..." : "Call Next"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger radius-12"
                    onClick={handleCloseSession}
                    disabled={!!actioning}
                  >
                    {actioning === "close" ? "Closing..." : "Close Session"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <ul className="nav nav-tabs mb-4">
          {tabs.map((tab) => (
            <li key={tab.id} className="nav-item">
              <button
                type="button"
                className={`nav-link ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className="badge bg-secondary ms-2 radius-12">{tab.count}</span>
                )}
              </button>
            </li>
          ))}
        </ul>

        {activeTab === "tickets" && (
          <QueueTicketsTable
            branchId={branchId}
            tickets={tickets}
            onSkip={handleSkip}
            onStart={handleStart}
            onComplete={handleComplete}
            onAssignDoctor={handleAssignDoctor}
            onSetPriority={handleSetPriority}
            onCall={handleCallTicket}
            onRecall={handleRecallTicket}
            onNoShow={handleNoShowTicket}
            onCancel={handleCancelTicket}
            doctors={doctors}
            services={services}
            actioning={actioning}
          />
        )}

        {activeTab === "appointments" && (
          <TodaysAppointments
            branchId={branchId}
            appointments={appointments}
            tickets={tickets}
            onCheckIn={handleCheckIn}
            onCancel={handleCancelAppointment}
            onNoShow={handleNoShowAppointment}
            onReschedule={handleRescheduleAppointment}
            loading={appointmentsLoading}
            actioning={actioning}
          />
        )}

        {activeTab === "walkin" && (
          <WalkInForm
            branchId={branchId}
            onSubmit={handleCreateWalkIn}
            onSearchPatients={handleSearchPatients}
            doctors={doctors}
            services={services}
            actioning={actioning === "walkIn"}
          />
        )}
      </Card>
    </div>
  );
}
