/**
 * Branch-scoped navigation menu for /owner/branches/[id] and sub-routes.
 * Used by BranchSidebar when owner is viewing a single branch.
 */

export type BranchMenuItem = {
  id: string;
  label: string;
  href: string;
  icon: string;
};

export function getBranchMenuItems(branchId: string): BranchMenuItem[] {
  const base = `/owner/branches/${branchId}`;
  return [
    { id: "branch.dashboard", label: "Dashboard", href: base, icon: "solar:home-smile-angle-outline" },
    { id: "branch.products", label: "Products", href: `${base}/products`, icon: "solar:box-outline" },
    { id: "branch.inventory", label: "Inventory", href: `${base}/inventory`, icon: "solar:box-minimalistic-outline" },
    { id: "branch.orders", label: "Orders", href: `${base}/orders`, icon: "solar:bag-check-outline" },
    { id: "branch.staff", label: "Staff", href: `${base}/staff`, icon: "solar:user-id-outline" },
    { id: "branch.reports", label: "Reports", href: `${base}/reports`, icon: "solar:chart-outline" },
    { id: "branch.tasks", label: "Tasks", href: `${base}/tasks`, icon: "solar:clipboard-list-outline" },
    { id: "branch.notifications", label: "Notifications", href: `${base}/notifications`, icon: "solar:bell-outline" },
    { id: "branch.settings", label: "Settings", href: `${base}/settings`, icon: "solar:settings-outline" },
  ];
}

/** Match /owner/branches/123 or /owner/branches/123/products etc. Excludes /owner/branches/new. */
export function isBranchRoute(pathname: string): boolean {
  return /^\/owner\/branches\/\d+(\/|$)/.test(String(pathname || ""));
}

/** Extract branch id from pathname like /owner/branches/4 or /owner/branches/4/products. Returns null for non-numeric (e.g. new). */
export function getBranchIdFromPath(pathname: string): string | null {
  const m = String(pathname || "").match(/^\/owner\/branches\/(\d+)/);
  return m ? m[1] : null;
}

/** Match /staff/branch/123 or /staff/branch/123/tasks etc. (staff Branch Dashboard). */
export function isStaffBranchRoute(pathname: string): boolean {
  return /^\/staff\/branch\/\d+(\/|$)/.test(String(pathname || ""));
}

/** Extract branch id from pathname like /staff/branch/4 or /staff/branch/4/tasks. */
export function getStaffBranchIdFromPath(pathname: string): string | null {
  const m = String(pathname || "").match(/^\/staff\/branch\/(\d+)/);
  return m ? m[1] : null;
}
