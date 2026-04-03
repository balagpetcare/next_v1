/**
 * Client-side stock request create permission (aligned with backend stockRequestAccess.ts).
 * @param {{ types?: unknown[]; type?: string }} branch
 * @param {string[]} permissions
 */
export function canCreateStockRequest(branch, permissions) {
  if (!branch || !Array.isArray(permissions)) return false;
  const codes = new Set();
  if (Array.isArray(branch.types)) {
    branch.types.forEach((t) => {
      const c = t?.type?.code ?? t?.branchType?.code ?? t?.code;
      if (c) codes.add(c);
    });
  }
  if (branch.type) codes.add(branch.type);
  const isWarehouseHub = ["WAREHOUSE_DC", "WAREHOUSE", "CENTRAL_WAREHOUSE", "DISTRIBUTION_CENTER"].some((c) =>
    codes.has(c)
  );
  const p = new Set(permissions);
  if (isWarehouseHub) {
    return (
      p.has("inventory.request.create") ||
      p.has("warehouse.request.create") ||
      p.has("warehouse.operations") ||
      p.has("inventory.update") ||
      p.has("inventory.transfer")
    );
  }
  return p.has("inventory.request.create") || p.has("inventory.update") || p.has("inventory.transfer");
}

export function isWarehouseHubBranch(branch) {
  if (!branch) return false;
  const codes = new Set();
  if (Array.isArray(branch.types)) {
    branch.types.forEach((t) => {
      const c = t?.type?.code ?? t?.branchType?.code ?? t?.code;
      if (c) codes.add(c);
    });
  }
  if (branch.type) codes.add(branch.type);
  return ["WAREHOUSE_DC", "WAREHOUSE", "CENTRAL_WAREHOUSE", "DISTRIBUTION_CENTER"].some((c) => codes.has(c));
}
