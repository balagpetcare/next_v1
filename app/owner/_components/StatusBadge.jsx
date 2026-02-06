"use client";

/**
 * Consistent status badges for Branch, Access, KYC, Transfer (IA standard).
 * Branch: ACTIVE | SUSPENDED | DRAFT
 * Access: PENDING | APPROVED | REJECTED | SUSPENDED
 * KYC: NOT_SUBMITTED | SUBMITTED | VERIFIED | REJECTED
 * Transfer: DRAFT | REQUESTED | APPROVED | IN_TRANSIT | RECEIVED | CANCELLED
 */
export default function StatusBadge({ status }) {
  const s = String(status || "").toUpperCase().replace(/-/g, "_");
  const map = {
    DRAFT: "secondary",
    SUBMITTED: "info",
    PENDING: "warning",
    PENDING_REVIEW: "warning",
    APPROVED: "success",
    REJECTED: "danger",
    REVOKED: "danger",
    CANCELLED: "dark",
    SUSPENDED: "dark",
    ACTIVE: "success",
    INACTIVE: "secondary",
    NOT_SUBMITTED: "secondary",
    UNSUBMITTED: "secondary",
    VERIFIED: "success",
    REQUESTED: "info",
    IN_TRANSIT: "info",
    RECEIVED: "success",
    EXPIRED: "dark",
    REQUEST_CHANGES: "warning",
  };
  const cls = map[s] || "secondary";

  return <span className={"badge text-bg-" + cls}>{status != null && status !== "" ? String(status) : "—"}</span>;
}
