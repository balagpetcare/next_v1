"use client";

/**
 * Unified status badge for catalog entities. Never show raw enum in UI.
 */

import { formatApprovalRequestType } from "./catalogFormatters";

const STATUS_CLASSES: Record<string, string> = {
  ACTIVE: "bg-success-subtle text-success-emphasis",
  INACTIVE: "bg-secondary-subtle text-secondary-emphasis",
  DRAFT: "bg-warning-subtle text-warning-emphasis",
  PENDING: "bg-info-subtle text-info-emphasis",
  PENDING_APPROVAL: "bg-info-subtle text-info-emphasis",
  APPROVED: "bg-success-subtle text-success-emphasis",
  REJECTED: "bg-danger-subtle text-danger-emphasis",
  SUSPENDED: "bg-secondary-subtle text-secondary-emphasis",
  ENDED: "bg-secondary-subtle text-secondary-emphasis",
};

function humanizeStatus(value: string): string {
  if (!value) return "—";
  const s = String(value).trim();
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface CatalogStatusBadgeProps {
  status: string;
  /** Use for approval request type display (humanized label) */
  asRequestType?: boolean;
  className?: string;
}

export default function CatalogStatusBadge({
  status,
  asRequestType = false,
  className = "",
}: CatalogStatusBadgeProps) {
  const label = asRequestType ? formatApprovalRequestType(status) : humanizeStatus(status);
  const variant = STATUS_CLASSES[status] ?? "bg-secondary-subtle text-secondary-emphasis";
  return (
    <span
      className={`badge radius-8 ${variant} ${className}`}
      title={status}
    >
      {label}
    </span>
  );
}
