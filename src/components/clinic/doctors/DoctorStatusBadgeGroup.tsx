"use client";

type Props = {
  status?: string;
  contractStatus?: string;
  bookingStatus?: string;
  assignmentType?: string;
  registrationStatus?: string;
  className?: string;
};

const statusVariant: Record<string, string> = {
  ACTIVE: "bg-success-subtle text-success-emphasis",
  INACTIVE: "bg-secondary-subtle text-secondary-emphasis",
  PENDING: "bg-warning-subtle text-warning-emphasis",
  Verified: "bg-success-subtle text-success-emphasis",
  REGISTERED: "bg-success-subtle text-success-emphasis",
  enabled: "bg-success-subtle text-success-emphasis",
  disabled: "bg-secondary-subtle text-secondary-emphasis",
  FULL_TIME: "bg-primary-subtle text-primary-emphasis",
  VISITING: "bg-info-subtle text-info-emphasis",
};

function variant(s: string): string {
  return statusVariant[s] ?? "bg-secondary-subtle text-secondary-emphasis";
}

export default function DoctorStatusBadgeGroup({
  status,
  contractStatus,
  bookingStatus,
  assignmentType,
  registrationStatus,
  className = "",
}: Props) {
  const badges: { label: string; value?: string }[] = [];
  if (status) badges.push({ label: status });
  if (contractStatus) badges.push({ label: contractStatus });
  if (bookingStatus) badges.push({ label: bookingStatus === "enabled" ? "Booking on" : "Booking off" });
  if (assignmentType) badges.push({ label: assignmentType });
  if (registrationStatus) badges.push({ label: registrationStatus });

  return (
    <div className={`d-flex flex-wrap gap-1 ${className}`}>
      {badges.map((b, i) => (
        <span
          key={i}
          className={`badge radius-8 ${variant(b.label)}`}
          style={{ fontSize: "0.7rem" }}
        >
          {b.label}
        </span>
      ))}
    </div>
  );
}
