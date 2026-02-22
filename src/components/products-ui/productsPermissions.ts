/**
 * Role-based capabilities for products list and bulk actions.
 * Safe fallbacks when RBAC is not present: OWNER gets all, MANAGER/STAFF conservative.
 */

export type ProductsCapabilities = {
  canViewCost: boolean;
  canViewMargin: boolean;
  canEditProduct: boolean;
  canCreateProduct: boolean;
  canDeleteProduct: boolean;
  canBulkUpdateStatus: boolean;
  canPublish: boolean;
  canApprove: boolean;
  canExport: boolean;
  canImport: boolean;
  canViewAllBranchesStock: boolean;
  canViewBranchStock: boolean;
};

export type BulkActionId =
  | "activate"
  | "deactivate"
  | "delete"
  | "export"
  | "submit_approval"
  | "publish";

export type BulkAction = {
  id: BulkActionId;
  label: string;
  disabled?: boolean;
  tooltip?: string;
  variant?: "primary" | "secondary" | "success" | "danger" | "outline-primary";
};

/** Derive role from me (auth response). Panels or role string. */
function getRole(me: { role?: string; panels?: unknown } | null): "OWNER" | "MANAGER" | "STAFF" {
  if (!me) return "STAFF";
  const r = (me.role ?? "").toUpperCase();
  if (r === "OWNER" || r === "MANAGER" || r === "STAFF") return r as "OWNER" | "MANAGER" | "STAFF";
  const panels = Array.isArray(me.panels) ? me.panels : [];
  if (panels.some((p: unknown) => String(p).toLowerCase().includes("owner"))) return "OWNER";
  if (panels.some((p: unknown) => String(p).toLowerCase().includes("manager"))) return "MANAGER";
  return "STAFF";
}

function hasPermission(me: { permissions?: string[] } | null, perm: string): boolean {
  const list = me?.permissions ?? [];
  return list.some((p: string) => p.toLowerCase() === perm.toLowerCase() || p.toLowerCase().endsWith(perm.toLowerCase()));
}

/**
 * Returns capabilities for the current user. Uses RBAC if available, else role-based defaults.
 */
export function getProductsCapabilities(me: Record<string, unknown> | null): ProductsCapabilities {
  const role = getRole(me as { role?: string; panels?: string[] });
  const perms = (me?.permissions as string[] | undefined) ?? [];

  const can = (p: string) => perms.some((x: string) => x.toLowerCase().includes(p.toLowerCase()));

  if (role === "OWNER") {
    return {
      canViewCost: true,
      canViewMargin: true,
      canEditProduct: true,
      canCreateProduct: true,
      canDeleteProduct: true,
      canBulkUpdateStatus: true,
      canPublish: true,
      canApprove: false, // admin only in many setups
      canExport: true,
      canImport: true,
      canViewAllBranchesStock: true,
      canViewBranchStock: true,
    };
  }

  if (role === "MANAGER") {
    return {
      canViewCost: can("cost") || can("margin") ? true : false,
      canViewMargin: can("margin") ? true : false,
      canEditProduct: can("products.manage") || can("products.write") ? true : true,
      canCreateProduct: can("products.manage") || can("products.write") ? true : true,
      canDeleteProduct: can("products.delete") ? true : false,
      canBulkUpdateStatus: can("products.manage") || can("products.write") ? true : true,
      canPublish: can("products.publish") || can("products.manage") ? true : false,
      canApprove: false,
      canExport: can("export") || can("products.export") ? true : true,
      canImport: can("import") || can("products.import") ? true : false,
      canViewAllBranchesStock: false,
      canViewBranchStock: true,
    };
  }

  // STAFF – conservative
  return {
    canViewCost: false,
    canViewMargin: false,
    canEditProduct: can("products.write") ? true : false,
    canCreateProduct: can("products.write") ? true : false,
    canDeleteProduct: false,
    canBulkUpdateStatus: false,
    canPublish: false,
    canApprove: false,
    canExport: can("products.export") ? true : false,
    canImport: false,
    canViewAllBranchesStock: false,
    canViewBranchStock: can("inventory.read") || can("stock") ? true : false,
  };
}

/**
 * Build bulk actions array based on capabilities. Disabled actions get tooltip "Not available yet" when endpoint missing.
 */
export function buildBulkActions(capabilities: ProductsCapabilities, options?: {
  hasBulkStatusEndpoint?: boolean;
  hasBulkExport?: boolean;
}): BulkAction[] {
  const actions: BulkAction[] = [];

  if (capabilities.canBulkUpdateStatus && options?.hasBulkStatusEndpoint !== false) {
    actions.push({ id: "activate", label: "Activate", variant: "success" });
    actions.push({ id: "deactivate", label: "Deactivate", variant: "secondary" });
  } else if (capabilities.canBulkUpdateStatus) {
    actions.push({
      id: "activate",
      label: "Activate",
      disabled: true,
      tooltip: "Not available yet",
      variant: "success",
    });
    actions.push({
      id: "deactivate",
      label: "Deactivate",
      disabled: true,
      tooltip: "Not available yet",
      variant: "secondary",
    });
  }

  if (capabilities.canPublish) {
    actions.push({ id: "submit_approval", label: "Submit for approval", variant: "outline-primary" });
    actions.push({ id: "publish", label: "Publish", variant: "primary" });
  }

  if (capabilities.canExport) {
    actions.push({
      id: "export",
      label: "Export",
      variant: "secondary",
      disabled: options?.hasBulkExport === false,
      tooltip: options?.hasBulkExport === false ? "Not available yet" : undefined,
    });
  }

  if (capabilities.canDeleteProduct) {
    actions.push({ id: "delete", label: "Delete", variant: "danger" });
  }

  return actions;
}

/**
 * Filter column keys by capabilities (e.g. hide cost/margin columns).
 */
export function filterColumnsByCapabilities(
  columnIds: string[],
  capabilities: ProductsCapabilities
): string[] {
  let out = columnIds;
  if (!capabilities.canViewCost) out = out.filter((id) => id !== "cost");
  if (!capabilities.canViewMargin) out = out.filter((id) => id !== "margin");
  return out;
}
