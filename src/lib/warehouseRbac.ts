export type WarehouseCapability =
  | "dashboard"
  | "operations"
  | "pick"
  | "qc"
  | "deliveries"
  | "any";

const PERMISSION_SETS: Record<Exclude<WarehouseCapability, "any">, string[]> = {
  dashboard: ["warehouse.view", "warehouse.dashboard.view"],
  operations: ["warehouse.operations", "warehouse.dashboard.view", "inbound.read", "warehouse.manage"],
  pick: ["warehouse.pick", "warehouse.pick.execute", "outbound.read"],
  qc: ["warehouse.qc", "qc.view", "qc.inspect"],
  deliveries: ["delivery.view", "delivery.read", "delivery.manage", "delivery.assign"],
};

const ANY_WAREHOUSE_PERMISSIONS = Array.from(
  new Set([
    ...PERMISSION_SETS.dashboard,
    ...PERMISSION_SETS.operations,
    ...PERMISSION_SETS.pick,
    ...PERMISSION_SETS.qc,
    ...PERMISSION_SETS.deliveries,
    "dispatch.view",
    "inventory.receive",
    "inbound.receive",
  ])
);

export function hasWarehouseCapability(permissions: string[] | null | undefined, capability: WarehouseCapability): boolean {
  const perms = Array.isArray(permissions) ? permissions : [];
  if (capability === "any") {
    return ANY_WAREHOUSE_PERMISSIONS.some((perm) => perms.includes(perm));
  }
  return PERMISSION_SETS[capability].some((perm) => perms.includes(perm));
}

export type WarehouseCapabilityOptions = {
  /** When true, user has an active WarehouseStaffAssignment for this branch (backend /branch/me). */
  hasWarehouseStaffAssignmentForBranch?: boolean;
};

export function getWarehouseCapabilities(
  permissions: string[] | null | undefined,
  opts?: WarehouseCapabilityOptions
) {
  const perms = Array.isArray(permissions) ? permissions : [];
  const byAssignment = opts?.hasWarehouseStaffAssignmentForBranch === true;
  const hasPermAny = hasWarehouseCapability(perms, "any");
  const hasPermDashboard = hasWarehouseCapability(perms, "dashboard");
  return {
    canViewDashboard: hasPermDashboard || byAssignment,
    canViewOperations: hasWarehouseCapability(perms, "operations"),
    canViewPickLists: hasWarehouseCapability(perms, "pick"),
    canViewQc: hasWarehouseCapability(perms, "qc"),
    canViewDeliveries: hasWarehouseCapability(perms, "deliveries"),
    hasAnyWarehouseAccess: hasPermAny || byAssignment,
  };
}
