/**
 * Producer notification priority and badge helpers (Larkon design).
 * Use for bell dropdown, dashboard widget, and full notifications page.
 */

const PRIORITY_BY_TYPE = {
  VERIFICATION_CASE_REJECTED: "HIGH",
  BATCH_SUSPICIOUS_ACTIVITY: "HIGH",
  PRODUCT_REJECTED: "HIGH",
  ENFORCEMENT_CODE_BLOCKED: "HIGH",
  ENFORCEMENT_BATCH_QUARANTINED: "HIGH",
  ENFORCEMENT_PRODUCT_DEACTIVATED: "HIGH",
  ENFORCEMENT_ORG_SUSPENDED: "HIGH",
  ENFORCEMENT_ACTION_REVERTED: "HIGH",
  TICKET_REPLIED: "MEDIUM",
  TICKET_STATUS_CHANGED: "LOW",
  TICKET_ASSIGNED: "LOW",
  TICKET_SLA_BREACH: "HIGH",
  STAFF_INVITE_ACCEPTED: "MEDIUM",
  VERIFICATION_CASE_APPROVED: "MEDIUM",
  PRODUCT_APPROVED: "MEDIUM",
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
  PRODUCT_APPROVED: "Product Approved",
  PRODUCT_REJECTED: "Product Rejected",
  ENFORCEMENT_CODE_BLOCKED: "Enforcement: Code blocked",
  ENFORCEMENT_BATCH_QUARANTINED: "Enforcement: Batch quarantined",
  ENFORCEMENT_PRODUCT_DEACTIVATED: "Enforcement: Product deactivated",
  ENFORCEMENT_ORG_SUSPENDED: "Enforcement: Org suspended",
  ENFORCEMENT_ACTION_REVERTED: "Enforcement: Action reverted",
  TICKET_CREATED: "Support ticket",
  TICKET_REPLIED: "Support reply",
  TICKET_STATUS_CHANGED: "Ticket status",
  TICKET_ASSIGNED: "Ticket assigned",
  TICKET_SLA_BREACH: "Ticket SLA",
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
  if ((type === "PRODUCT_APPROVED" || type === "PRODUCT_REJECTED") && meta?.entityId) {
    return `/producer/products/${meta.entityId}`;
  }
  if (
    type === "ENFORCEMENT_CODE_BLOCKED" ||
    type === "ENFORCEMENT_BATCH_QUARANTINED" ||
    type === "ENFORCEMENT_PRODUCT_DEACTIVATED" ||
    type === "ENFORCEMENT_ORG_SUSPENDED" ||
    type === "ENFORCEMENT_ACTION_REVERTED"
  ) {
    if (meta?.targetType === "BATCH" && meta?.targetId) return `/producer/batches/${meta.targetId}`;
    if (meta?.targetType === "PRODUCT" && meta?.targetId) return `/producer/products/${meta.targetId}`;
    return "/producer/notifications";
  }
  if (
    type === "TICKET_CREATED" ||
    type === "TICKET_REPLIED" ||
    type === "TICKET_STATUS_CHANGED" ||
    type === "TICKET_ASSIGNED" ||
    type === "TICKET_SLA_BREACH"
  ) {
    const ticketId = meta?.ticketId ?? meta?.ticket_id;
    return ticketId ? `/producer/support/tickets/${ticketId}` : "/producer/support/tickets";
  }
  return null;
}
