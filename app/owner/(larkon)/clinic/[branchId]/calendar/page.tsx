"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ownerClinicSlots, ownerClinicAppointments } from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

type SlotRow = { start: string; end: string; doctorId: number };

type AppointmentRow = {
  id: number;
  scheduledStartAt: string;
  scheduledEndAt: string;
  doctorId: number;
  status: string;
  patient?: { profile?: { displayName?: string } };
  service?: { name?: string };
};

export default function ClinicCalendarPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!branchId || !date) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const [slotList, apptResult] = await Promise.all([
          ownerClinicSlots(branchId, { date, doctorId: undefined, serviceId: undefined }),
          ownerClinicAppointments(branchId, { date, limit: 200 }),
        ]);
        if (cancelled) return;
        const slotArray = Array.isArray(slotList) ? (slotList as SlotRow[]) : [];
        setSlots(slotArray);
        const items = (apptResult as { items?: AppointmentRow[] })?.items ?? [];
        setAppointments(items);
      } catch (e) {
        if (!cancelled) setError((e as Error)?.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [branchId, date]);

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Calendar"
        subtitle={"Branch #" + branchId}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: "/owner/clinic/" + branchId },
          { label: "Calendar", href: "/owner/clinic/" + branchId + "/calendar" },
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
          <div className="d-flex flex-wrap align-items-center gap-3">
            <label className="mb-0">Date</label>
            <input type="date" className="form-control" style={{ width: "auto" }} value={date} onChange={(e) => setDate(e.target.value)} />
            <Link href={"/owner/clinic/" + branchId + "/appointments"} className="btn btn-outline-primary radius-12">
              Appointments list
            </Link>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status" />
          </div>
        </div>
      ) : (
        <div className="card radius-12">
          <div className="card-body">
            <h5 className="card-title mb-3">Day view — {date}</h5>
            <p className="text-muted small">
              Available slots: {slots.length}. Booked: {appointments.filter((a) => !["CANCELLED", "NO_SHOW"].includes(a.status)).length}.
            </p>
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Patient / Service</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments
                    .filter((a) => !["CANCELLED", "NO_SHOW"].includes(a.status))
                    .sort((a, b) => new Date(a.scheduledStartAt).getTime() - new Date(b.scheduledStartAt).getTime())
                    .map((a) => (
                      <tr key={a.id}>
                        <td>
                          {new Date(a.scheduledStartAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                          {" – "}
                          {new Date(a.scheduledEndAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td>
                          <span className="badge bg-primary">{a.status}</span>
                        </td>
                        <td>
                          {(a.patient?.profile?.displayName ?? "-") + " / " + (a.service?.name ?? "-")}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {appointments.filter((a) => !["CANCELLED", "NO_SHOW"].includes(a.status)).length === 0 && <p className="text-muted mb-0">No bookings for this day.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
