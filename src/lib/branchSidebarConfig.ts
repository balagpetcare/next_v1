/**
 * Dynamic sidebar config for /staff/branch/[branchId].
 * See docs/dashboard/BRANCH_SIDEBAR_CONFIG.md.
 * Filter by requiredPerm and featureFlag (branch.type === "CLINIC" && branch.clinicEnabled).
 * Clinic section: shown only when branch is CLINIC, clinicEnabled true, and user has at least one
 * clinic.* permission; each item is gated by its own clinic.overview|appointments|queue|patients|visits.*
 */

import {
  overview as doctorOpsOverview,
  doctors as doctorOpsDoctors,
  scheduleBoard,
  availability as doctorOpsAvailability,
  serviceAssignment,
  approvals as doctorOpsApprovals,
  credentials as doctorOpsCredentials,
  certifications as doctorOpsCertifications,
  licenses as doctorOpsLicenses,
  performance as doctorOpsPerformance,
  auditLogs as doctorOpsAuditLogs,
} from "@/src/lib/doctorOperationsRoutes";
import { staffClinicPatientsPath } from "@/lib/staffClinicPatientRoutes";
import {
  staffServicePricingAgreementsPath,
  staffServicePricingCatalogPath,
  staffServicePricingMatrixPath,
} from "@/src/lib/staffServicePricingRoutes";

export type BranchSidebarItem = {
  key: string;
  label: string;
  icon: string;
  href: (branchId: string) => string;
  requiredPerm: string;
  /** If set, item is shown when user has requiredPerm OR any of these */
  anyPerms?: string[];
  badgeKey?: "approvals" | "lowStock" | "clinicQueue" | "vendorReceipts";
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
      { key: "stock-requests", label: "Stock Requests", icon: "ri:file-list-2-line", href: (id) => "/staff/branch/" + id + "/inventory/stock-requests", requiredPerm: "inventory.read", anyPerms: ["inventory.request.create", "inventory.update"] },
      { key: "adjustments", label: "Adjustments", icon: "ri:scales-3-line", href: (id) => "/staff/branch/" + id + "/inventory/adjustments", requiredPerm: "inventory.adjust" },
      { key: "transfers", label: "Transfers (Legacy)", icon: "ri:swap-line", href: (id) => "/staff/branch/" + id + "/inventory/transfers", requiredPerm: "inventory.transfer", deprecated: true },
      {
        key: "ai-replenishment",
        label: "AI replenishment",
        icon: "ri:sparkling-line",
        href: (id) => "/staff/branch/" + id + "/inventory/replenishment-suggestions",
        requiredPerm: "inventory.read",
      },
      {
        key: "reverse-logistics",
        label: "Reverse logistics",
        icon: "ri:arrow-go-back-line",
        href: (id) => "/staff/branch/" + id + "/inventory/reverse-logistics",
        requiredPerm: "inventory.read",
      },
      { key: "pos", label: "POS / Sales", icon: "ri:shopping-cart-2-line", href: (id) => "/staff/branch/" + id + "/pos", requiredPerm: "pos.view" },
      { key: "customers", label: "Customers", icon: "ri:user-3-line", href: (id) => "/staff/branch/" + id + "/customers", requiredPerm: "customers.view" },
    ],
  },
  {
    group: "Pharmacy",
    items: [
      { key: "pharmacy-dashboard", label: "Dashboard", icon: "ri:dashboard-line", href: (id) => "/staff/branch/" + id + "/pharmacy", requiredPerm: "inventory.read", anyPerms: ["pharmacy.requisition.create", "pharmacy.requisition.read"] },
      { key: "pharmacy-requisitions", label: "Requisitions", icon: "ri:medicine-bottle-line", href: (id) => "/staff/branch/" + id + "/pharmacy/requisitions", requiredPerm: "inventory.read", anyPerms: ["pharmacy.requisition.create", "pharmacy.requisition.read"] },
    ],
  },
  {
    group: "Warehouse",
    items: [
      { key: "warehouse-dashboard", label: "Dashboard", icon: "ri:dashboard-line", href: (id) => "/staff/branch/" + id + "/warehouse", requiredPerm: "warehouse.view", anyPerms: ["warehouse.dashboard.view"] },
      { key: "warehouse-operations", label: "Operations hub", icon: "ri:stack-line", href: (id) => "/staff/branch/" + id + "/warehouse/operations", requiredPerm: "warehouse.operations", anyPerms: ["warehouse.dashboard.view", "inbound.read", "warehouse.manage"] },
      { key: "warehouse-pick-lists", label: "Pick lists", icon: "ri:list-check-2", href: (id) => "/staff/branch/" + id + "/warehouse/pick-lists", requiredPerm: "warehouse.pick", anyPerms: ["warehouse.pick.execute", "outbound.read"] },
      { key: "warehouse-qc", label: "QC queue", icon: "ri:shield-check-line", href: (id) => "/staff/branch/" + id + "/warehouse/qc", requiredPerm: "warehouse.qc", anyPerms: ["qc.view", "qc.inspect"] },
      { key: "warehouse-putaway", label: "Putaway", icon: "ri:archive-line", href: (id) => "/staff/branch/" + id + "/warehouse/putaway", requiredPerm: "warehouse.operations", anyPerms: ["warehouse.dashboard.view", "inbound.read", "inbound.grn"] },
      { key: "warehouse-deliveries", label: "My Deliveries", icon: "ri:truck-line", href: (id) => "/staff/branch/" + id + "/warehouse?tab=deliveries", requiredPerm: "delivery.view", anyPerms: ["delivery.read", "delivery.manage"] },
      { key: "warehouse-receive", label: "Receive stock", icon: "ri:download-cloud-2-line", href: (id) => "/staff/branch/" + id + "/inventory/receive", requiredPerm: "inventory.receive", anyPerms: ["inbound.receive"] },
      { key: "warehouse-vendor-receipts", label: "Vendor receipts", icon: "ri:inbox-archive-line", href: (id) => "/staff/branch/" + id + "/warehouse/receive-po", requiredPerm: "purchase.receive", anyPerms: ["grn.post", "grn.create", "inbound.grn"], badgeKey: "vendorReceipts" },
      { key: "warehouse-procurement-requests", label: "Procurement requests", icon: "ri:shopping-bag-line", href: (id) => "/staff/branch/" + id + "/inventory/stock-requests?intent=PROCUREMENT", requiredPerm: "warehouse.operations", anyPerms: ["warehouse.request.create", "procurement.po.view"] },
    ],
  },
  {
    group: "Clinic",
    featureFlag: (branch) => branch?.clinicEnabled === true,
    items: [
      { key: "clinic-dashboard", label: "Dashboard", icon: "ri:dashboard-line", href: (id) => "/staff/branch/" + id + "/clinic/dashboard", requiredPerm: "clinic.overview.read", anyPerms: ["clinic.overview.manage"] },
      { key: "clinic-analytics", label: "Analytics", icon: "ri:bar-chart-grouped-line", href: (id) => "/staff/branch/" + id + "/clinic/analytics", requiredPerm: "clinic.analytics.view", anyPerms: ["clinic.stats.view", "clinic.reports.branch_analytics"] },
      { key: "clinic-appointments", label: "Appointments", icon: "ri:calendar-check-line", href: (id) => "/staff/branch/" + id + "/clinic/appointments", requiredPerm: "clinic.appointments.read", anyPerms: ["clinic.appointments.manage"] },
      { key: "clinic-queue", label: "Queue", icon: "ri:list-check-2", href: (id) => "/staff/branch/" + id + "/clinic/queue", requiredPerm: "clinic.queue.read", anyPerms: ["clinic.queue.manage"], badgeKey: "clinicQueue" },
      { key: "clinic-rooms", label: "Rooms", icon: "ri:door-open-line", href: (id) => "/staff/branch/" + id + "/clinic/rooms", requiredPerm: "clinic.rooms.view", anyPerms: ["clinic.rooms.manage"] },
      { key: "clinic-schedule-board", label: "Schedule board", icon: "ri:calendar-line", href: (id) => "/staff/branch/" + id + "/clinic/schedule-board", requiredPerm: "clinic.rooms.view_schedule", anyPerms: ["clinic.rooms.view", "clinic.rooms.manage"] },
      { key: "clinic-patients", label: "Patients", icon: "ri:user-heart-line", href: (id) => staffClinicPatientsPath(String(id)), requiredPerm: "clinic.patients.read", anyPerms: ["clinic.patients.manage"] },
      { key: "clinic-visits", label: "Visits", icon: "ri:file-list-3-line", href: (id) => "/staff/branch/" + id + "/clinic/visits", requiredPerm: "clinic.visits.read", anyPerms: ["clinic.visits.manage"] },
      { key: "clinic-surgeries", label: "Surgeries", icon: "ri:scissors-cut-line", href: (id) => "/staff/branch/" + id + "/clinic/surgeries", requiredPerm: "clinic.surgery.read", anyPerms: ["clinic.surgery.create", "clinic.surgery.manage"] },
      { key: "clinic-cases", label: "Cases", icon: "ri:folder-open-line", href: (id) => "/staff/branch/" + id + "/clinic/cases", requiredPerm: "clinic.cases.read", anyPerms: ["clinic.cases.write"] },
      { key: "clinic-items", label: "Clinic items", icon: "ri:box-3-line", href: (id) => "/staff/branch/" + id + "/clinic/items", requiredPerm: "clinic.items.read", anyPerms: ["clinic.stock.read"] },
      { key: "clinic-supply-requests", label: "Supply requests", icon: "ri:file-list-3-line", href: (id) => "/staff/branch/" + id + "/clinic/supply-requests", requiredPerm: "clinic.supply.read", anyPerms: ["clinic.supply.manage", "clinic.cases.read", "clinic.cases.write"] },
      { key: "clinic-transfers", label: "Incoming transfers", icon: "ri:swap-line", href: (id) => "/staff/branch/" + id + "/clinic/transfers", requiredPerm: "clinic.transfers.read", anyPerms: ["clinic.transfers.receive", "clinic.cases.read", "clinic.cases.write"] },
      { key: "clinic-sterilization", label: "Sterilization", icon: "ri:temp-cold-line", href: (id) => "/staff/branch/" + id + "/clinic/sterilization", requiredPerm: "clinic.sterilization.view", anyPerms: ["clinic.sterilization.manage", "clinic.cases.read", "clinic.cases.write"] },
      { key: "clinic-vial-returns", label: "Vial returns (surgery)", icon: "ri:flask-line", href: (id) => "/staff/branch/" + id + "/clinic/vial-returns", requiredPerm: "clinic.consumption.read", anyPerms: ["clinic.consumption.write"] },
      { key: "clinic-treatment-courses", label: "Treatment Courses", icon: "ri:calendar-event-line", href: (id) => "/staff/branch/" + id + "/clinic/treatment-courses", requiredPerm: "medicine.dose.record", anyPerms: ["medicine.dose.read"] },
    ],
  },
  {
    group: "Doctor Operations",
    featureFlag: (branch) => branch?.clinicEnabled === true,
    items: [
      { key: "clinic-doctors-overview", label: "Overview", icon: "ri:dashboard-line", href: doctorOpsOverview, requiredPerm: "clinic.doctors.view", anyPerms: ["clinic.doctors.assign"] },
      { key: "clinic-doctors", label: "Doctors", icon: "ri:user-star-line", href: doctorOpsDoctors, requiredPerm: "clinic.doctors.view", anyPerms: ["clinic.doctors.assign"] },
      { key: "clinic-doctors-schedule-board", label: "Schedule Board", icon: "ri:calendar-schedule-line", href: scheduleBoard, requiredPerm: "clinic.schedule.manage", anyPerms: ["clinic.doctors.view"] },
      { key: "clinic-doctors-availability", label: "Availability", icon: "ri:calendar-event-line", href: doctorOpsAvailability, requiredPerm: "clinic.doctors.manage_leave", anyPerms: ["clinic.doctors.view"] },
      { key: "clinic-doctors-service-assignment", label: "Service Assignment", icon: "ri:list-check-2", href: serviceAssignment, requiredPerm: "clinic.doctors.manage_services", anyPerms: ["clinic.doctors.view"] },
      { key: "clinic-doctors-approvals", label: "Pending Approvals", icon: "ri:checkbox-multiple-line", href: doctorOpsApprovals, requiredPerm: "approvals.view", anyPerms: ["clinic.doctors.view"] },
      { key: "clinic-doctors-credentials", label: "Credential Review", icon: "ri:file-shield-line", href: doctorOpsCredentials, requiredPerm: "clinic.doctors.manage_credentials", anyPerms: ["clinic.doctors.view"] },
      { key: "clinic-doctors-certifications", label: "Certifications", icon: "ri:award-line", href: doctorOpsCertifications, requiredPerm: "clinic.doctors.view_certifications" },
      { key: "clinic-doctors-licenses", label: "Licenses", icon: "ri:passport-line", href: doctorOpsLicenses, requiredPerm: "clinic.doctors.view_licenses" },
      { key: "clinic-doctors-performance", label: "Performance & Earnings", icon: "ri:bank-card-line", href: doctorOpsPerformance, requiredPerm: "clinic.doctors.view", anyPerms: ["clinic.doctors.assign"] },
      { key: "clinic-doctors-audit", label: "Audit Logs", icon: "ri:file-list-3-line", href: doctorOpsAuditLogs, requiredPerm: "clinic.doctors.view", anyPerms: ["clinic.doctors.assign"] },
    ],
  },
  {
    group: "Catalog",
    featureFlag: (branch) => branch?.clinicEnabled === true,
    items: [
      { key: "clinic-catalog", label: "Catalog", icon: "ri:book-2-line", href: (id) => "/staff/branch/" + id + "/clinic/catalog", requiredPerm: "clinic.catalog.view", anyPerms: ["clinic.catalog.search", "clinic.catalog.branch_add"] },
    ],
  },
  {
    group: "Services & Pricing",
    featureFlag: (branch) => branch?.clinicEnabled === true,
    items: [
      {
        key: "clinic-services-pricing-catalog",
        label: "Services catalog",
        icon: "ri:price-tag-3-line",
        href: (id) => staffServicePricingCatalogPath(id),
        requiredPerm: "clinic.services.manage",
        anyPerms: ["clinic.appointments.manage", "clinic.appointments.read", "manager.pricing.view"],
      },
      {
        key: "clinic-services-pricing-matrix",
        label: "Pricing matrix",
        icon: "ri:grid-line",
        href: (id) => staffServicePricingMatrixPath(id),
        requiredPerm: "manager.pricing.view",
        anyPerms: ["clinic.services.manage", "clinic.appointments.manage", "clinic.appointments.read"],
      },
      {
        key: "clinic-services-pricing-agreements",
        label: "Doctor agreements",
        icon: "ri:handshake-line",
        href: (id) => staffServicePricingAgreementsPath(id),
        requiredPerm: "clinic.doctors.manage_services",
        anyPerms: [
          "clinic.doctors.view",
          "manager.pricing.view",
          "clinic.services.manage",
          "clinic.appointments.read",
          "clinic.appointments.manage",
        ],
      },
      {
        key: "clinic-services-pricing-packages",
        label: "Packages",
        icon: "ri:gift-line",
        href: (id) => "/staff/branch/" + id + "/clinic/catalog?tab=packages",
        requiredPerm: "clinic.catalog.view",
        anyPerms: ["clinic.services.manage"],
      },
    ],
  },
  {
    group: "Billing & Finance",
    featureFlag: (branch) => branch?.clinicEnabled === true,
    items: [
      { key: "clinic-billing", label: "Billing", icon: "ri:bill-line", href: (id) => "/staff/branch/" + id + "/clinic/billing", requiredPerm: "clinic.billing.view", anyPerms: ["manager.billing.create_invoice", "manager.billing.collect_payment"] },
      { key: "clinic-treatment-billing", label: "Treatment Billing", icon: "ri:bill-line", href: (id) => "/staff/branch/" + id + "/clinic/treatment-billing", requiredPerm: "clinic.billing.view", anyPerms: ["medicine.dose.read", "medicine.dose.record"] },
      { key: "clinic-settlement", label: "Settlement", icon: "ri:bank-card-line", href: (id) => "/staff/branch/" + id + "/clinic/settlement", requiredPerm: "clinic.settlement.read", anyPerms: ["clinic.settlement.review"] },
    ],
  },
  {
    group: "Medicine Control",
    featureFlag: (branch) => branch?.clinicEnabled === true,
    items: [
      { key: "medicine-dashboard", label: "Dashboard", icon: "ri:medicine-bottle-line", href: (id) => "/staff/branch/" + id + "/clinic/medicine-control", requiredPerm: "medicine.policy.read", anyPerms: ["medicine.dispense.request", "medicine.dispense.approve"] },
      { key: "medicine-injection-tokens", label: "Injection Tokens", icon: "ri:qr-code-line", href: (id) => "/staff/branch/" + id + "/clinic/medicine-control/injection-tokens", requiredPerm: "injection.token.list", anyPerms: ["injection.token.generate", "injection.token.validate"] },
      { key: "medicine-injection-room", label: "Injection Room", icon: "ri:syringe-line", href: (id) => "/staff/branch/" + id + "/clinic/medicine-control/injection-room", requiredPerm: "medicine.dose.record", anyPerms: ["injection.token.validate", "injection.token.emergency_bypass"] },
      { key: "medicine-dispense-requests", label: "Dispense Requests", icon: "ri:file-list-3-line", href: (id) => "/staff/branch/" + id + "/clinic/medicine-control/dispense-requests", requiredPerm: "medicine.dispense.request", anyPerms: ["medicine.dispense.approve", "medicine.dispense.issue"] },
      { key: "medicine-internal-orders", label: "Internal Orders", icon: "ri:file-list-3-line", href: (id) => "/staff/branch/" + id + "/clinic/medicine-control/internal-orders", requiredPerm: "medicine.dispense.request", anyPerms: ["medicine.dispense.approve", "medicine.dispense.issue"] },
      { key: "medicine-active-vials", label: "Active Vials", icon: "ri:flask-line", href: (id) => "/staff/branch/" + id + "/clinic/medicine-control/active-vials", requiredPerm: "medicine.vial.open", anyPerms: ["medicine.vial.use", "medicine.vial.return"] },
      { key: "medicine-returns", label: "Vial Returns", icon: "ri:arrow-go-back-line", href: (id) => "/staff/branch/" + id + "/clinic/medicine-control/returns", requiredPerm: "medicine.return.submit", anyPerms: ["medicine.return.verify"] },
      { key: "medicine-audit-bins", label: "Audit Bins", icon: "ri:archive-2-line", href: (id) => "/staff/branch/" + id + "/clinic/medicine-control/audit-bins", requiredPerm: "medicine.audit.bin.view", anyPerms: ["medicine.audit.bin.manage"] },
      { key: "medicine-injection-monitor", label: "Injection Monitor", icon: "ri:pulse-line", href: (id) => "/staff/branch/" + id + "/clinic/medicine-control/injection-monitor", requiredPerm: "medicine.reconciliation.read", anyPerms: ["medicine.dose.read"] },
      { key: "medicine-reconciliation", label: "Reconciliation", icon: "ri:shield-check-line", href: (id) => "/staff/branch/" + id + "/clinic/medicine-control/reconciliation", requiredPerm: "medicine.reconciliation.read", anyPerms: ["medicine.reconciliation.run", "medicine.reconciliation.acknowledge"] },
      { key: "medicine-handover-summary", label: "Handover Summary", icon: "ri:exchange-line", href: (id) => "/staff/branch/" + id + "/clinic/medicine-control/handover-summary", requiredPerm: "medicine.reconciliation.read", anyPerms: ["medicine.vial.use"] },
      { key: "medicine-eod-close", label: "EOD Close", icon: "ri:lock-line", href: (id) => "/staff/branch/" + id + "/clinic/medicine-control/eod-close", requiredPerm: "medicine.reconciliation.read", anyPerms: ["medicine.reconciliation.run", "medicine.reconciliation.acknowledge"] },
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
      { key: "manager-reports", label: "Manager Reports", icon: "ri:bar-chart-box-line", href: (id) => "/staff/branch/" + id + "/manager-reports", requiredPerm: "manager.reports.daily_revenue" },
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
  /** AWAITING_CONFIRMATION vendor GRNs for this branch (warehouse queue). */
  vendorReceipts?: number;
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

  const mapItems = (g: (typeof BRANCH_SIDEBAR)[number]) =>
    g.items
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
          else if (it.badgeKey === "vendorReceipts") badge = counts.vendorReceipts;
        }
        return {
          key: it.key,
          label: it.label,
          icon: it.icon,
          href: it.href(branchId),
          badge: badge !== undefined && badge !== null && Number(badge) > 0 ? Number(badge) : undefined,
        };
      });

  for (const g of BRANCH_SIDEBAR) {
    if (g.group === "Warehouse") {
      const items = mapItems(g);
      if (items.length > 0) {
        result.push({ group: g.group, items });
      } else {
        result.push({
          group: g.group,
          items: [
            {
              key: "warehouse-request-access",
              label: "Request Access",
              icon: "ri:lock-line",
              href: `/staff/branch/${branchId}/warehouse`,
            },
          ],
        });
      }
      continue;
    }

    if (g.featureFlag && !g.featureFlag(branch ?? {})) continue;
    const items = mapItems(g);
    if (items.length > 0) result.push({ group: g.group, items });
  }
  return result;
}
