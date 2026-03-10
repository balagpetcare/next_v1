"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ownerClinicScheduleExceptions,
  ownerClinicScheduleExceptionCreate,
  ownerClinicScheduleExceptionDelete,
  ownerClinicStaff,
} from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

type ExceptionItem = {
  id: number;
  doctorId: number;
  date: string;
  type: string;
  startTime?: string;
  endTime?: string;
  note?: string;
  doctor?: { id: number; user?: { profile?: { displayName?: string } } };
};

export default function ClinicScheduleExceptionsPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const [exceptions, setExceptions] = useState<ExceptionItem[]>([]);
  const [staff, setStaff] = useState<{ id: number; userId: number; user?: { profile?: { displayName?: string } } }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ doctorId: "", date: "", type: "OFF", startTime: "", endTime: "", note: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      setError("");
      const [exList, staffRes] = await Promise.all([
        ownerClinicScheduleExceptions(branchId),
        ownerClinicStaff(branchId),
      ]);
      setExceptions(Array.isArray(exList) ? exList : []);
      const members = (staffRes as { members?: typeof staff })?.members ?? [];
      setStaff(Array.isArray(members) ? members : []);
    } catch (e) {
      setError((e as Error)?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [branchId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId || !form.doctorId || !form.date || !form.type) return;
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await ownerClinicScheduleExceptionCreate(branchId, {
        doctorId: parseInt(form.doctorId, 10),
        date: form.date,
        type: form.type,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        note: form.note || undefined,
      });
      setSuccess("Exception added.");
      setForm({ doctorId: form.doctorId, date: "", type: "OFF", startTime: "", endTime: "", note: "" });
      load();
    } catch (e) {
      setError((e as Error)?.message || "Failed to add");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (exceptionId: number) => {
    if (!branchId || !confirm("Remove this exception?")) return;
    try {
      setError("");
      await ownerClinicScheduleExceptionDelete(branchId, exceptionId);
      load();
    } catch (e) {
      setError((e as Error)?.message || "Failed to delete");
    }
  };

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Schedule Exceptions"
        subtitle={`Branch #${branchId}`}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Schedule", href: `/owner/clinic/${branchId}/schedule` },
          { label: "Exceptions", href: `/owner/clinic/${branchId}/schedule/exceptions` },
        ]}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-3">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success radius-12 mb-3">
          {success}
        </div>
      )}

      <div className="card radius-12 mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3">Add exception (day off / extra shift)</h5>
          <form onSubmit={handleAdd} className="row g-2 align-items-end">
            <div className="col-auto">
              <label className="form-label small mb-0">Doctor</label>
              <select
                className="form-select form-select-sm"
                value={form.doctorId}
                onChange={(e) => setForm((f) => ({ ...f, doctorId: e.target.value }))}
                required
              >
                <option value="">Select</option>
                {staff.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.user?.profile?.displayName ?? `Member #${m.id}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-auto">
              <label className="form-label small mb-0">Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                required
              />
            </div>
            <div className="col-auto">
              <label className="form-label small mb-0">Type</label>
              <select
                className="form-select form-select-sm"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="OFF">Day off</option>
                <option value="EXTRA_SHIFT">Extra shift</option>
                <option value="CUSTOM_SLOTS">Custom slots</option>
              </select>
            </div>
            <div className="col-auto">
              <label className="form-label small mb-0">Start</label>
              <input
                type="time"
                className="form-control form-control-sm"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              />
            </div>
            <div className="col-auto">
              <label className="form-label small mb-0">End</label>
              <input
                type="time"
                className="form-control form-control-sm"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              />
            </div>
            <div className="col-auto">
              <label className="form-label small mb-0">Note</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Note"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>
            <div className="col-auto">
              <button type="submit" className="btn btn-primary btn-sm radius-12" disabled={saving}>
                {saving ? "Adding…" : "Add"}
              </button>
            </div>
          </form>
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
            <h5 className="card-title mb-3">Exceptions</h5>
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Time</th>
                    <th>Note</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {exceptions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-muted text-center py-4">
                        No exceptions
                      </td>
                    </tr>
                  ) : (
                    exceptions.map((ex) => (
                      <tr key={ex.id}>
                        <td>{ex.doctor?.user?.profile?.displayName ?? `#${ex.doctorId}`}</td>
                        <td>{ex.date}</td>
                        <td>{ex.type}</td>
                        <td>{ex.startTime && ex.endTime ? `${ex.startTime}–${ex.endTime}` : "-"}</td>
                        <td>{ex.note ?? "-"}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(ex.id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="mt-3">
        <Link href={`/owner/clinic/${branchId}/schedule`} className="btn btn-outline-secondary radius-12">
          ← Schedule
        </Link>
      </div>
    </div>
  );
}
