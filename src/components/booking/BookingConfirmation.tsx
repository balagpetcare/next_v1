"use client";

import type { BookingWizardState } from "@/src/types/appointment";

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return iso;
  }
}

function formatTime(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export interface BookingConfirmationProps {
  state: BookingWizardState;
  onConfirm: () => void;
  confirming?: boolean;
  confirmLabel?: string;
}

export default function BookingConfirmation({
  state,
  onConfirm,
  confirming,
  confirmLabel = "Confirm booking",
}: BookingConfirmationProps) {
  const rows: { label: string; value: string }[] = [
    { label: "Patient", value: state.patientName ?? (state.patientId ? `#${state.patientId}` : "—") },
    { label: "Pet", value: state.petName ?? (state.petId ? `#${state.petId}` : "—") },
    { label: "Type", value: state.appointmentType?.replace(/_/g, " ") ?? "—" },
    { label: "Service / Package", value: state.serviceName ?? state.packageName ?? "—" },
    { label: "Doctor", value: state.doctorName ?? (state.doctorId === "auto" ? "Any available" : "—") },
    { label: "Date", value: formatDate(state.date) },
    { label: "Time", value: state.slotStart && state.slotEnd ? `${formatTime(state.slotStart)} – ${formatTime(state.slotEnd)}` : "—" },
    { label: "Notes", value: state.notes ?? "—" },
    { label: "Special instructions", value: state.specialInstructions ?? "—" },
  ];

  return (
    <div className="card">
      <div className="card-header fw-semibold">Review & confirm</div>
      <div className="card-body">
        <dl className="row mb-0 small">
          {rows.map((r) => (
            <span key={r.label} className="d-flex mb-2">
              <dt className="col-5 text-muted">{r.label}</dt>
              <dd className="col-7 mb-0">{r.value}</dd>
            </span>
          ))}
        </dl>
        {state.pricePreview && (
          <div className="mt-2 pt-2 border-top">
            <strong>Total:</strong>{" "}
            {new Intl.NumberFormat(undefined, { style: "currency", currency: "BDT", minimumFractionDigits: 0 }).format(
              state.pricePreview.totalPrice
            )}
          </div>
        )}
        <div className="mt-3">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? "Confirming…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
