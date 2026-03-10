"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicPatientGet,
  staffClinicPatientUpdate,
  getBreedsByAnimalType,
} from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";

const PATIENTS_PERMS = ["clinic.patients.read", "clinic.patients.manage"];

export default function StaffBranchClinicPatientEditPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const petId = useMemo(() => (params?.petId ? Number(params.petId) : null), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);
  const [patient, setPatient] = useState(null);
  const [breeds, setBreeds] = useState([]);
  const [breedsLoading, setBreedsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    breedId: "",
    sex: "",
    dateOfBirth: "",
    microchipNumber: "",
    allergies: "",
    bloodType: "",
    notes: "",
  });

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = PATIENTS_PERMS.some((p) => permissions.includes(p));
  const hasManage = permissions.includes("clinic.patients.manage");

  useEffect(() => {
    if (!branchId || petId == null) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    staffClinicPatientGet(branchId, petId)
      .then((data) => {
        if (!cancelled && data) {
          setPatient(data);
          const allergiesStr = Array.isArray(data.allergies) ? data.allergies.join(", ") : (data.allergies ?? "");
          setForm({
            name: data.name ?? "",
            breedId: data.breedId != null ? String(data.breedId) : "",
            sex: data.sex ?? "",
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split("T")[0] : "",
            microchipNumber: data.microchipNumber ?? "",
            allergies: allergiesStr,
            bloodType: data.bloodType ?? "",
            notes: data.notes ?? "",
          });
        } else if (!cancelled) {
          setError("Patient not found.");
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message || "Failed to load patient.");
          setPatient(null);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [branchId, petId]);

  useEffect(() => {
    if (!patient?.animalTypeId) {
      setBreeds([]);
      return;
    }
    setBreedsLoading(true);
    getBreedsByAnimalType(patient.animalTypeId)
      .then((b) => setBreeds(Array.isArray(b) ? b : []))
      .catch(() => setBreeds([]))
      .finally(() => setBreedsLoading(false));
  }, [patient?.animalTypeId]);

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.name?.trim()) {
      setError("Pet name is required.");
      return;
    }
    setSubmitting(true);
    const payload = {
      name: form.name.trim(),
      breedId: form.breedId ? Number(form.breedId) : null,
      sex: form.sex || undefined,
      dateOfBirth: form.dateOfBirth || null,
      microchipNumber: form.microchipNumber?.trim() || null,
      bloodType: form.bloodType?.trim() || null,
      notes: form.notes?.trim() || null,
    };
    if (form.allergies?.trim()) {
      payload.allergies = form.allergies.split(",").map((s) => s.trim()).filter(Boolean);
    } else {
      payload.allergies = [];
    }
    staffClinicPatientUpdate(branchId, petId, payload)
      .then(() => router.push(`/staff/branch/${branchId}/clinic/patients/${petId}`))
      .catch((err) => {
        setError(err?.message || "Update failed.");
        setSubmitting(false);
      });
  }

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }

  if (!hasAccess || !hasManage) {
    return (
      <AccessDenied
        missingPerm="clinic.patients.manage"
        onBack={() => router.push(`/staff/branch/${branchId}/clinic/patients`)}
      />
    );
  }

  if (loading) {
    return (
      <div className="container py-24">
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        <div className="py-24 text-center text-secondary-light">Loading...</div>
      </div>
    );
  }

  if (error && !patient) {
    return (
      <div className="container py-24">
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        <div className="d-flex align-items-center gap-12 mb-24">
          <Link href={`/staff/branch/${branchId}/clinic/patients/${petId}`} className="btn btn-outline-secondary btn-sm">
            ← Back
          </Link>
        </div>
        <Card title="Edit patient">
          <p className="text-danger mb-0">{error}</p>
          <Link href={`/staff/branch/${branchId}/clinic/patients`} className="btn btn-sm btn-outline-primary mt-2">
            Back to list
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex align-items-center gap-12 mb-24">
        <Link href={`/staff/branch/${branchId}/clinic/patients/${petId}`} className="btn btn-outline-secondary btn-sm">
          ← Back to patient
        </Link>
        <h5 className="mb-0">Edit patient</h5>
      </div>

      <Card title="Edit patient" subtitle={patient?.name ? `Editing: ${patient.name}` : undefined}>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="alert alert-danger py-2 mb-16" role="alert">
              {error}
            </div>
          )}
          <div className="mb-3">
            <label className="form-label">Pet name *</label>
            <input
              type="text"
              className="form-control"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Species</label>
            <input
              type="text"
              className="form-control"
              value={patient?.animalType?.name ?? "—"}
              disabled
              readOnly
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Breed</label>
            <select
              className="form-select"
              value={form.breedId}
              onChange={(e) => setForm((f) => ({ ...f, breedId: e.target.value }))}
              disabled={breedsLoading}
            >
              <option value="">—</option>
              {breeds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Sex</label>
            <select
              className="form-select"
              value={form.sex}
              onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value }))}
            >
              <option value="">—</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Date of birth</label>
            <input
              type="date"
              className="form-control"
              value={form.dateOfBirth}
              onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Microchip number</label>
            <input
              type="text"
              className="form-control"
              value={form.microchipNumber}
              onChange={(e) => setForm((f) => ({ ...f, microchipNumber: e.target.value }))}
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Allergies (comma-separated)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Chicken, Pollen"
              value={form.allergies}
              onChange={(e) => setForm((f) => ({ ...f, allergies: e.target.value }))}
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Blood type</label>
            <input
              type="text"
              className="form-control"
              value={form.bloodType}
              onChange={(e) => setForm((f) => ({ ...f, bloodType: e.target.value }))}
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Notes</label>
            <textarea
              className="form-control"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="d-flex gap-2">
            <Link href={`/staff/branch/${branchId}/clinic/patients/${petId}`} className="btn btn-outline-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
