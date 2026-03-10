"use client";

const STATUS_BADGES: Record<string, string> = {
  DRAFT: "light",
  PRE_BOOKED: "info",
  BOOKED: "primary",
  CONFIRMED: "info",
  CHECKED_IN: "warning",
  IN_QUEUE: "secondary",
  CALLED: "secondary",
  IN_CONSULT: "secondary",
  COMPLETED: "success",
  CANCELLED: "danger",
  NO_SHOW: "dark",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PRE_BOOKED: "Pre-booked",
  BOOKED: "Booked",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked In",
  IN_QUEUE: "In Queue",
  CALLED: "Called",
  IN_CONSULT: "In Consultation",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

function statusBadgeClass(s: string): string {
  return STATUS_BADGES[s?.toUpperCase()] ?? "bg-light text-dark";
}

function statusLabel(s: string): string {
  return STATUS_LABELS[s?.toUpperCase()] ?? s ?? "—";
}

export interface DoctorAppointmentStatusBadgeProps {
  status: string;
  className?: string;
}

export function DoctorAppointmentStatusBadge({ status, className = "" }: DoctorAppointmentStatusBadgeProps) {
  const variant = statusBadgeClass(status);
  const label = statusLabel(status);
  return (
    <span className={`badge bg-${variant} ${className}`.trim()}>
      {label}
    </span>
  );
}

export { statusBadgeClass, statusLabel, STATUS_BADGES, STATUS_LABELS };
