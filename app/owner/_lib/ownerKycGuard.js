/**
 * Single source of truth for Owner KYC guard logic.
 * Maps API verificationStatus to normalized status and defines access rules.
 *
 * API statuses: UNSUBMITTED, DRAFT, SUBMITTED, REQUEST_CHANGES, VERIFIED, APPROVED, REJECTED, etc.
 * Normalized: NOT_SUBMITTED | PENDING | APPROVED | REJECTED
 */

export const NORMALIZED = {
  NOT_SUBMITTED: "NOT_SUBMITTED",
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

/**
 * @param {string} apiStatus - verificationStatus from API
 * @returns {string} NOT_SUBMITTED | PENDING | APPROVED | REJECTED
 */
export function normalizeKycStatus(apiStatus) {
  const s = String(apiStatus || "UNSUBMITTED").toUpperCase();
  if (s === "VERIFIED" || s === "APPROVED") return NORMALIZED.APPROVED;
  if (s === "REJECTED") return NORMALIZED.REJECTED;
  if (s === "SUBMITTED" || s === "REQUEST_CHANGES") return NORMALIZED.PENDING;
  return NORMALIZED.NOT_SUBMITTED; // UNSUBMITTED, DRAFT, or unknown
}

/** User must stay on /owner/kyc until they submit or get approved */
export function shouldForceKycPage(normalizedStatus) {
  return (
    normalizedStatus === NORMALIZED.NOT_SUBMITTED || normalizedStatus === NORMALIZED.REJECTED
  );
}

/** User can access dashboard, branches, business (PENDING = can create business/branches) */
export function canAccessAllOwnerPages(normalizedStatus) {
  return normalizedStatus === NORMALIZED.PENDING || normalizedStatus === NORMALIZED.APPROVED;
}

export function isApproved(normalizedStatus) {
  return normalizedStatus === NORMALIZED.APPROVED;
}

export function isPending(normalizedStatus) {
  return normalizedStatus === NORMALIZED.PENDING;
}
