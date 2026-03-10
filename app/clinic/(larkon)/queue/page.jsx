"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  staffClinicQueueSession,
  staffClinicQueueSessionOpen,
  staffClinicQueueSessionClose,
  staffClinicQueueTickets,
  staffClinicQueueCallNext,
  staffClinicQueueSkip,
  staffClinicQueueStart,
  staffClinicQueueComplete,
} from "@/lib/api";

const TICKET_STATUS_BADGES = {
  CREATED: "secondary",
  WAITING: "info",
  CALLED: "warning",
  IN_SERVICE: "primary",
  COMPLETED: "success",
  SKIPPED: "dark",
};

export default function ClinicQueuePage() {
  const searchParams = useSearchParams();
  const branchIdParam = searchParams?.get("branchId") || "";
  const [branchId, setBranchId] = useState(branchIdParam);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [session, setSession] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actioning, setActioning] = useState(null);

  useEffect(() => {
    setBranchId(branchIdParam);
  }, [branchIdParam]);

  useEffect(() => {
    if (!branchId) return;
    loadSession();
  }, [branchId, date]);

  useEffect(() => {
    if (!branchId) return;
    loadTickets();
  }, [branchId, date, session]);

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
      await loadTickets();
    } catch (e) {
      setError((e && e.message) || "Complete failed");
    } finally {
      setActioning(null);
    }
  }

  const isOpen = session?.status === "OPEN";
  const waitingOrCalled = tickets.filter((t) => t.status === "WAITING" || t.status === "CALLED");

  const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";

  return (
    <div className="dashboard-main-body">
      <div className="card radius-12 mb-3">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h6 className="mb-0">Queue Console</h6>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Branch ID"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              style={{ width: "100px" }}
            />
            <input
              type="date"
              className="form-control form-control-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: "140px" }}
            />
            {session && (
              <span className={`badge ${session.status === "OPEN" ? "bg-success" : "bg-secondary"} radius-12`}>
                {session.status}
              </span>
            )}
            <Link href={`/clinic${q}`} className="btn btn-sm btn-outline-primary radius-12">
              Back
            </Link>
          </div>
        </div>
        <div className="card-body py-2">
          {branchId && session != null && (
            <div className="d-flex align-items-center gap-2 flex-wrap">
              {session.status !== "OPEN" && (
                <button
                  type="button"
                  className="btn btn-sm btn-success radius-12"
                  onClick={handleOpenSession}
                  disabled={!!actioning}
                >
                  {actioning === "open" ? "..." : "Open session"}
                </button>
              )}
              {session.status === "OPEN" && (
                <>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger radius-12"
                    onClick={handleCloseSession}
                    disabled={!!actioning}
                  >
                    {actioning === "close" ? "..." : "Close session"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary radius-12"
                    onClick={handleCallNext}
                    disabled={!!actioning || waitingOrCalled.length === 0}
                  >
                    {actioning === "callNext" ? "..." : "Call next"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {branchId && error && (
        <div className="alert alert-danger radius-12 mb-3" role="alert">
          {error}
        </div>
      )}

      {!branchId && (
        <div className="card radius-12">
          <div className="card-body text-center text-muted py-5">
            <p className="mb-0">Enter branch ID to load queue session and tickets.</p>
          </div>
        </div>
      )}

      {branchId && (
        <div className="card radius-12">
          <div className="card-header">
            <h6 className="mb-0">Tickets</h6>
          </div>
          <div className="card-body">
            {loading && <p className="text-muted mb-0">Loading session...</p>}
            {!loading && (
              <div className="table-responsive">
                <table className="table table-bordered table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Token</th>
                      <th>Status</th>
                      <th>Intake</th>
                      <th>Flags</th>
                      <th>Doctor</th>
                      <th>Service</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center text-muted py-4">
                          No tickets.
                        </td>
                      </tr>
                    )}
                    {tickets.map((t) => {
                      const status = t.status || "CREATED";
                      const badge = TICKET_STATUS_BADGES[status] || "secondary";
                      const doctorName = t.doctor?.user?.profile?.displayName ?? "—";
                      const serviceName = t.appointment?.service?.name ?? "—";
                      const intakeStatus = t.appointment?.intakeStatus ?? "NOT_STARTED";
                      const intakeBadge = intakeStatus === "COMPLETE" ? "success" : intakeStatus === "PARTIAL" ? "warning" : "secondary";
                      const rf = t.appointment?.intake?.riskFlagsJson && typeof t.appointment.intake.riskFlagsJson === "object" ? t.appointment.intake.riskFlagsJson : {};
                      const isEmergency = !!rf.isEmergency;
                      const isAggressive = !!rf.isAggressive;
                      const isInfectious = !!rf.infectiousSuspicion;
                      const pendingVitals = t.appointment?.intake && (t.appointment.intake.weightKg == null && t.appointment.intake.tempC == null);
                      return (
                        <tr key={t.id}>
                          <td>
                            <strong>{t.tokenNo ?? t.id}</strong>
                            {pendingVitals && (
                              <span className="ms-1 badge bg-warning text-dark" title="Vitals not recorded">Vitals?</span>
                            )}
                          </td>
                          <td><span className={`badge bg-${badge} radius-12`}>{status}</span></td>
                          <td>
                            <span className={`badge bg-${intakeBadge} radius-12`}>
                              {intakeStatus === "COMPLETE" ? "Complete" : intakeStatus === "PARTIAL" ? "Partial" : "—"}
                            </span>
                            {t.appointmentId && branchId && (
                              <Link href={`/clinic/intake/${t.appointmentId}?branchId=${encodeURIComponent(branchId)}`} className="ms-1 small">Fill</Link>
                            )}
                          </td>
                          <td>
                            {isEmergency && <span className="badge bg-danger me-1 radius-12">Emergency</span>}
                            {isAggressive && <span className="badge bg-warning text-dark me-1 radius-12">Aggressive</span>}
                            {isInfectious && <span className="badge bg-secondary me-1 radius-12">Infectious?</span>}
                            {!isEmergency && !isAggressive && !isInfectious && "—"}
                          </td>
                          <td>{doctorName}</td>
                          <td>{serviceName}</td>
                          <td className="text-end">
                            {status === "WAITING" && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary me-1 radius-12"
                                onClick={() => handleSkip(t.id)}
                                disabled={!!actioning}
                              >
                                Skip
                              </button>
                            )}
                            {(status === "WAITING" || status === "CALLED") && (
                              <button
                                type="button"
                                className="btn btn-sm btn-primary me-1 radius-12"
                                onClick={() => handleStart(t.id)}
                                disabled={!!actioning}
                              >
                                {actioning === t.id ? "..." : "Start"}
                              </button>
                            )}
                            {status === "IN_SERVICE" && (
                              <button
                                type="button"
                                className="btn btn-sm btn-success radius-12"
                                onClick={() => handleComplete(t.id)}
                                disabled={!!actioning}
                              >
                                {actioning === t.id ? "..." : "Complete"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
