/**
 * Producer notification priority and badge helpers (Larkon design).
 * Use for bell dropdown, dashboard widget, and full notifications page.
 */

const PRIORITY_BY_TYPE = {
  VERIFICATION_CASE_REJECTED: "HIGH",
  BATCH_SUSPICIOUS_ACTIVITY: "HIGH",
  STAFF_INVITE_ACCEPTED: "MEDIUM",
  VERIFICATION_CASE_APPROVED: "MEDIUM",
  SYSTEM_INFO: "LOW",
  SYSTEM: "LOW",
};

const TYPE_LABELS = {
  STAFF_INVITE: "Staff Invite",
  STAFF_INVITE_ACCEPTED: "Staff Accepted",
  VERIFICATION_CASE_SUBMITTED: "Verification",
  VERIFICATION_CASE_APPROVED: "Approved",
  VERIFICATION_CASE_REJECTED: "Rejected",
  VERIFICATION_DOCUMENT_APPROVED: "Document",
  VERIFICATION_DOCUMENT_REJECTED: "Document",
  BATCH_SUSPICIOUS_ACTIVITY: "Batch Alert",
  SYSTEM: "System",
  SYSTEM_INFO: "System",
};

/** @param {string} type - Notification type. @returns {"HIGH"|"MEDIUM"|"LOW"} */
export function getProducerNotificationPriority(type) {
  return PRIORITY_BY_TYPE[type] || "LOW";
}

/** @param {"HIGH"|"MEDIUM"|"LOW"} priority - @returns Larkon badge class (e.g. bg-danger) */
export function getPriorityBadgeClass(priority) {
  const map = { HIGH: "bg-danger", MEDIUM: "bg-warning text-dark", LOW: "bg-secondary" };
  return map[priority] || "bg-secondary";
}

/** @param {string} type - @returns Display label */
export function getProducerTypeLabel(type) {
  return TYPE_LABELS[type] || (type ? type.replace(/_/g, " ") : "Notification");
}

/**
 * View href for producer notifications (staff, kyc, product, batch).
 * Optionally append query params for deep link (highlight, case, focus).
 * @param {{ type?: string; actionUrl?: string; meta?: Record<string, unknown> }} item
 * @param {{ pathname?: string }} opts - pathname for context
 */
export function getProducerViewHref(item, opts = {}) {
  if (item?.actionUrl) return item.actionUrl;
  const type = String(item?.type || "").toUpperCase();
  const meta = item?.meta || {};
  const pathname = opts.pathname || "";

  if (type === "STAFF_INVITE" || type === "STAFF_INVITE_ACCEPTED") {
    const highlight = meta.inviteId ?? meta.staffUserId ?? "";
    return highlight ? `/producer/staff?highlight=${encodeURIComponent(highlight)}` : "/producer/staff";
  }
  if ((type === "VERIFICATION_CASE_APPROVED" || type === "VERIFICATION_CASE_REJECTED") && meta.entityType === "PRODUCER_ORG") {
    const caseId = meta.caseId ?? "";
    return caseId ? `/producer/kyc?case=${encodeURIComponent(caseId)}` : "/producer/kyc";
  }
  if ((type === "VERIFICATION_CASE_APPROVED" || type === "VERIFICATION_CASE_REJECTED") && meta.entityType === "PRODUCER_PRODUCT" && meta.entityId) {
    return `/producer/products/${meta.entityId}?focus=verification`;
  }
  if (type === "VERIFICATION_CASE_SUBMITTED") return "/producer/kyc";
  if (type === "BATCH_SUSPICIOUS_ACTIVITY" && meta?.batchId) return `/producer/batches/${meta.batchId}`;
  if (type === "BATCH_SUSPICIOUS_ACTIVITY") return "/producer/batches";
  return null;
}
