/**
 * Producer-only: role key → permission keys for display when API does not return rolePermissions.
 * Used only by Producer panel Staff UI. Do not use in other panels.
 */
export const PRODUCER_ROLE_PERMISSIONS = {
  PRODUCER_OWNER: [
    "producer.org.read",
    "producer.org.write",
    "producer.kyc.submit",
    "producer.kyc.view",
    "producer.products.read",
    "producer.products.write",
    "producer.batches.read",
    "producer.batches.write",
    "producer.codes.generate",
    "producer.codes.export",
    "producer.verification.read",
    "producer.analytics.read",
  ],
  PRODUCER_MANAGER: [
    "producer.org.read",
    "producer.kyc.view",
    "producer.products.read",
    "producer.products.write",
    "producer.batches.read",
    "producer.batches.write",
    "producer.codes.generate",
    "producer.codes.export",
    "producer.verification.read",
    "producer.analytics.read",
  ],
  PRODUCER_STAFF: [
    "producer.products.read",
    "producer.batches.read",
    "producer.codes.generate",
    "producer.codes.export",
  ],
  PRODUCER_AUDITOR: [
    "producer.org.read",
    "producer.products.read",
    "producer.batches.read",
    "producer.verification.read",
    "producer.analytics.read",
  ],
  PRODUCER_VIEWER: [
    "producer.org.read",
    "producer.products.read",
    "producer.batches.read",
  ],
};

/** Group permission keys for display (KYC, Factory, Batch, Products, Orders, etc.) */
export function groupPermissionsByCategory(permissionKeys) {
  const groups = {
    Organization: [],
    KYC: [],
    Factory: [],
    Batch: [],
    Products: [],
    Orders: [],
    Wallet: [],
    Staff: [],
    Other: [],
  };
  const list = Array.isArray(permissionKeys) ? permissionKeys : [];
  list.forEach((key) => {
    if (key.startsWith("producer.org")) groups.Organization.push(key);
    else if (key.startsWith("producer.kyc")) groups.KYC.push(key);
    else if (key.startsWith("producer.factory")) groups.Factory.push(key);
    else if (key.startsWith("producer.batch")) groups.Batch.push(key);
    else if (key.startsWith("producer.product")) groups.Products.push(key);
    else if (key.startsWith("producer.order")) groups.Orders.push(key);
    else if (key.startsWith("producer.wallet") || key.includes("wallet")) groups.Wallet.push(key);
    else if (key.includes("staff")) groups.Staff.push(key);
    else groups.Other.push(key);
  });
  return groups;
}

/** Get permission keys for a role (from API role.rolePermissions or static map) */
export function getPermissionsForRole(role) {
  if (!role) return [];
  if (role.rolePermissions && Array.isArray(role.rolePermissions)) {
    return role.rolePermissions.map((rp) => rp.permission?.key).filter(Boolean);
  }
  return PRODUCER_ROLE_PERMISSIONS[role.key] || [];
}
