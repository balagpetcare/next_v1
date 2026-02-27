/**
 * Human-readable labels for Producer panel permission keys.
 * Used only in Producer panel (Staff permissions view). Do not show raw keys as primary text.
 *
 * Groups: Organization, KYC, Batch, Products, Codes, Verification, Analytics, Staff, Other
 */

const GROUPS = {
  Organization: "Organization",
  KYC: "KYC",
  Batch: "Batch",
  Products: "Products",
  Codes: "Codes",
  Verification: "Verification",
  Analytics: "Analytics",
  Staff: "Staff",
  Other: "Other",
};

/** @type {{ [key: string]: { group: string; title: string; description: string; titleBn?: string } }} */
export const PERMISSION_LABELS = {
  "producer.org.read": {
    group: GROUPS.Organization,
    title: "View organization",
    description: "View organization profile and settings",
  },
  "producer.org.write": {
    group: GROUPS.Organization,
    title: "Edit organization",
    description: "Update organization profile and settings",
  },
  "producer.kyc.view": {
    group: GROUPS.KYC,
    title: "View KYC",
    description: "View KYC status and documents",
  },
  "producer.kyc.submit": {
    group: GROUPS.KYC,
    title: "Submit KYC",
    description: "Submit or update KYC documents",
  },
  "producer.batches.read": {
    group: GROUPS.Batch,
    title: "View batches",
    description: "View batch list and batch details",
  },
  "producer.batches.write": {
    group: GROUPS.Batch,
    title: "Manage batches",
    description: "Create, edit, and submit batches",
  },
  "producer.products.read": {
    group: GROUPS.Products,
    title: "View products",
    description: "View product list and product details",
  },
  "producer.products.write": {
    group: GROUPS.Products,
    title: "Manage products",
    description: "Create, edit, and submit products",
  },
  "producer.codes.generate": {
    group: GROUPS.Codes,
    title: "Generate codes",
    description: "Generate authentication codes for batches",
  },
  "producer.codes.export": {
    group: GROUPS.Codes,
    title: "Export codes",
    description: "Export codes (CSV/download)",
  },
  "producer.verification.read": {
    group: GROUPS.Verification,
    title: "View verification",
    description: "View verification status and history",
  },
  "producer.analytics.read": {
    group: GROUPS.Analytics,
    title: "View analytics",
    description: "View reports and analytics",
  },
  "producer.staff.read": {
    group: GROUPS.Staff,
    title: "View team",
    description: "View staff members and invitations",
  },
  "producer.staff.invite": {
    group: GROUPS.Staff,
    title: "Invite staff",
    description: "Send and revoke staff invitations",
  },
  "producer.staff.invite.resend": {
    group: GROUPS.Staff,
    title: "Resend invite",
    description: "Resend invitation emails or links",
  },
  "producer.staff.update_role": {
    group: GROUPS.Staff,
    title: "Change roles",
    description: "Update staff member roles",
  },
  "producer.staff.update_status": {
    group: GROUPS.Staff,
    title: "Change status",
    description: "Suspend, enable, or disable staff",
  },
  "producer.factory.read": {
    group: GROUPS.Products,
    title: "View factories",
    description: "View factory list and details",
  },
  "producer.factory.write": {
    group: GROUPS.Products,
    title: "Manage factories",
    description: "Add or edit factories",
  },
};

const FALLBACK = {
  group: GROUPS.Other,
  title: "Other permission",
  description: "Additional access capability",
};

/**
 * Get human-readable label for a permission key.
 * @param {string} key - Raw permission key (e.g. producer.products.write)
 * @returns {{ group: string; title: string; description: string }}
 */
export function getPermissionLabel(key) {
  if (!key || typeof key !== "string") return FALLBACK;
  const entry = PERMISSION_LABELS[key];
  if (entry) return entry;
  return FALLBACK;
}

/**
 * Group permission keys by label group for display.
 * @param {string[]} permissionKeys
 * @returns {{ [group: string]: string[] }}
 */
export function groupPermissionsByLabel(permissionKeys) {
  const groups = {};
  const list = Array.isArray(permissionKeys) ? permissionKeys : [];
  const order = [
    GROUPS.Organization,
    GROUPS.KYC,
    GROUPS.Staff,
    GROUPS.Products,
    GROUPS.Batch,
    GROUPS.Codes,
    GROUPS.Verification,
    GROUPS.Analytics,
    GROUPS.Other,
  ];
  order.forEach((g) => (groups[g] = []));
  list.forEach((key) => {
    const { group } = getPermissionLabel(key);
    if (!groups[group]) groups[group] = [];
    groups[group].push(key);
  });
  return groups;
}

/** Whether the key is a "write" / "export" / "generate" style permission (for summary badge) */
export function isPrivilegedPermission(key) {
  if (!key) return false;
  return (
    key.endsWith(".write") ||
    key.endsWith(".export") ||
    key.endsWith(".generate") ||
    key.includes("invite") ||
    key.includes("update_")
  );
}
