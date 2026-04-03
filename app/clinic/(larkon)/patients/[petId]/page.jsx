"use client";

/** Read-only /clinic/patients/[petId]?branchId= — parallel to staff patient-detail; same API. See docs/CLINIC_STANDALONE_VS_STAFF_PATIENT_ROUTES.md. */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { staffClinicPatientGet } from "@/lib/api";
import { PRIMARY_NOT_FOUND } from "@/lib/clinicNotFoundHelpers";

export default function ClinicPatientDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const petId = params?.petId ? Number(params.petId) : null;
  const branchId = searchParams?.get("branchId") || "";
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPatient = useCallback(async () => {
    if (!branchId || !petId) return;
    setLoading(true);
    setError("");
    try {
      const data = await staffClinicPatientGet(branchId, petId);
      setPatient(data ?? null);
      setError("");
    } catch {
      setPatient(null);
      setError(PRIMARY_NOT_FOUND.patient);
    } finally {
      setLoading(false);
    }
  }, [branchId, petId]);

  useEffect(() => {
    loadPatient();
  }, [loadPatient]);

  if (!branchId) {
    return (
      <div className="dashboard-main-body">
        <div className="card radius-12">
          <div className="card-body">
            <p className="text-muted mb-0">Missing branchId. Open from patients list with branch context.</p>
            <Link href="/clinic/patients" className="btn btn-sm btn-outline-primary mt-2">Back to Patients</Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard-main-body">
        <div className="card radius-12"><div className="card-body">Loading...</div></div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="dashboard-main-body">
        <div className="card radius-12">
          <div className="card-body">
            <p className="text-danger mb-2">{error || PRIMARY_NOT_FOUND.patient}</p>
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={loadPatient}>Retry</button>
              <Link href={`/clinic/patients?branchId=${branchId}`} className="btn btn-sm btn-outline-secondary">Back to Patients</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <div className="card radius-12">
        <div className="card-header d-flex align-items-center justify-content-between">
          <h6 className="mb-0">Patient: {patient.name}</h6>
          <Link href={`/clinic/patients?branchId=${branchId}`} className="btn btn-sm btn-outline-primary radius-12">Back to list</Link>
        </div>
        <div className="card-body">
          <dl className="row mb-0">
            <dt className="col-sm-3">Pet ID (QR)</dt>
            <dd className="col-sm-9"><code>{patient.uniquePetId || "—"}</code></dd>
            <dt className="col-sm-3">Name</dt>
            <dd className="col-sm-9">{patient.name}</dd>
            <dt className="col-sm-3">Species</dt>
            <dd className="col-sm-9">{patient.animalType?.name ?? "—"}</dd>
            <dt className="col-sm-3">Breed</dt>
            <dd className="col-sm-9">{patient.breed?.name ?? "—"}</dd>
            <dt className="col-sm-3">Owner</dt>
            <dd className="col-sm-9">
              {patient.owner
                ? `${patient.owner.displayName || "—"} ${patient.owner.phone ? `(${patient.owner.phone})` : ""} ${patient.owner.email ? ` ${patient.owner.email}` : ""}`
                : "—"}
            </dd>
            <dt className="col-sm-3">Allergies</dt>
            <dd className="col-sm-9">{Array.isArray(patient.allergies) ? patient.allergies.join(", ") || "—" : (patient.allergies ?? "—")}</dd>
            <dt className="col-sm-3">Blood type</dt>
            <dd className="col-sm-9">{patient.bloodType || "—"}</dd>
            <dt className="col-sm-3">Microchip</dt>
            <dd className="col-sm-9">{patient.microchipNumber || "—"}</dd>
            <dt className="col-sm-3">Notes</dt>
            <dd className="col-sm-9">{patient.notes || "—"}</dd>
          </dl>
        </div>
      </div>
    </div>
  );
}
