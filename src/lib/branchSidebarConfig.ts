/**
 * Dynamic sidebar config for /staff/branch/[branchId].
 * See docs/dashboard/BRANCH_SIDEBAR_CONFIG.md.
 * Filter by requiredPerm and featureFlag (branch.type === "CLINIC" && branch.clinicEnabled).
 * Clinic section: shown only when branch is CLINIC, clinicEnabled true, and user has at least one
 * clinic.* permission; each item is gated by its own clinic.overview|appointments|queue|patients|visits.*
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
      { key: "overview", label: "Overview", icon: "ri:dashboard-line", href: (id) => "/staff/branch/" + id, requiredPerm: "dashboard.view" },
      { key: "workspace", label: "My Workspace", icon: "solar:widget-5-outline", href: () => "/staff/workspace", requiredPerm: "tasks.view" },
      { key: "tasks", label: "Tasks", icon: "ri:task-line", href: (id) => "/staff/branch/" + id + "/tasks", requiredPerm: "tasks.view" },
      { key: "approvals", label: "Approvals", icon: "ri:checkbox-multiple-line", href: (id) => "/staff/branch/" + id + "/approvals", requiredPerm: "approvals.view", badgeKey: "approvals" },
    ],
  },
  {
    group: "Operations",
    items: [
      { key: "inventory", label: "Inventory", icon: "ri:archive-line", href: (id) => "/staff/branch/" + id + "/inventory", requiredPerm: "inventory.read", badgeKey: "lowStock" },
      { key: "receive", label: "Receive Stock", icon: "ri:download-cloud-2-line", href: (id) => "/staff/branch/" + id + "/inventory/receive", requiredPerm: "inventory.receive" },
      { key: "adjustments", label: "Adjustments", icon: "ri:scales-3-line", href: (id) => "/staff/branch/" + id + "/inventory/adjustments", requiredPerm: "inventory.adjust" },
      { key: "transfers", label: "Transfers", icon: "ri:swap-line", href: (id) => "/staff/branch/" + id + "/inventory/transfers", requiredPerm: "inventory.transfer" },
      { key: "pos", label: "POS / Sales", icon: "ri:shopping-cart-2-line", href: (id) => "/staff/branch/" + id + "/pos", requiredPerm: "pos.view" },
      { key: "customers", label: "Customers", icon: "ri:user-3-line", href: (id) => "/staff/branch/" + id + "/customers", requiredPerm: "customers.view" },
    ],
  },
  {
    group: "Clinic",
    featureFlag: (branch) => branch?.clinicEnabled === true,
    items: [
      { key: "clinic-dashboard", label: "Dashboard", icon: "ri:dashboard-line", href: (id) => "/staff/branch/" + id + "/clinic/dashboard", requiredPerm: "clinic.overview.read", anyPerms: ["clinic.overview.manage"] },
      { key: "clinic-appointments", label: "Appointments", icon: "ri:calendar-check-line", href: (id) => "/staff/branch/" + id + "/clinic/appointments", requiredPerm: "clinic.appointments.read", anyPerms: ["clinic.appointments.manage"] },
      { key: "clinic-queue", label: "Queue", icon: "ri:list-check-2", href: (id) => "/staff/branch/" + id + "/clinic/queue", requiredPerm: "clinic.queue.read", anyPerms: ["clinic.queue.manage"], badgeKey: "clinicQueue" },
      { key: "clinic-patients", label: "Patients", icon: "ri:user-heart-line", href: (id) => "/staff/branch/" + id + "/clinic/patients", requiredPerm: "clinic.patients.read", anyPerms: ["clinic.patients.manage"] },
      { key: "clinic-visits", label: "Visits", icon: "ri:file-list-3-line", href: (id) => "/staff/branch/" + id + "/clinic/visits", requiredPerm: "clinic.visits.read", anyPerms: ["clinic.visits.manage"] },
      { key: "clinic-cases", label: "Cases", icon: "ri:folder-open-line", href: (id) => "/staff/branch/" + id + "/clinic/cases", requiredPerm: "clinic.cases.read", anyPerms: ["clinic.cases.write"] },
      { key: "clinic-items", label: "Clinic items", icon: "ri:box-3-line", href: (id) => "/staff/branch/" + id + "/clinic/items", requiredPerm: "clinic.items.read", anyPerms: ["clinic.stock.read"] },
      { key: "clinic-supply-requests", label: "Supply requests", icon: "ri:file-list-3-line", href: (id) => "/staff/branch/" + id + "/clinic/supply-requests", requiredPerm: "clinic.cases.read", anyPerms: ["clinic.cases.write"] },
      { key: "clinic-transfers", label: "Incoming transfers", icon: "ri:swap-line", href: (id) => "/staff/branch/" + id + "/clinic/transfers", requiredPerm: "clinic.cases.read", anyPerms: ["clinic.cases.write"] },
      { key: "clinic-sterilization", label: "Sterilization", icon: "ri:temp-cold-line", href: (id) => "/staff/branch/" + id + "/clinic/sterilization", requiredPerm: "clinic.cases.read", anyPerms: ["clinic.cases.write"] },
      { key: "clinic-vial-returns", label: "Vial returns (surgery)", icon: "ri:flask-line", href: (id) => "/staff/branch/" + id + "/clinic/vial-returns", requiredPerm: "clinic.consumption.read", anyPerms: ["clinic.consumption.write"] },
    ],
  },
  {
    group: "Medicine Control",
    featureFlag: (branch) => branch?.clinicEnabled === true,
    items: [
      { key: "medicine-dashboard", label: "Dashboard", icon: "ri:medicine-bottle-line", href: (id) => "/staff/branch/" + id + "/clinic/medicine-control", requiredPerm: "medicine.policy.read", anyPerms: ["medicine.dispense.request", "medicine.dispense.approve"] },
      { key: "medicine-dispense-requests", label: "Dispense Requests", icon: "ri:file-list-3-line", href: (id) => "/staff/branch/" + id + "/clinic/medicine-control/dispense-requests", requiredPerm: "medicine.dispense.request", anyPerms: ["medicine.dispense.approve", "medicine.dispense.issue"] },
      { key: "medicine-active-vials", label: "Active Vials", icon: "ri:flask-line", href: (id) => "/staff/branch/" + id + "/clinic/medicine-control/active-vials", requiredPerm: "medicine.vial.open", anyPerms: ["medicine.vial.use", "medicine.vial.return"] },
      { key: "medicine-returns", label: "Vial Returns", icon: "ri:arrow-go-back-line", href: (id) => "/staff/branch/" + id + "/clinic/medicine-control/returns", requiredPerm: "medicine.return.submit", anyPerms: ["medicine.return.verify"] },
      { key: "medicine-audit-bins", label: "Audit Bins", icon: "ri:archive-2-line", href: (id) => "/staff/branch/" + id + "/clinic/medicine-control/audit-bins", requiredPerm: "medicine.audit.bin.view", anyPerms: ["medicine.audit.bin.manage"] },
      { key: "medicine-policies", label: "Policies", icon: "ri:settings-3-line", href: (id) => "/staff/branch/" + id + "/clinic/medicine-control/policies", requiredPerm: "medicine.policy.read", anyPerms: ["medicine.policy.manage"] },
    ],
  },
  {
    group: "People",
    items: [
      { key: "staff", label: "Staff & Shifts", icon: "ri:team-line", href: (id) => "/staff/branch/" + id + "/staff", requiredPerm: "staff.view" },
    ],
  },
  {
    group: "Manager Console",
    items: [
      { key: "manager-dashboard", label: "Manager Dashboard", icon: "ri:dashboard-2-line", href: (id) => "/staff/branch/" + id + "/manager-dashboard", requiredPerm: "manager.reports.daily_revenue", anyPerms: ["manager.reports.doctor_performance", "manager.staff.duty_roster"] },
      { key: "roster", label: "Staff Roster", icon: "ri:calendar-schedule-line", href: (id) => "/staff/branch/" + id + "/roster", requiredPerm: "manager.staff.duty_roster" },
      { key: "escalations", label: "Escalations", icon: "ri:arrow-up-circle-line", href: (id) => "/staff/branch/" + id + "/escalations", requiredPerm: "manager.reports.daily_revenue", anyPerms: ["approvals.manage"] },
      { key: "manager-reports", label: "Manager Reports", icon: "ri:bar-chart-box-line", href: (id) => "/staff/branch/" + id + "/reports", requiredPerm: "manager.reports.daily_revenue" },
    ],
  },
  {
    group: "Analytics",
    items: [
      { key: "reports", label: "Reports", icon: "ri:bar-chart-2-line", href: (id) => "/staff/branch/" + id + "/reports", requiredPerm: "reports.view" },
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
