"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffClinicPatientGet } from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";

const PATIENTS_PERMS = ["clinic.patients.read", "clinic.patients.manage"];

export default function StaffBranchClinicPatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const petId = useMemo(() => (params?.petId ? Number(params.petId) : null), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        if (!cancelled) {
          setPatient(data ?? null);
          setError("");
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setPatient(null);
          setError(e?.message || "Failed to load patient.");
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [branchId, petId]);

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
        missingPerm="clinic.patients.read"
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

  if (error || !patient) {
    return (
      <div className="container py-24">
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        <div className="d-flex align-items-center gap-12 mb-24">
          <Link href={`/staff/branch/${branchId}/clinic/patients`} className="btn btn-outline-secondary btn-sm">
            ← Patients
          </Link>
        </div>
        <Card title="Patient">
          <p className="text-danger mb-0">{error || "Patient not found."}</p>
          <Link href={`/staff/branch/${branchId}/clinic/patients`} className="btn btn-sm btn-outline-primary mt-2">
            Back to list
          </Link>
        </Card>
      </div>
    );
  }

  const ownerText = patient.owner
    ? `${patient.owner.displayName || "—"} ${patient.owner.phone ? `(${patient.owner.phone})` : ""} ${patient.owner.email ? ` ${patient.owner.email}` : ""}`.trim()
    : "—";
  const allergiesText = Array.isArray(patient.allergies) ? patient.allergies.join(", ") || "—" : (patient.allergies ?? "—");

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex align-items-center gap-12 mb-24 flex-wrap">
        <Link href={`/staff/branch/${branchId}/clinic/patients`} className="btn btn-outline-secondary btn-sm">
          ← Patients
        </Link>
        <h5 className="mb-0">Patient: {patient.name}</h5>
        {hasManage && (
          <Link
            href={`/staff/branch/${branchId}/clinic/patients/${petId}/edit`}
            className="btn btn-sm btn-primary ms-auto"
          >
            Edit
          </Link>
        )}
      </div>

      <Card title="Patient details" subtitle={patient.uniquePetId ? `Pet ID: ${patient.uniquePetId}` : undefined}>
        <dl className="row mb-0">
          <dt className="col-sm-3">Pet ID (QR)</dt>
          <dd className="col-sm-9"><code>{patient.uniquePetId || "—"}</code></dd>
          <dt className="col-sm-3">Name</dt>
          <dd className="col-sm-9">{patient.name}</dd>
          <dt className="col-sm-3">Species</dt>
          <dd className="col-sm-9">{patient.animalType?.name ?? "—"}</dd>
          <dt className="col-sm-3">Breed</dt>
          <dd className="col-sm-9">{patient.breed?.name ?? "—"}</dd>
          <dt className="col-sm-3">Sex</dt>
          <dd className="col-sm-9">{patient.sex ?? "—"}</dd>
          <dt className="col-sm-3">Date of birth</dt>
          <dd className="col-sm-9">{patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : "—"}</dd>
          <dt className="col-sm-3">Owner</dt>
          <dd className="col-sm-9">{ownerText}</dd>
          <dt className="col-sm-3">Allergies</dt>
          <dd className="col-sm-9">{allergiesText}</dd>
          <dt className="col-sm-3">Blood type</dt>
          <dd className="col-sm-9">{patient.bloodType || "—"}</dd>
          <dt className="col-sm-3">Microchip</dt>
          <dd className="col-sm-9">{patient.microchipNumber || "—"}</dd>
          <dt className="col-sm-3">Notes</dt>
          <dd className="col-sm-9">{patient.notes || "—"}</dd>
        </dl>
      </Card>
    </div>
  );
}
