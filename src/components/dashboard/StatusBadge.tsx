"use client";

import { humanizeEnum } from "@/src/lib/displayFormatters";

/**
 * Standard status → Bootstrap badge variant (bg-*).
 * Covers: Draft, Pending, Approved, Rejected, Active, Completed, Cancelled, Expired, Error/Warning.
 */
const STATUS_VARIANT: Record<string, string> = {
  // Draft / secondary
  DRAFT: "secondary",
  // Pending / in progress
  PENDING: "warning",
  PENDING_APPROVAL: "warning",
  UNDER_REVIEW: "warning",
  OWNER_REVIEW: "warning",
  SUBMITTED: "warning",
  BOOKED: "info",
  PRE_BOOKED: "info",
  CONFIRMED: "info",
  CHECKED_IN: "warning",
  IN_QUEUE: "warning",
  CALLED: "info",
  IN_CONSULT: "info",
  IN_PROGRESS: "info",
  NOT_STARTED: "secondary",
  PARTIAL: "warning",
  PARTIAL_APPROVAL: "info",
  PARTIAL_APPROVED: "info",
  PARTIALLY_APPROVED: "info",
  PARTIALLY_RECEIVED: "info",
  // Success / completed / approved
  APPROVED: "success",
  COMPLETED: "success",
  COMPLETE: "success",
  ACTIVE: "success",
  VERIFIED: "success",
  REGISTERED: "success",
  PAID: "success",
  RECEIVED: "success",
  CLOSED: "success",
  USED: "success",
  ORDERED: "primary",
  DISPATCHED: "primary",
  // Rejected / cancelled / danger
  REJECTED: "danger",
  CANCELLED: "danger",
  NO_SHOW: "dark",
  INACTIVE: "secondary",
  SUSPENDED: "secondary",
  ENDED: "secondary",
  // Expired / dark
  EXPIRED: "dark",
  // Error / warning states
  ERROR: "danger",
  WARNING: "warning",
  // Visit type / priority (for badges that show type, not workflow status)
  EMERGENCY: "danger",
  VIP: "info",
  NORMAL: "secondary",
  WALK_IN: "primary",
  SCHEDULED: "info",
  CREATED: "secondary",
  VALIDATED_IN_QUEUE: "info",
  ADMINISTERED: "success",
};

function getVariant(status: string | null | undefined): string {
  if (status == null || status === "") return "secondary";
  const key = String(status).toUpperCase().replace(/-/g, "_");
  return STATUS_VARIANT[key] ?? STATUS_VARIANT[status] ?? "secondary";
}

export type StatusBadgeProps = {
  /** Raw status value (e.g. APPROVED, DRAFT, IN_PROGRESS). */
  status: string | null | undefined;
  /** Override display label; default is humanizeEnum(status). */
  label?: string;
  /** Optional extra class names. */
  className?: string;
  /** Use subtle badge style (bg-*-subtle text-*-emphasis) instead of solid. */
  subtle?: boolean;
};

export default function StatusBadge({ status, label, className = "", subtle = false }: StatusBadgeProps) {
  const variant = getVariant(status);
  const displayLabel = label ?? (status != null && status !== "" ? humanizeEnum(status) : "—");
  const baseClass = subtle ? `bg-${variant}-subtle text-${variant}-emphasis` : `bg-${variant}`;
  return (
    <span className={`badge ${baseClass} ${className}`.trim()} title={status ?? undefined}>
      {displayLabel}
    </span>
  );
}
