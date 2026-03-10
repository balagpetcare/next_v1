"use client";

import Link from "next/link";

type ActivePatient = {
  appointmentId: number;
  petName?: string;
  ownerName?: string;
  serviceName?: string | null;
  scheduledStartAt?: string | null;
  priority?: string | null;
};

export function ActivePatientWidget({ patient }: { patient?: ActivePatient | null }) {
  return (
    <div className="card radius-12 h-100">
      <div className="card-header d-flex align-items-center justify-content-between">
        <h6 className="mb-0">Now Consulting</h6>
        {patient?.priority === "EMERGENCY" ? (
          <span className="badge bg-danger">Emergency</span>
        ) : null}
      </div>
      <div className="card-body">
        {!patient ? (
          <p className="text-muted small mb-0">No active consultation. Call the next patient from appointments.</p>
        ) : (
          <>
            <h6 className="mb-1">{patient.petName ?? "—"}</h6>
            <p className="small text-muted mb-1">Owner: {patient.ownerName ?? "—"}</p>
            <p className="small text-muted mb-1">Service: {patient.serviceName ?? "—"}</p>
            <p className="small text-muted mb-3">
              Time: {patient.scheduledStartAt ? new Date(patient.scheduledStartAt).toLocaleString() : "—"}
            </p>
            <div className="d-flex flex-wrap gap-2">
              <Link href="/doctor/appointments" className="btn btn-sm btn-primary radius-12">
                Start Consultation
              </Link>
              <Link href={`/doctor/appointments`} className="btn btn-sm btn-outline-secondary radius-12">
                Open Case
              </Link>
              <Link href="/doctor/patients" className="btn btn-sm btn-outline-primary radius-12">
                View History
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
