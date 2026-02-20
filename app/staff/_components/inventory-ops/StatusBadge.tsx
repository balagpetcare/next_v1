"use client";

type StatusBadgeProps = {
  status: string;
  className?: string;
};

const STATUS_CLASSES: Record<string, string> = {
  DRAFT: "bg-secondary",
  SUBMITTED: "bg-info",
  PENDING: "bg-warning text-dark",
  PENDING_REVIEW: "bg-warning text-dark",
  APPROVED: "bg-success",
  RECEIVED: "bg-success",
  POSTED: "bg-success",
  REJECTED: "bg-danger",
  CANCELLED: "bg-secondary",
  IN_TRANSIT: "bg-info",
  SENT: "bg-info",
  PARTIAL: "bg-warning text-dark",
  PARTIAL_RECEIVED: "bg-warning text-dark",
  COMPLETED: "bg-success",
  DISPUTED: "bg-danger",
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const s = String(status ?? "").toUpperCase();
  const bg = STATUS_CLASSES[s] ?? "bg-light text-dark";
  return <span className={`badge ${bg} ${className}`}>{status || "—"}</span>;
}
