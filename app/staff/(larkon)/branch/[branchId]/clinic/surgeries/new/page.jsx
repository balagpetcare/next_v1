"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicSurgeryCreate,
  staffClinicPatientsList,
  staffClinicDoctorsEnriched,
  staffClinicServices,
  staffClinicRoomsList,
} from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace } from "@/src/components/dashboard";

const SURGERY_CREATE_PERMS = ["clinic.surgery.create", "clinic.surgery.manage", "clinic.surgery.read"];

export default function StaffBranchClinicSurgeryNewPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [services, setServices] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    petId: "",
    patientId: "",
    serviceId: "",
    primaryDoctorId: "",
    roomId: "",
    scheduledStartAt: "",
    scheduledEndAt: "",
    priority: "NORMAL",
  });

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = SURGERY_CREATE_PERMS.some((p) => permissions.includes(p));

  useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    Promise.all([
      staffClinicPatientsList(branchId, { limit: 500 }).then((d) => setPatients(d?.patients ?? [])),
      staffClinicDoctorsEnriched(branchId, { limit: 200 }).then((r) => setDoctors(r?.items ?? [])),
      staffClinicServices(branchId).then((s) => setServices(Array.isArray(s) ? s : [])),
      staffClinicRoomsList(branchId).then((r) => setRooms(r?.items ?? [])),
    ]).catch(() => setError("Failed to load form options")).finally(() => setLoading(false));
  }, [branchId]);

  const onSelectPet = (pet) => {
    const patientId = pet?.owner?.userId ?? pet?.userId ?? "";
    setForm((f) => ({ ...f, petId: pet?.id ?? "", patientId: String(patientId) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const patientId = Number(form.patientId);
    const petId = Number(form.petId);
    const serviceId = Number(form.serviceId);
    const primaryDoctorId = Number(form.primaryDoctorId);
    if (!patientId || !petId || !serviceId || !primaryDoctorId) {
      setError("Patient (pet), Service, and Primary surgeon are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    const body = {
      patientId,
      petId,
      serviceId,
      primaryDoctorId,
      priority: form.priority || "NORMAL",
    };
    if (form.roomId) body.roomId = Number(form.roomId);
    if (form.scheduledStartAt) body.scheduledStartAt = new Date(form.scheduledStartAt).toISOString();
    if (form.scheduledEndAt) body.scheduledEndAt = new Date(form.scheduledEndAt).toISOString();
    staffClinicSurgeryCreate(branchId, body)
      .then((created) => {
        const id = created?.id ?? created?.data?.id;
        if (id) router.push(`/staff/branch/${branchId}/clinic/surgeries/${id}`);
        else router.push(`/staff/branch/${branchId}/clinic/surgeries`);
      })
      .catch((e) => {
        setError(e?.message || "Failed to create surgery case");
      })
      .finally(() => setSubmitting(false));
  };

  if (ctxLoading) {
    return (
      <div className="py-40 px-3 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        missingPerm="clinic.surgery.create"
        onBack={() => router.push(`/staff/branch/${branchId}/clinic/surgeries`)}
      />
    );
  }

  return (
    <PageWorkspace>
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex align-items-center gap-12 mb-24">
        <Link href={`/staff/branch/${branchId}/clinic/surgeries`} className="btn btn-outline-secondary btn-sm">
          ← Surgeries
        </Link>
        <h5 className="mb-0">New surgery case</h5>
      </div>

      {error && <div className="alert alert-danger mb-16">{error}</div>}

      <Card title="Create surgery" subtitle="Required: patient (pet), service, primary surgeon.">
        {loading ? (
          <div className="text-center py-24">
            <div className="spinner-border text-primary" role="status" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label">Patient (Pet) *</label>
              <select
                className="form-select"
                value={form.petId}
                onChange={(e) => {
                  const pet = patients.find((p) => String(p.id) === e.target.value);
                  onSelectPet(pet);
                }}
                required
              >
                <option value="">Select pet…</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name ?? `Pet #${p.id}`} {p.owner?.displayName ? ` (${p.owner.displayName})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">Service *</label>
              <select
                className="form-select"
                value={form.serviceId}
                onChange={(e) => setForm((f) => ({ ...f, serviceId: e.target.value }))}
                required
              >
                <option value="">Select service…</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">Primary surgeon *</label>
              <select
                className="form-select"
                value={form.primaryDoctorId}
                onChange={(e) => setForm((f) => ({ ...f, primaryDoctorId: e.target.value }))}
                required
              >
                <option value="">Select doctor…</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.user?.profile?.displayName ?? d.displayName ?? `Member #${d.id}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">OT room</label>
              <select
                className="form-select"
                value={form.roomId}
                onChange={(e) => setForm((f) => ({ ...f, roomId: e.target.value }))}
              >
                <option value="">—</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.name ?? r.code ?? `Room #${r.id}`}</option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">Scheduled start</label>
              <input
                type="datetime-local"
                className="form-control"
                value={form.scheduledStartAt}
                onChange={(e) => setForm((f) => ({ ...f, scheduledStartAt: e.target.value }))}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">Scheduled end</label>
              <input
                type="datetime-local"
                className="form-control"
                value={form.scheduledEndAt}
                onChange={(e) => setForm((f) => ({ ...f, scheduledEndAt: e.target.value }))}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">Priority</label>
              <select
                className="form-select"
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              >
                <option value="NORMAL">Normal</option>
                <option value="URGENT">Urgent</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
            </div>
            <div className="col-12 d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Creating…" : "Create surgery"}
              </button>
              <Link href={`/staff/branch/${branchId}/clinic/surgeries`} className="btn btn-outline-secondary">
                Cancel
              </Link>
            </div>
          </form>
        )}
      </Card>
    </PageWorkspace>
  );
}
