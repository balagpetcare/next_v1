"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  staffClinicAppointmentsListV2,
  staffClinicAppointmentCheckIn,
  staffClinicAppointmentCancel,
  staffClinicAppointmentNoShow,
} from "@/lib/api";

const STATUS_BADGES = {
  BOOKED: "primary",
  CONFIRMED: "info",
  CHECKED_IN: "warning",
  IN_PROGRESS: "secondary",
  COMPLETED: "success",
  CANCELLED: "danger",
  NO_SHOW: "dark",
};

export default function ClinicAppointmentsPage() {
  const searchParams = useSearchParams();
  const branchIdParam = searchParams?.get("branchId") || "";
  const [branchId, setBranchId] = useState(branchIdParam);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actioning, setActioning] = useState(null);

  useEffect(() => {
    setBranchId(branchIdParam);
  }, [branchIdParam]);

  useEffect(() => {
    if (!branchId) return;
    loadAppointments();
  }, [branchId, date]);

  async function loadAppointments() {
    if (!branchId) return;
    setLoading(true);
    setError("");
    try {
      const res = await staffClinicAppointmentsListV2(branchId, {
        date,
        limit: 100,
        offset: 0,
      });
      setItems(res?.items ?? []);
      setTotal(res?.total ?? 0);
    } catch (e) {
      setError(e?.message || "Failed to load appointments");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckIn(appointmentId) {
    if (!branchId) return;
    setActioning(appointmentId);
    setError("");
    try {
      await staffClinicAppointmentCheckIn(branchId, appointmentId);
      await loadAppointments();
    } catch (e) {
      setError(e?.message || "Check-in failed");
    } finally {
      setActioning(null);
    }
  }

  async function handleCancel(appointmentId, reason) {
    if (!branchId) return;
    setActioning(appointmentId);
    setError("");
    try {
      await staffClinicAppointmentCancel(branchId, appointmentId, reason);
      await loadAppointments();
    } catch (e) {
      setError(e?.message || "Cancel failed");
    } finally {
      setActioning(null);
    }
  }

  async function handleNoShow(appointmentId) {
    if (!branchId) return;
    setActioning(appointmentId);
    setError("");
    try {
      await staffClinicAppointmentNoShow(branchId, appointmentId);
      await loadAppointments();
    } catch (e) {
      setError(e?.message || "No-show failed");
    } finally {
      setActioning(null);
    }
  }

  const canCheckIn = (status) => ["BOOKED", "CONFIRMED"].includes(status);
  const canCancel = (status) => ["BOOKED", "CONFIRMED", "CHECKED_IN"].includes(status);
  const canNoShow = (status) => ["BOOKED", "CONFIRMED"].includes(status);

  const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";

  return (
    <div className="dashboard-main-body">
      <div className="card radius-12">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h6 className="mb-0">Appointments</h6>
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
            <Link href={`/clinic${q}`} className="btn btn-sm btn-outline-primary radius-12">
              Back
            </Link>
          </div>
        </div>

        <div className="card-body">
          {!branchId && (
            <p className="text-muted mb-0">Enter branch ID (or use ?branchId=...) to load appointments.</p>
          )}
          {branchId && error && (
            <div className="alert alert-danger radius-12 mb-3" role="alert">
              {error}
            </div>
          )}
          {branchId && (
            <div className="table-responsive">
              <table className="table table-bordered table-hover align-middle">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Time</th>
                    <th>Pet</th>
                    <th>Owner</th>
                    <th>Doctor</th>
                    <th>Service</th>
                    <th>Source</th>
                    <th>Intake</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={10} className="text-center text-muted py-4">
                        Loading...
                      </td>
                    </tr>
                  )}
                  {!loading && items.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center text-muted py-4">
                        No appointments for this date.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    items.map((apt) => {
                      const status = apt.status || "BOOKED";
                      const badge = STATUS_BADGES[status] || "secondary";
                      const source = apt.source ?? "STAFF";
                      const sourceLabel = source === "PHONE" ? "Phone" : source === "WALKIN" ? "Walk-in" : source === "MOBILE" || source === "OWNER_PORTAL" ? "Online" : "Staff";
                      const intakeStatus = apt.intakeStatus ?? "NOT_STARTED";
                      const intakeBadge = intakeStatus === "COMPLETE" ? "success" : intakeStatus === "PARTIAL" ? "warning" : "secondary";
                      const petName = apt.pet?.name ?? "—";
                      const ownerName =
                        apt.patient?.profile?.displayName || apt.patient?.profile?.username || "—";
                      const doctorName = apt.doctor?.user?.profile?.displayName ?? "—";
                      const serviceName = apt.service?.name ?? "—";
                      const start =
                        apt.scheduledStartAt &&
                        new Date(apt.scheduledStartAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                      return (
                        <tr key={apt.id}>
                          <td>{apt.id}</td>
                          <td>{start ?? "—"}</td>
                          <td>{petName}</td>
                          <td>{ownerName}</td>
                          <td>{doctorName}</td>
                          <td>{serviceName}</td>
                          <td><span className="badge bg-light text-dark radius-12">{sourceLabel}</span></td>
                          <td>
                            <span className={`badge bg-${intakeBadge} radius-12`}>
                              {intakeStatus === "COMPLETE" ? "Complete" : intakeStatus === "PARTIAL" ? "Partial" : "—"}
                            </span>
                          </td>
                          <td>
                            <span className={`badge bg-${badge} radius-12`}>{status}</span>
                          </td>
                          <td className="text-end">
                            <Link
                              href={`/clinic/intake/${apt.id}?branchId=${encodeURIComponent(branchId)}`}
                              className="btn btn-sm btn-outline-secondary me-1 radius-12"
                            >
                              Fill intake
                            </Link>
                            {canCheckIn(status) && (
                              <button
                                type="button"
                                className="btn btn-sm btn-success me-1 radius-12"
                                onClick={() => handleCheckIn(apt.id)}
                                disabled={actioning === apt.id}
                              >
                                {actioning === apt.id ? "..." : "Check-in"}
                              </button>
                            )}
                            {canNoShow(status) && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-dark me-1 radius-12"
                                onClick={() => handleNoShow(apt.id)}
                                disabled={actioning === apt.id}
                              >
                                No-show
                              </button>
                            )}
                            {canCancel(status) && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger radius-12"
                                onClick={() => {
                                  const reason = window.prompt("Cancel reason (optional):");
                                  handleCancel(apt.id, reason || undefined);
                                }}
                                disabled={actioning === apt.id}
                              >
                                Cancel
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
          {branchId && total > 0 && (
            <small className="text-muted d-block mt-2">
              Total: {total} appointment(s)
            </small>
          )}
        </div>
      </div>
    </div>
  );
}
