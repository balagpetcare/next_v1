/**
 * Dynamic sidebar config for /staff/branch/[branchId].
 * See docs/dashboard/BRANCH_SIDEBAR_CONFIG.md.
 * Filter by requiredPerm and featureFlag (branch.type === "CLINIC").
 */

export type BranchSidebarItem = {
  key: string;
  label: string;
  icon: string;
  href: (branchId: string) => string;
  requiredPerm: string;
  /** If set, item is shown when user has requiredPerm OR any of these */
  anyPerms?: string[];
  badgeKey?: "approvals" | "lowStock" | "clinicQueue";
};

export type BranchSidebarGroup = {
  group: string;
  featureFlag?: (branch: { type?: string; [k: string]: any }) => boolean;
  items: BranchSidebarItem[];
};

export const BRANCH_SIDEBAR: BranchSidebarGroup[] = [
  {
    group: "Overview",
    items: [
      { key: "overview", label: "Overview", icon: "ri:dashboard-line", href: (id) => `/staff/branch/${id}`, requiredPerm: "dashboard.view" },
      { key: "tasks", label: "Tasks", icon: "ri:task-line", href: (id) => `/staff/branch/${id}/tasks`, requiredPerm: "tasks.view" },
      { key: "approvals", label: "Approvals", icon: "ri:checkbox-multiple-line", href: (id) => `/staff/branch/${id}/approvals`, requiredPerm: "approvals.view", badgeKey: "approvals" },
    ],
  },
  {
    group: "Operations",
    items: [
      { key: "inventory", label: "Inventory", icon: "ri:archive-line", href: (id) => `/staff/branch/${id}/inventory`, requiredPerm: "inventory.read", badgeKey: "lowStock" },
      { key: "receive", label: "Receive Stock", icon: "ri:download-cloud-2-line", href: (id) => `/staff/branch/${id}/inventory/receive`, requiredPerm: "inventory.receive" },
      { key: "adjustments", label: "Adjustments", icon: "ri:scales-3-line", href: (id) => `/staff/branch/${id}/inventory/adjustments`, requiredPerm: "inventory.adjust" },
      { key: "transfers", label: "Transfers", icon: "ri:swap-line", href: (id) => `/staff/branch/${id}/inventory/transfers`, requiredPerm: "inventory.transfer" },
      { key: "pos", label: "POS / Sales", icon: "ri:shopping-cart-2-line", href: (id) => `/staff/branch/${id}/pos`, requiredPerm: "pos.view" },
      { key: "customers", label: "Customers", icon: "ri:user-3-line", href: (id) => `/staff/branch/${id}/customers`, requiredPerm: "customers.view" },
    ],
  },
  {
    group: "Clinic",
    featureFlag: (branch) => (branch?.type ?? "").toUpperCase() === "CLINIC",
    items: [
      { key: "services", label: "Services", icon: "ri:stethoscope-line", href: (id) => `/staff/branch/${id}/services`, requiredPerm: "services.view", anyPerms: ["appointments.view"], badgeKey: "clinicQueue" },
    ],
  },
  {
    group: "People",
    items: [
      { key: "staff", label: "Staff & Shifts", icon: "ri:team-line", href: (id) => `/staff/branch/${id}/staff`, requiredPerm: "staff.view" },
    ],
  },
  {
    group: "Analytics",
    items: [
      { key: "reports", label: "Reports", icon: "ri:bar-chart-2-line", href: (id) => `/staff/branch/${id}/reports`, requiredPerm: "reports.view" },
    ],
  },
];

export type BranchSummaryCounts = {
  approvals?: number;
  lowStock?: number;
  clinicQueue?: number;
};

/** Filter groups/items by permissions and branch type; optionally attach badge counts. */
export function getFilteredBranchSidebar(
  branchId: string,
  branch: { type?: string; [k: string]: any } | null,
  permissions: string[],
  counts?: BranchSummaryCounts | null
): { group: string; items: { key: string; label: string; icon: string; href: string; badge?: number }[] }[] {
  const perms = Array.isArray(permissions) ? permissions : [];
  const result: { group: string; items: { key: string; label: string; icon: string; href: string; badge?: number }[] }[] = [];

  for (const g of BRANCH_SIDEBAR) {
    if (g.featureFlag && !g.featureFlag(branch ?? {})) continue;
    const items = g.items
      .filter((it) => {
        if (perms.includes(it.requiredPerm)) return true;
        if (it.anyPerms && it.anyPerms.some((p) => perms.includes(p))) return true;
        return false;
      })
      .map((it) => {
        let badge: number | undefined;
        if (it.badgeKey && counts) {
          if (it.badgeKey === "approvals") badge = counts.approvals;
          else if (it.badgeKey === "lowStock") badge = counts.lowStock;
          else if (it.badgeKey === "clinicQueue") badge = counts.clinicQueue;
        }
        return {
          key: it.key,
          label: it.label,
          icon: it.icon,
          href: it.href(branchId),
          badge: badge !== undefined && badge !== null && Number(badge) > 0 ? Number(badge) : undefined,
        };
      });
    if (items.length > 0) result.push({ group: g.group, items });
  }
  return result;
}
