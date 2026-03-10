"use client";

import { DoctorPaymentBadge } from "./DoctorPaymentBadge";

export interface AppointmentDetailForSnapshot {
  id?: number;
  scheduledStartAt?: string | null;
  patient?: { profile?: { displayName?: string }; auth?: { phone?: string; email?: string } };
  ownerNameSnapshot?: string | null;
  mobileSnapshot?: string | null;
  pet?: {
    name?: string;
    sex?: string;
    dateOfBirth?: string | null;
    uniquePetId?: string | null;
    animalType?: { name?: string };
    breed?: { name?: string };
    weights?: { weightKg?: number; recordedAt?: string }[];
  };
  petNameSnapshot?: string | null;
  branch?: { name?: string };
  service?: { name?: string };
  intake?: { chiefComplaint?: string };
  notes?: string | null;
  paymentStatus?: string | null;
  source?: string;
  visitType?: string;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <h6 className="text-secondary border-bottom pb-1 mb-2">{title}</h6>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="d-flex justify-content-between small">
      <span className="text-muted">{label}</span>
      <span>{value ?? "—"}</span>
    </div>
  );
}

function ageFromDob(dob: string | null | undefined): string {
  if (!dob) return "—";
  const d = new Date(dob);
  const now = new Date();
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (months < 12) return String(months) + " mo";
  const years = Math.floor(months / 12);
  return years === 1 ? "1 year" : String(years) + " years";
}

function latestWeight(weights?: { weightKg?: number }[]): string {
  const w = weights?.[0]?.weightKg;
  return w != null ? String(w) + " kg" : "—";
}

export interface PatientSnapshotCardProps {
  appointment: AppointmentDetailForSnapshot | null;
}

export function PatientSnapshotCard({ appointment: a }: PatientSnapshotCardProps) {
  if (!a) return null;

  const patientName = a?.patient?.profile?.displayName ?? a?.ownerNameSnapshot ?? "—";
  const petName = a?.pet?.name ?? a?.petNameSnapshot ?? "—";
  const phone = a?.patient?.auth?.phone ?? a?.mobileSnapshot ?? "—";
  const branchName = a?.branch?.name ?? "—";
  const serviceName = a?.service?.name ?? "—";
  const chiefComplaint = a?.intake?.chiefComplaint ?? a?.notes ?? "—";

  return (
    <>
      <Section title="Patient / Owner">
        <div className="d-flex align-items-center gap-2 mb-2">
          <div
            className="rounded-circle bg-light d-flex align-items-center justify-content-center text-muted"
            style={{ width: 40, height: 40, fontSize: "1.25rem" }}
            aria-hidden
          >
            🐾
          </div>
          <div>
            <strong>{petName}</strong>
            <span className="d-block small text-muted">{a?.pet?.animalType?.name ?? "Pet"}</span>
          </div>
        </div>
        <Row label="Species" value={a?.pet?.animalType?.name} />
        <Row label="Breed" value={a?.pet?.breed?.name} />
        <Row label="Sex" value={a?.pet?.sex} />
        <Row label="Age" value={ageFromDob(a?.pet?.dateOfBirth)} />
        <Row label="Weight" value={latestWeight(a?.pet?.weights)} />
        <Row label="Registration ID" value={a?.pet?.uniquePetId} />
        <Row label="Owner" value={patientName} />
        <Row label="Phone" value={phone} />
        {a?.patient?.auth?.email && <Row label="Email" value={a.patient.auth.email} />}
      </Section>

      <Section title="Visit Information">
        <Row label="Appointment" value={a.id != null ? "#" + a.id : "—"} />
        <Row label="Branch" value={branchName} />
        <Row label="Time" value={a.scheduledStartAt ? new Date(a.scheduledStartAt).toLocaleString() : "—"} />
        <Row label="Source" value={a.source} />
        <Row label="Visit type" value={a.visitType} />
        <Row label="Service" value={serviceName} />
        <Row label="Chief complaint" value={chiefComplaint} />
        <Row label="Payment" value={<DoctorPaymentBadge paymentStatus={a.paymentStatus} />} />
      </Section>
    </>
  );
}
