"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicPatientGet,
  staffClinicPatientUpdate,
} from "@/lib/api";
import { useBreedsByAnimalType } from "@/lib/usePetTaxonomy";
import SubBreedSelect from "@/src/components/clinic/SubBreedSelect";
import AnimalColorSelect from "@/src/components/clinic/AnimalColorSelect";
import CoatPatternSelect from "@/src/components/clinic/CoatPatternSelect";
import AnimalSizeSelect from "@/src/components/clinic/AnimalSizeSelect";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PRIMARY_NOT_FOUND, formatStaffPatientApiError } from "@/lib/clinicNotFoundHelpers";
import {
  staffClinicPatientsPath,
  staffClinicPatientDetailPath,
} from "@/lib/staffClinicPatientRoutes";

const PATIENTS_PERMS = ["clinic.patients.read", "clinic.patients.manage"];

/** Dynamic segment [patientId] is the clinical patient key (= Pet.id). */
export default function StaffBranchClinicPatientEditPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const patientId = useMemo(() => {
    const raw = params?.patientId;
    if (raw == null || raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    breedId: "",
    subBreedId: "",
    colorId: "",
    coatPatternId: "",
    sizeId: "",
    customBreedText: "",
    customColorText: "",
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

  const loadPatient = useCallback(() => {
    if (!branchId || patientId == null) return;
    setLoading(true);
    setError("");
    setErrorCode("");
    staffClinicPatientGet(branchId, patientId)
      .then((data) => {
        if (data) {
          setPatient(data);
          setErrorCode("");
          const allergiesStr = Array.isArray(data.allergies) ? data.allergies.join(", ") : (data.allergies ?? "");
          setForm({
            name: data.name ?? "",
            breedId: data.breedId != null ? String(data.breedId) : "",
            subBreedId: data.subBreedId != null ? String(data.subBreedId) : "",
            colorId: data.colorId != null ? String(data.colorId) : "",
            coatPatternId: data.coatPatternId != null ? String(data.coatPatternId) : "",
            sizeId: data.sizeId != null ? String(data.sizeId) : "",
            customBreedText: data.customBreedText ?? "",
            customColorText: data.customColorText ?? "",
            sex: data.sex ?? "",
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split("T")[0] : "",
            microchipNumber: data.microchipNumber ?? "",
            allergies: allergiesStr,
            bloodType: data.bloodType ?? "",
            notes: data.notes ?? "",
          });
        } else {
          setError(PRIMARY_NOT_FOUND.patient);
          setErrorCode("");
          setPatient(null);
        }
      })
      .catch((err) => {
        const { message, code } = formatStaffPatientApiError(err);
        setError(message);
        setErrorCode(code);
        setPatient(null);
      })
      .finally(() => setLoading(false));
  }, [branchId, patientId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional load sequence for edit form
    loadPatient();
  }, [loadPatient]);

  const { breeds, loading: breedsLoading } = useBreedsByAnimalType(patient?.animalTypeId);

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setErrorCode("");
    if (!form.name?.trim()) {
      setError("Pet name is required.");
      return;
    }
    setSubmitting(true);
    const payload = {
      name: form.name.trim(),
      breedId: form.breedId ? Number(form.breedId) : null,
      subBreedId: form.subBreedId ? Number(form.subBreedId) : null,
      colorId: form.colorId ? Number(form.colorId) : null,
      coatPatternId: form.coatPatternId ? Number(form.coatPatternId) : null,
      sizeId: form.sizeId ? Number(form.sizeId) : null,
      customBreedText: form.customBreedText?.trim() || null,
      customColorText: form.customColorText?.trim() || null,
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
    staffClinicPatientUpdate(branchId, patientId, payload)
      .then(() => router.push(staffClinicPatientDetailPath(branchId, patientId)))
      .catch((err) => {
        const { message, code } = formatStaffPatientApiError(err);
        setError(code ? `${message} (${code})` : message);
        setErrorCode(code || "");
        setSubmitting(false);
      });
  }

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" aria-label="Loading" />
        <p className="mt-16 text-secondary-light">Loading branch…</p>
      </div>
    );
  }

  if (!hasAccess || !hasManage) {
    return (
      <AccessDenied
        missingPerm="clinic.patients.manage"
        onBack={() => router.push(staffClinicPatientsPath(branchId))}
      />
    );
  }

  if (branchId && params?.patientId != null && params.patientId !== "" && patientId == null) {
    return (
      <div className="container py-24">
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        <div className="d-flex align-items-center gap-12 mb-24">
          <Link href={staffClinicPatientsPath(branchId)} className="btn btn-outline-secondary btn-sm">
            ← Patients
          </Link>
        </div>
        <Card title="Invalid patient link">
          <p className="text-secondary mb-16">The patient id in the URL is not valid. Open the patient from the directory list.</p>
          <Link href={staffClinicPatientsPath(branchId)} className="btn btn-sm btn-primary">
            Back to patients
          </Link>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container py-24">
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        <div className="py-24 text-center">
          <div className="spinner-border text-primary" role="status" aria-label="Loading patient" />
          <p className="mt-16 text-secondary-light mb-0">Loading patient…</p>
        </div>
      </div>
    );
  }

  if (error && !patient) {
    return (
      <div className="container py-24">
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        <div className="d-flex align-items-center gap-12 mb-24">
          <Link href={staffClinicPatientsPath(branchId)} className="btn btn-outline-secondary btn-sm">
            ← Patients
          </Link>
        </div>
        <Card title="Edit patient">
          <p className="text-danger mb-2">{error}</p>
          {errorCode ? (
            <p className="text-muted small mb-2">
              API code: <code className="small">{errorCode}</code>
            </p>
          ) : null}
          {errorCode === "PATIENT_NOT_IN_BRANCH" ? (
            <p className="text-muted small mb-3">
              This pet is not linked to this branch (no registration here, no appointment, no visit). Use the Patients list
              or register the pet at this branch.
            </p>
          ) : null}
          {errorCode === "PATIENT_NOT_FOUND" ? (
            <p className="text-muted small mb-3">No pet exists with this id, or the id in the URL does not match the saved record.</p>
          ) : null}
          <div className="d-flex flex-wrap gap-2">
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={loadPatient}>
              Retry
            </button>
            <Link href={staffClinicPatientsPath(branchId)} className="btn btn-sm btn-outline-secondary">
              Back to list
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex align-items-center gap-12 mb-24">
        <Link href={staffClinicPatientDetailPath(branchId, patientId)} className="btn btn-outline-secondary btn-sm">
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
            <label className="form-label">Sub-breed / Variety</label>
            <SubBreedSelect
              breedId={form.breedId}
              value={form.subBreedId}
              onChange={(v) => setForm((f) => ({ ...f, subBreedId: v }))}
              placeholder="—"
            />
          </div>
          <div className="row g-2 mb-3">
            <div className="col-md-6">
              <label className="form-label">Color</label>
              <AnimalColorSelect value={form.colorId} onChange={(v) => setForm((f) => ({ ...f, colorId: v }))} placeholder="—" />
            </div>
            <div className="col-md-6">
              <label className="form-label">Coat pattern</label>
              <CoatPatternSelect value={form.coatPatternId} onChange={(v) => setForm((f) => ({ ...f, coatPatternId: v }))} placeholder="—" />
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label">Size</label>
            <AnimalSizeSelect value={form.sizeId} onChange={(v) => setForm((f) => ({ ...f, sizeId: v }))} placeholder="—" />
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
            <Link href={staffClinicPatientDetailPath(branchId, patientId)} className="btn btn-outline-secondary">
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
