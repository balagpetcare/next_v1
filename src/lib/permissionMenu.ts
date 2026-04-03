"use client";

export type AppKey = "owner" | "admin" | "shop" | "clinic" | "mother" | "producer" | "country" | "staff" | "doctor";

export type MenuItem = {
  id: string;
  label: string;
  /** Optional i18n key (e.g. "menu.owner.dashboard"). If missing, layout falls back to label. */
  labelKey?: string;
  href?: string;
  icon?: string; // Iconify icon name (used by MasterLayout)
  required?: string[]; // permission keys
  children?: MenuItem[];
  badge?: string | number | (() => Promise<string | number>); // Badge count or async function
  badgeType?: "count" | "status"; // Badge display type
  /** Phase 5: when set (e.g. DONATION, ADS), layout hides item when policy disables feature */
  policyFeature?: string;
};

export type BuildMenuOptions = {
  /**
   * When true, the caller has confirmed the user is authenticated (e.g., /me loaded).
   * Used for safe fallbacks so core Owner navigation doesn't disappear if permissions are not yet seeded.
   */
  isAuthenticated?: boolean;
};

function hasAny(perms: Set<string>, required?: string[]) {
  if (!required || required.length === 0) return true;
  for (const k of required) if (perms.has(k)) return true;
  return false;
}

function filterTree(items: MenuItem[], perms: Set<string>): MenuItem[] {
  const out: MenuItem[] = [];
  for (const it of items) {
    const kids = it.children ? filterTree(it.children, perms) : undefined;
    const ok = hasAny(perms, it.required) || (kids && kids.length > 0);
    if (!ok) continue;
    out.push({ ...it, children: kids });
  }
  return out;
}

/**
 * Single menu registry (permission-driven).
 * Keep this additive to avoid breaking existing routes.
 * NOTE: permission keys must match backend seed (Phase-3).
 */

/**
 * Owner core navigation fallback (auth-only).
 * Rationale: If DB roles/permissions are not seeded/assigned yet, we still want Owners
 * to reach Organization/Branch/KYC/Staff screens (non-destructive). API-level permissions
 * should still protect sensitive actions.
 */
// Owner sidebar fallback (shows even when permissions are empty)
// Matches the target UX:
//   My Business
//     - Organization
//     - Branches
//     - Staffs
const CORE_OWNER_FALLBACK: MenuItem[] = [
  { id: "owner.dashboard", label: "Dashboard", href: "/owner/dashboard", icon: "solar:home-smile-outline", required: [] },
  { id: "owner.escalations", label: "Escalations", href: "/owner/escalations", icon: "ri:arrow-up-circle-line", required: [] },
  { id: "owner.approvals", label: "Clinic Approvals", href: "/owner/approvals", icon: "solar:clipboard-check-outline", required: [] },
  {
    id: "owner.operations",
    label: "Operations",
    icon: "solar:widget-5-outline",
    required: [],
    children: [
      { id: "owner.operations.appointments", label: "Appointments", href: "/owner/dashboards/branch-manager", required: [] },
      { id: "owner.operations.pos", label: "POS", href: "/owner/dashboards/branch-manager", required: [] },
      { id: "owner.operations.orders", label: "Orders", href: "/owner/orders", required: [] },
    ],
  },
  {
    id: "owner.clinic",
    label: "Clinic",
    icon: "solar:medical-kit-outline",
    required: [],
    children: [
      { id: "owner.clinic.overview", label: "Clinic Network", href: "/owner/clinic", required: [] },
      { id: "owner.clinic.doctors", label: "Doctors", href: "/owner/clinic?view=doctors", required: [] },
      { id: "owner.clinic.doctorPerformance", label: "Doctor Performance", href: "/owner/clinic?view=doctor-performance", required: [] },
      { id: "owner.clinic.doctorAudit", label: "Doctor Audit", href: "/owner/clinic?view=doctor-audit", required: [] },
      { id: "owner.clinic.services", label: "Services", href: "/owner/clinic?view=services", required: [] },
      { id: "owner.clinic.packages", label: "Packages", href: "/owner/clinic?view=packages", required: [] },
      { id: "owner.clinic.schedule", label: "Schedule", href: "/owner/clinic?view=schedule", required: [] },
      { id: "owner.clinic.reports", label: "Reports", href: "/owner/clinic?view=reports", required: [] },
      { id: "owner.clinic.settings", label: "Settings", href: "/owner/clinic?view=settings", required: [] },
      { id: "owner.clinic.injectionMonitor", label: "Injection Monitor", href: "/owner/clinic?view=injection-monitor", required: [] },
      { id: "owner.clinic.reconciliation", label: "Reconciliation", href: "/owner/clinic?view=reconciliation", required: [] },
    ],
  },
  {
    id: "owner.myBusiness",
    label: "My Business",
    icon: "solar:buildings-2-outline",
    required: [],
    children: [
      {
        id: "owner.orgs",
        label: "Organizations",
        href: "/owner/organizations",
        required: [],
        badgeType: "count",
        children: [
          { id: "owner.orgs.list", label: "All Organizations", href: "/owner/organizations", required: [] },
          { id: "owner.orgs.new", label: "New Organization", href: "/owner/organizations/new", required: [] },
        ],
      },
      {
        id: "owner.branches",
        label: "Branches",
        href: "/owner/branches",
        required: [],
        badgeType: "count",
        children: [
          { id: "owner.branches.list", label: "All Branches", href: "/owner/branches", required: [] },
          { id: "owner.branches.new", label: "New Branch", href: "/owner/branches/new", required: [] },
        ],
      },
      {
        id: "owner.staffs",
        label: "Staffs",
        href: "/owner/staffs",
        required: [],
        badgeType: "count",
        children: [
          { id: "owner.staffs.list", label: "All Staffs", href: "/owner/staffs", required: [] },
          { id: "owner.staffs.invite", label: "Invite Staff", href: "/owner/staffs/new", required: [] },
        ],
      },
    ],
  },
  {
    id: "owner.people",
    label: "People",
    icon: "solar:users-group-rounded-outline",
    required: [],
    children: [
      { id: "owner.people.customers", label: "Customers", href: "/owner/dashboards/branch-manager", required: [] },
    ],
  },
    {
      id: "owner.accessStaff",
      label: "Access & Staff",
      icon: "solar:user-check-outline",
      required: [],
      children: [
        { id: "owner.access.requests", label: "Access Requests", href: "/owner/access/requests", required: [] },
        { id: "owner.staff.directory", label: "Staff", href: "/owner/staff", required: [] },
        { id: "owner.access.control", label: "Access Control", href: "/owner/access/control", required: [] },
        { id: "owner.access.matrix", label: "Access Map", href: "/owner/access/matrix", required: [] },
      ],
    },
  {
    id: "owner.requests",
    label: "Requests & Approvals",
    icon: "solar:checklist-outline",
    required: [],
    children: [
      { id: "owner.requests.inbox", label: "Inbox", href: "/owner/requests", required: [], badgeType: "count" },
      { id: "owner.requests.product", label: "Product Requests", href: "/owner/product-requests", required: [], badgeType: "count" },
      { id: "owner.requests.returns", label: "Returns & Damages", href: "/owner/returns", required: [], badgeType: "count" },
      { id: "owner.requests.cancellations", label: "Cancellations", href: "/owner/cancellations", required: [], badgeType: "count" },
    ],
  },
  {
    id: "owner.inventory",
    label: "Inventory",
    icon: "solar:box-outline",
    required: [],
    children: [
      { id: "owner.inventory.overview", label: "Stock", href: "/owner/inventory", required: [] },
      { id: "owner.inventory.vendors", label: "Vendors", href: "/owner/vendors", required: [] },
      { id: "owner.inventory.warehouse", label: "Warehouse", href: "/owner/inventory/warehouse", required: [] },
      { id: "owner.inventory.stockRequests", label: "Stock Requests", href: "/owner/inventory/stock-requests", required: [] },
      { id: "owner.inventory.transfers", label: "Inventory Transfers", href: "/owner/inventory/transfers", required: [] },
      { id: "owner.inventory.receipts", label: "Receipts", href: "/owner/inventory/receipts", required: [] },
      { id: "owner.inventory.purchaseOrders", label: "Purchase orders", href: "/owner/inventory/purchase-orders", required: [] },
      { id: "owner.inventory.allocation", label: "Allocation & picking", href: "/owner/inventory/allocation", required: [] },
      { id: "owner.inventory.locations", label: "Locations", href: "/owner/inventory/locations", required: [] },
      { id: "owner.inventory.adjustments", label: "Adjustments", href: "/owner/inventory/adjustments", required: [] },
      { id: "owner.inventory.batches", label: "Batches", href: "/owner/inventory/batches", required: [] },
      { id: "owner.inventory.writeOffs", label: "Write-Offs", href: "/owner/inventory/write-offs", required: [] },
      { id: "owner.inventory.vendorReturns", label: "Vendor Returns", href: "/owner/inventory/vendor-returns", required: [] },
      { id: "owner.inventory.warehouseTransfers", label: "Warehouse Transfers", href: "/owner/inventory/warehouse-transfers", required: [] },
      { id: "owner.inventory.networkBalance", label: "Network balance", href: "/owner/inventory/network-balance", required: [] },
      { id: "owner.inventory.reverseLogistics", label: "Reverse logistics", href: "/owner/inventory/reverse-logistics", required: [] },
      { id: "owner.inventory.quarantine", label: "Quarantine stock", href: "/owner/inventory/quarantine", required: [] },
      { id: "owner.inventory.analytics", label: "Analytics", href: "/owner/inventory/analytics", required: [] },
      { id: "owner.inventory.controlTower", label: "Control tower", href: "/owner/inventory/control-tower", required: [] },
      { id: "owner.inventory.procurementAi", label: "Procurement intelligence", href: "/owner/inventory/procurement-intelligence", required: [] },
      { id: "owner.inventory.reconciliation", label: "Reconciliation", href: "/owner/inventory/reconciliation", required: [] },
    ],
  },
  {
    id: "owner.pharmacy",
    label: "Pharmacy",
    icon: "ri:medicine-bottle-line",
    required: [],
    children: [
      { id: "owner.pharmacy.dashboard", label: "Dashboard", href: "/owner/pharmacy", required: [] },
      { id: "owner.pharmacy.requisitions", label: "Requisitions", href: "/owner/pharmacy/requisitions", required: [], badgeType: "count" },
      { id: "owner.pharmacy.expiry", label: "Expiry management", href: "/owner/inventory/expiry-management", required: [] },
      { id: "owner.pharmacy.recalls", label: "Batch recalls", href: "/owner/inventory/recalls", required: [] },
    ],
  },
  {
    id: "owner.warehouse",
    label: "Warehouse",
    icon: "solar:box-outline",
    required: [],
    children: [
      { id: "owner.warehouse.list", label: "Warehouses", href: "/owner/warehouse", required: [] },
      { id: "owner.warehouse.new", label: "New Warehouse", href: "/owner/warehouse/new", required: [] },
    ],
  },
  {
    id: "owner.products",
    label: "Products",
    icon: "solar:box-minimalistic-outline",
    required: [],
    children: [
      { id: "owner.catalog", label: "Catalog", href: "/owner/catalog", required: [] },
      { id: "owner.products.list", label: "All Products", href: "/owner/products", required: [] },
      { id: "owner.products.new", label: "New Product", href: "/owner/products/new", required: [] },
      { id: "owner.products.approvals", label: "Approvals", href: "/owner/product-approvals", required: [] },
      { id: "owner.products.transfers", label: "Product Transfers", href: "/owner/transfers", required: [] },
    ],
  },
  { id: "owner.finance", label: "Finance", href: "/owner/finance", icon: "solar:wallet-outline", required: [] },
  {
    id: "owner.reports",
    label: "Reports",
    icon: "solar:chart-outline",
    required: [],
    children: [
      { id: "owner.reports.sales", label: "Sales Report", href: "/owner/reports/sales", required: [] },
      { id: "owner.reports.stock", label: "Stock Report", href: "/owner/reports/stock", required: [] },
      { id: "owner.reports.revenue", label: "Revenue Analytics", href: "/owner/reports/revenue", required: [] },
    ],
  },
  { id: "owner.audit", label: "Audit & System", href: "/owner/audit", icon: "solar:shield-check-outline", required: [] },
  {
    id: "owner.settings",
    label: "Settings",
    icon: "solar:settings-outline",
    required: [],
    children: [{ id: "owner.settings.profile", label: "Profile", href: "/owner/settings", required: [] }],
  },
  {
    id: "owner.teams",
    label: "Teams & Delegation",
    icon: "solar:users-group-two-rounded-outline",
    required: [],
    children: [
      { id: "owner.team.dashboard", label: "Team dashboard", href: "/owner/team", required: [] },
      { id: "owner.teams.list", label: "Teams", href: "/owner/teams", required: [] },
      { id: "owner.overview", label: "Overview", href: "/owner/overview", required: [] },
    ],
  },
  { id: "owner.notifications", label: "Notifications", href: "/owner/notifications", icon: "solar:bell-outline", required: [] },
];

const REGISTRY: Record<AppKey, MenuItem[]> = {
  owner: [
    { id: "owner.dashboard", label: "Dashboard", href: "/owner/dashboard", icon: "solar:home-smile-outline", required: [] },
    { id: "owner.workspace", label: "Workspace", href: "/owner/workspace", icon: "solar:widget-5-outline", required: [] },
    {
      id: "owner.operations",
      label: "Operations",
      icon: "solar:widget-5-outline",
      required: [],
      children: [
        { id: "owner.operations.appointments", label: "Appointments", href: "/owner/dashboards/branch-manager", required: [] },
        { id: "owner.operations.pos", label: "POS", href: "/owner/dashboards/branch-manager", required: [] },
        { id: "owner.operations.orders", label: "Orders", href: "/owner/orders", required: ["orders.read"] },
      ],
    },
    {
      id: "owner.clinic",
      label: "Clinic",
      icon: "solar:medical-kit-outline",
      required: ["clinic.overview.read"],
      children: [
        { id: "owner.clinic.overview", label: "Clinic Network", href: "/owner/clinic", required: ["clinic.overview.read"] },
        { id: "owner.clinic.doctors", label: "Doctors", href: "/owner/clinic?view=doctors", required: ["clinic.staff.manage"] },
        { id: "owner.clinic.doctorPerformance", label: "Doctor Performance", href: "/owner/clinic?view=doctor-performance", required: ["clinic.staff.manage"] },
        { id: "owner.clinic.doctorAudit", label: "Doctor Audit", href: "/owner/clinic?view=doctor-audit", required: ["clinic.staff.manage"] },
        { id: "owner.clinic.services", label: "Services", href: "/owner/clinic?view=services", required: ["clinic.services.manage"] },
        { id: "owner.clinic.packages", label: "Packages", href: "/owner/clinic?view=packages", required: ["clinic.services.manage"] },
        { id: "owner.clinic.schedule", label: "Schedule", href: "/owner/clinic?view=schedule", required: ["clinic.schedule.manage"] },
        { id: "owner.clinic.reports", label: "Reports", href: "/owner/clinic?view=reports", required: ["clinic.settings.read"] },
        { id: "owner.clinic.settings", label: "Settings", href: "/owner/clinic?view=settings", required: ["clinic.settings.read"] },
        { id: "owner.clinic.injectionMonitor", label: "Injection Monitor", href: "/owner/clinic?view=injection-monitor", required: ["medicine.reconciliation.read"] },
        { id: "owner.clinic.reconciliation", label: "Reconciliation", href: "/owner/clinic?view=reconciliation", required: ["medicine.reconciliation.read"] },
      ],
    },
    {
      id: "owner.dashboards",
      label: "Dashboards",
      icon: "solar:chart-2-outline",
      required: ["orders.read", "inventory.read", "staff.read"],
      children: [
        { id: "owner.dashboards.branchManager", label: "Branch Manager", href: "/owner/dashboards/branch-manager", required: ["orders.read", "inventory.read"] },
        { id: "owner.dashboards.staff", label: "General Staff", href: "/owner/dashboards/staff", required: ["staff.read"] },
      ],
    },
    {
      id: "owner.myBusiness",
      label: "My Business",
      icon: "solar:buildings-2-outline",
      required: ["org.read", "branch.read", "staff.read"],
      children: [
        {
          id: "owner.orgs",
          label: "Organizations",
          href: "/owner/organizations",
          required: ["org.read"],
          badgeType: "count",
          children: [
            { id: "owner.orgs.list", label: "All Organizations", href: "/owner/organizations", required: ["org.read"] },
            { id: "owner.orgs.new", label: "New Organization", href: "/owner/organizations/new", required: ["org.create"] },
          ],
        },
        {
          id: "owner.branches",
          label: "Branches",
          href: "/owner/branches",
          required: ["branch.read"],
          badgeType: "count",
          children: [
            { id: "owner.branches.list", label: "All Branches", href: "/owner/branches", required: ["branch.read"] },
            { id: "owner.branches.new", label: "New Branch", href: "/owner/branches/new", required: ["branch.create"] },
          ],
        },
        {
          id: "owner.staffs",
          label: "Staffs",
          href: "/owner/staffs",
          required: ["staff.read"],
          badgeType: "count",
          children: [
            { id: "owner.staffs.list", label: "All Staffs", href: "/owner/staffs", required: ["staff.read"] },
            { id: "owner.staffs.invite", label: "Invite Staff", href: "/owner/staffs/new", required: ["staff.create"] },
          ],
        },
      ],
    },
    {
      id: "owner.people",
      label: "People",
      icon: "solar:users-group-rounded-outline",
      required: [],
      children: [
        { id: "owner.people.customers", label: "Customers", href: "/owner/dashboards/branch-manager", required: ["customers.read"] },
      ],
    },
    {
      id: "owner.accessStaff",
      label: "Access & Staff",
      icon: "solar:user-check-outline",
      required: ["staff.read"],
      children: [
        { id: "owner.access.requests", label: "Access Requests", href: "/owner/access/requests", required: ["staff.read"] },
        { id: "owner.staff.directory", label: "Staff", href: "/owner/staff", required: ["staff.read"] },
        { id: "owner.access.control", label: "Access Control", href: "/owner/access/control", required: ["staff.read"] },
        { id: "owner.access.matrix", label: "Access Map", href: "/owner/access/matrix", required: ["staff.read"] },
      ],
    },
    {
      id: "owner.requests",
      label: "Requests & Approvals",
      icon: "solar:checklist-outline",
      required: ["inventory.read", "product.read"],
      children: [
        { id: "owner.requests.inbox", label: "Inbox", href: "/owner/requests", required: [], badgeType: "count" },
        { id: "owner.requests.product", label: "Product Requests", href: "/owner/product-requests", required: ["product.read"], badgeType: "count" },
        { id: "owner.requests.returns", label: "Returns & Damages", href: "/owner/returns", required: ["inventory.read"], badgeType: "count" },
        { id: "owner.requests.cancellations", label: "Cancellations", href: "/owner/cancellations", required: ["inventory.read"], badgeType: "count" },
      ],
    },
    {
      id: "owner.inventory",
      label: "Inventory",
      icon: "solar:box-outline",
      required: ["inventory.read"],
      children: [
        { id: "owner.inventory.overview", label: "Stock", href: "/owner/inventory", required: ["inventory.read"] },
        { id: "owner.inventory.vendors", label: "Vendors", href: "/owner/vendors", required: ["inventory.read"] },
        { id: "owner.inventory.warehouse", label: "Warehouse", href: "/owner/inventory/warehouse", required: ["inventory.read"] },
        { id: "owner.inventory.stockRequests", label: "Stock Requests", href: "/owner/inventory/stock-requests", required: ["inventory.read"] },
        { id: "owner.inventory.transfers", label: "Inventory Transfers", href: "/owner/inventory/transfers", required: ["inventory.read"] },
        { id: "owner.inventory.receipts", label: "Receipts", href: "/owner/inventory/receipts", required: ["inventory.read"] },
        { id: "owner.inventory.purchaseOrders", label: "Purchase orders", href: "/owner/inventory/purchase-orders", required: ["inventory.read"] },
        { id: "owner.inventory.allocation", label: "Allocation & picking", href: "/owner/inventory/allocation", required: ["inventory.read"] },
        { id: "owner.inventory.locations", label: "Locations", href: "/owner/inventory/locations", required: ["inventory.read"] },
        { id: "owner.inventory.adjustments", label: "Adjustments", href: "/owner/inventory/adjustments", required: ["inventory.read"] },
        { id: "owner.inventory.batches", label: "Batches", href: "/owner/inventory/batches", required: ["inventory.read"] },
        { id: "owner.inventory.writeOffs", label: "Write-Offs", href: "/owner/inventory/write-offs", required: ["inventory.read"] },
        { id: "owner.inventory.vendorReturns", label: "Vendor Returns", href: "/owner/inventory/vendor-returns", required: ["inventory.read"] },
        { id: "owner.inventory.warehouseTransfers", label: "Warehouse Transfers", href: "/owner/inventory/warehouse-transfers", required: ["inventory.read"] },
        { id: "owner.inventory.networkBalance", label: "Network balance", href: "/owner/inventory/network-balance", required: ["inventory.read"] },
        { id: "owner.inventory.reverseLogistics", label: "Reverse logistics", href: "/owner/inventory/reverse-logistics", required: ["inventory.read"] },
        { id: "owner.inventory.quarantine", label: "Quarantine stock", href: "/owner/inventory/quarantine", required: ["inventory.read"] },
        { id: "owner.inventory.analytics", label: "Analytics", href: "/owner/inventory/analytics", required: ["inventory.read"] },
        { id: "owner.inventory.controlTower", label: "Control tower", href: "/owner/inventory/control-tower", required: ["inventory.read"] },
        { id: "owner.inventory.procurementAi", label: "Procurement intelligence", href: "/owner/inventory/procurement-intelligence", required: ["inventory.read"] },
        { id: "owner.inventory.reconciliation", label: "Reconciliation", href: "/owner/inventory/reconciliation", required: ["inventory.read"] },
      ],
    },
    {
      id: "owner.pharmacy",
      label: "Pharmacy",
      icon: "ri:medicine-bottle-line",
      required: ["inventory.read"],
      children: [
        { id: "owner.pharmacy.dashboard", label: "Dashboard", href: "/owner/pharmacy", required: ["inventory.read"] },
        { id: "owner.pharmacy.requisitions", label: "Requisitions", href: "/owner/pharmacy/requisitions", required: ["inventory.read"], badgeType: "count" },
        { id: "owner.pharmacy.expiry", label: "Expiry management", href: "/owner/inventory/expiry-management", required: ["inventory.read"] },
        { id: "owner.pharmacy.recalls", label: "Batch recalls", href: "/owner/inventory/recalls", required: ["inventory.read"] },
      ],
    },
    {
      id: "owner.warehouse",
      label: "Warehouse",
      icon: "solar:box-outline",
      required: ["warehouse.view", "inventory.read"],
      children: [
        { id: "owner.warehouse.list", label: "Warehouses", href: "/owner/warehouse", required: ["warehouse.view", "inventory.read"] },
        { id: "owner.warehouse.new", label: "New Warehouse", href: "/owner/warehouse/new", required: ["warehouse.manage", "inventory.read"] },
      ],
    },
    {
      id: "owner.products",
      label: "Products",
      icon: "solar:box-minimalistic-outline",
      required: ["product.read", "org.read"],
      children: [
        { id: "owner.catalog", label: "Catalog", href: "/owner/catalog", required: ["product.read"] },
        { id: "owner.products.list", label: "All Products", href: "/owner/products", required: ["product.read"] },
        { id: "owner.products.new", label: "New Product", href: "/owner/products/new", required: ["product.create", "org.write"] },
        { id: "owner.products.approvals", label: "Approvals", href: "/owner/product-approvals", required: ["product.read"] },
        { id: "owner.products.transfers", label: "Product Transfers", href: "/owner/transfers", required: ["inventory.read"] },
      ],
    },
    { id: "owner.finance", label: "Finance", href: "/owner/finance", icon: "solar:wallet-outline", required: [] },
    { id: "owner.audit", label: "Audit & System", href: "/owner/audit", icon: "solar:shield-check-outline", required: [] },
    {
      id: "owner.teams",
      label: "Teams & Delegation",
      icon: "solar:users-group-two-rounded-outline",
      required: ["staff.read"],
      children: [
        { id: "owner.team.dashboard", label: "Team dashboard", href: "/owner/team", required: ["staff.read"] },
        { id: "owner.teams.list", label: "Teams", href: "/owner/teams", required: ["staff.read"] },
        { id: "owner.overview", label: "Overview", href: "/owner/overview", required: ["staff.read"] },
      ],
    },
    { id: "owner.notifications", label: "Notifications", href: "/owner/notifications", icon: "solar:bell-outline", required: [] },
    {
      id: "owner.reports",
      label: "Reports",
      icon: "solar:chart-outline",
      required: ["reports.read", "org.read"],
      children: [
        { id: "owner.reports.sales", label: "Sales Report", href: "/owner/reports/sales", required: ["reports.read"] },
        { id: "owner.reports.stock", label: "Stock Report", href: "/owner/reports/stock", required: ["reports.read"] },
        { id: "owner.reports.revenue", label: "Revenue Analytics", href: "/owner/reports/revenue", required: ["reports.read"] },
      ],
    },
    {
      id: "owner.settings",
      label: "Settings",
      icon: "solar:settings-outline",
      required: ["settings.read", "settings.manage"],
      children: [{ id: "owner.settings.profile", label: "Profile", href: "/owner/settings", required: [] }],
    },
  ],
  shop: [
    { id: "shop.dashboard", label: "Dashboard", href: "/shop", icon: "solar:home-smile-outline", required: [] },
    { id: "shop.pos", label: "POS", href: "/shop/pos", icon: "solar:cart-large-outline", required: ["orders.create"] },
    { id: "shop.sellerDash", label: "Seller Dashboard", href: "/shop/dashboards/seller", icon: "solar:chart-2-outline", required: ["orders.read"] },
    { id: "shop.orders", label: "Orders", href: "/shop/orders", icon: "solar:bag-check-outline", required: ["orders.read"] },
    { id: "shop.inventory", label: "Inventory", href: "/shop/inventory", icon: "solar:box-outline", required: ["inventory.read"] },
    { id: "shop.products", label: "Products", href: "/shop/products", icon: "solar:box-outline", required: ["product.read"] },
    { id: "shop.customers", label: "Customers", href: "/shop/customers", icon: "solar:users-group-rounded-outline", required: ["customers.read"] },
    { id: "shop.staff", label: "Staff", href: "/shop/staff", icon: "solar:user-id-outline", required: ["staff.read"] },
  ],
  clinic: [
    { id: "clinic.dashboard", label: "Dashboard", href: "/clinic", icon: "solar:home-smile-outline", required: [] },
    { id: "clinic.services", label: "Services", href: "/clinic/services", icon: "solar:medical-kit-outline", required: ["service.read"] },
    { id: "clinic.staffDash", label: "Clinic Staff Dashboard", href: "/clinic/dashboards/staff", icon: "solar:chart-2-outline", required: ["clinic.appointments.read"] },
    { id: "clinic.appt", label: "Appointments", href: "/clinic/appointments", icon: "solar:calendar-outline", required: ["clinic.appointments.read"] },
    { id: "clinic.queue", label: "Queue Console", href: "/clinic/queue", icon: "solar:list-outline", required: ["clinic.queue.manage"] },
    { id: "clinic.checkin", label: "Check-in Desk", href: "/clinic/checkin", icon: "solar:user-check-outline", required: ["clinic.appointments.manage", "clinic.queue.manage"] },
    { id: "clinic.screen", label: "Waiting Screen", href: "/clinic/screen", icon: "solar:tv-outline", required: ["clinic.queue.screen", "clinic.queue.manage"] },
    // Branch staff: list via staffClinicPatientsPath (branchSidebarConfig). Standalone /clinic/patients is a separate app route; deep links to staff workspace use staffClinicPatientDetailPath(branchId, petId) when opening a pet from a branch context.
    { id: "clinic.patients", label: "Patients", href: "/clinic/patients", icon: "solar:shield-check-outline", required: ["clinic.patients.read"] },
    { id: "clinic.staff", label: "Staff", href: "/clinic/staff", icon: "solar:user-id-outline", required: ["staff.read"] },
    { id: "clinic.medicineControl", label: "Medicine Control", href: "/clinic/medicine-control", icon: "ri:medicine-bottle-line", required: ["medicine.policy.read"], children: [
      { id: "clinic.medicineControl.dashboard", label: "Dashboard", href: "/clinic/medicine-control", required: ["medicine.policy.read"] },
      { id: "clinic.medicineControl.tokens", label: "Injection Tokens", href: "/clinic/medicine-control/injection-tokens", required: ["injection.token.list"] },
      { id: "clinic.medicineControl.injectionRoom", label: "Injection Room", href: "/clinic/medicine-control/injection-room", required: ["medicine.dose.record"] },
      { id: "clinic.medicineControl.dispense", label: "Dispense Requests", href: "/clinic/medicine-control/dispense-requests", required: ["medicine.dispense.request"] },
      { id: "clinic.medicineControl.vials", label: "Active Vials", href: "/clinic/medicine-control/active-vials", required: ["medicine.vial.open"] },
      { id: "clinic.medicineControl.returns", label: "Vial Returns", href: "/clinic/medicine-control/returns", required: ["medicine.return.submit"] },
      { id: "clinic.medicineControl.bins", label: "Audit Bins", href: "/clinic/medicine-control/audit-bins", required: ["medicine.audit.bin.view"] },
      { id: "clinic.medicineControl.injectionMonitor", label: "Injection Monitor", href: "/clinic/medicine-control/injection-monitor", required: ["medicine.reconciliation.read"] },
      { id: "clinic.medicineControl.reconciliation", label: "Reconciliation", href: "/clinic/medicine-control/reconciliation", required: ["medicine.reconciliation.read"] },
      { id: "clinic.medicineControl.policies", label: "Policies", href: "/clinic/medicine-control/policies", required: ["medicine.policy.read"] },
    ] },
  ],
  admin: [
    // ============================================
    // SECTION 1: Dashboard
    // ============================================
    {
      id: "admin.section.dashboard",
      label: "Dashboard",
      icon: "solar:home-smile-outline",
      required: [],
      children: [
        { id: "admin.dashboard", label: "Dashboard", href: "/admin/dashboard", required: [] },
        { id: "admin.liveMonitor", label: "Live Monitor", href: "/admin/live-monitor", required: [] },
      ],
    },

    // ============================================
    // SECTION 2: Verification Center
    // ============================================
    {
      id: "admin.section.verification",
      label: "Verification Center",
      icon: "solar:shield-check-outline",
      required: [],
      children: [
        { id: "admin.verifications.overview", label: "Overview Dashboard", href: "/admin/verifications", required: [] },
        { id: "admin.verifications.owners", label: "Owners", href: "/admin/verifications/owners", required: [] },
        { id: "admin.verifications.organizations", label: "Organizations", href: "/admin/verifications/organizations", required: [] },
        { id: "admin.verifications.branches", label: "Branches", href: "/admin/verifications/branches", required: [] },
        { id: "admin.verifications.staff", label: "Staff", href: "/admin/verifications/staff", required: [] },
        { id: "admin.verifications.producers", label: "Producers", href: "/admin/verifications/producer-orgs", required: [] },
        { id: "admin.verifications.doctors", label: "Doctors", href: "/admin/verifications/doctors", required: [] },
        { id: "admin.verificationMetrics", label: "Verification Metrics", href: "/admin/verification-metrics", required: [] },
      ],
    },

    // ============================================
    // SECTION 2.5: Producer Governance (Phase 2)
    // ============================================
    {
      id: "admin.section.producerGovernance",
      label: "Producer Governance",
      icon: "solar:clipboard-list-outline",
      required: [],
      children: [
        { id: "admin.producerGovernance.overview", label: "Producer Overview", href: "/admin/producer-overview", required: ["admin.governance.analytics.read"] },
        { id: "admin.producerGovernance.list", label: "Producers", href: "/admin/producer-governance", required: [] },
        { id: "admin.producerGovernance.approvals", label: "Approvals", href: "/admin/approvals", required: [] },
        { id: "admin.producerGovernance.products", label: "Products", href: "/admin/producer-governance/products", required: ["admin.approvals.manage"] },
        { id: "admin.producerGovernance.batchControl", label: "Batch Control", href: "/admin/batch-control", required: ["admin.governance.batches.review"] },
        { id: "admin.producerGovernance.analytics", label: "Governance analytics", href: "/admin/governance-analytics", required: ["admin.governance.analytics.read"] },
        { id: "admin.producerGovernance.enforcement", label: "Moderation / enforcement", href: "/admin/enforcement", required: ["admin.governance.incidents.manage"] },
        { id: "admin.producerGovernance.enforcementCases", label: "Trust & Safety cases", href: "/admin/enforcement/cases", required: ["admin.governance.enforcement.cases"] },
        { id: "admin.producerGovernance.codeLookup", label: "Code Lookup", href: "/admin/code-lookup", required: ["admin.governance.code.search"] },
        { id: "admin.producerGovernance.vendorAnalytics", label: "Vendor analytics", href: "/admin/vendor-analytics", required: ["admin.vendor.analytics.read"] },
      ],
    },

    // ============================================
    // SECTION 3: Users & Access
    // ============================================
    {
      id: "admin.section.usersAccess",
      label: "Users & Access",
      icon: "solar:users-group-rounded-outline",
      required: [],
      children: [
        { id: "admin.users", label: "Users", href: "/admin/users", required: [] },
        { id: "admin.staff", label: "Staff", href: "/admin/staff", required: [] },
        { id: "admin.roles", label: "Roles", href: "/admin/roles", required: [] },
        { id: "admin.perms", label: "Permissions", href: "/admin/permissions", required: [] },
        { id: "admin.whitelist", label: "Super Admin Whitelist", href: "/admin/super-admin-whitelist", required: [] },
      ],
    },

    // ============================================
    // SECTION 3.5: Country Governance
    // ============================================
    {
      id: "admin.section.countryGovernance",
      label: "Country Governance",
      icon: "solar:global-outline",
      required: [],
      children: [
        { id: "admin.countries", label: "Countries", href: "/admin/countries", required: [] },
        { id: "admin.states", label: "States / Provinces", href: "/admin/states", required: [] },
      ],
    },

    // ============================================
    // SECTION 3.6: Medicine workspace (catalog + master data)
    // ============================================
    {
      id: "admin.section.medicine",
      label: "Medicine",
      icon: "ri:medicine-bottle-line",
      required: [],
      children: [
        {
          id: "admin.medicine.dashboard",
          label: "Medicine Control Center",
          href: "/admin/medicine",
          required: [
            "medicine.master.read",
            "medicine.master.write",
            "medicine.catalog.import",
            "medicine.catalog.export",
            "medicine.catalog.review",
            "medicine.catalog.listing.manage",
            "medicine.catalog.governance",
          ],
        },
        { id: "admin.medicine.listings", label: "Medicines", href: "/admin/medicine/listings", required: ["medicine.master.read", "medicine.catalog.listing.manage", "medicine.master.write", "medicine.catalog.governance"] },
        { id: "admin.medicine.generics", label: "Generics", href: "/admin/medicine/generics", required: ["medicine.master.read", "medicine.master.write", "medicine.catalog.governance"] },
        { id: "admin.medicine.brands", label: "Brands", href: "/admin/medicine/brands", required: ["medicine.master.read", "medicine.master.write", "medicine.catalog.governance"] },
        { id: "admin.medicine.dosageForms", label: "Dosage Forms", href: "/admin/medicine/dosage-forms", required: ["medicine.master.read", "medicine.master.write", "medicine.catalog.governance"] },
        { id: "admin.medicine.presentations", label: "Strengths / Presentations", href: "/admin/medicine/presentations", required: ["medicine.master.read", "medicine.master.write", "medicine.catalog.governance"] },
        { id: "admin.medicine.manufacturers", label: "Manufacturers", href: "/admin/medicine/manufacturers", required: ["medicine.master.read", "medicine.master.write", "medicine.catalog.governance"] },
        { id: "admin.medicine.countryCatalogs", label: "Country Catalogs", href: "/admin/medicine/country-catalogs", required: ["medicine.master.read", "medicine.catalog.listing.manage", "medicine.master.write", "medicine.catalog.governance"] },
        { id: "admin.medicine.imports", label: "Imports", href: "/admin/medicine/imports", required: ["medicine.catalog.import", "medicine.master.write", "medicine.catalog.governance"] },
        { id: "admin.medicine.review", label: "Review & Conflicts", href: "/admin/medicine/review", required: ["medicine.catalog.review", "medicine.master.read", "medicine.catalog.import", "medicine.catalog.governance"] },
        { id: "admin.medicine.exports", label: "Export & Reports", href: "/admin/medicine/exports", required: ["medicine.catalog.export", "medicine.master.write", "medicine.catalog.governance"] },
        { id: "admin.medicine.settings", label: "Governance", href: "/admin/medicine/settings", required: ["medicine.master.read", "medicine.catalog.governance"] },
      ],
    },

    // ============================================
    // SECTION 4: Organizations & Branches
    // ============================================
    {
      id: "admin.section.orgsBranches",
      label: "Organizations & Branches",
      icon: "solar:buildings-2-outline",
      required: [],
      children: [
        { id: "admin.orgs", label: "Organizations", href: "/admin/organizations", required: [] },
        { id: "admin.branches", label: "Branches", href: "/admin/branches", required: [] },
        { id: "admin.branchTypes", label: "Branch Types", href: "/admin/branch-types", required: [] },
      ],
    },

    // ============================================
    // SECTION 5: Commerce & Catalog
    // ============================================
    {
      id: "admin.section.commerce",
      label: "Commerce & Catalog",
      icon: "solar:shop-2-outline",
      required: [],
      children: [
        { id: "admin.products", label: "Products", href: "/admin/products", required: [] },
        { id: "admin.productsModeration", label: "Moderation Queue", href: "/admin/products/moderation", required: [] },
        { id: "admin.productsMasterCatalog", label: "Master Catalog", href: "/admin/products/master-catalog", required: [] },
        { id: "admin.productsMasterCatalogImport", label: "Master Catalog → Import CSV", href: "/admin/products/master-catalog/import", required: [] },
        { id: "admin.productsApprovals", label: "Approvals", href: "/admin/products/approvals", required: [] },
        { id: "admin.vendors", label: "Vendors", href: "/admin/vendors", required: [] },
        { id: "admin.pricing", label: "Pricing", href: "/admin/pricing", required: [] },
        { id: "admin.onlineStore", label: "Online Store", href: "/admin/online-store", required: [] },
      ],
    },

    // ============================================
    // SECTION 6: Orders & Finance (Phase 5: Fundraising policy-gated in layout)
    // ============================================
    {
      id: "admin.section.ordersFinance",
      label: "Orders & Finance",
      icon: "solar:wallet-money-outline",
      required: [],
      children: [
        { id: "admin.orders", label: "Orders", href: "/admin/orders", required: [] },
        { id: "admin.returns", label: "Returns", href: "/admin/returns", required: [] },
        { id: "admin.wallet", label: "Wallet / Payouts", href: "/admin/wallet", required: [] },
        { id: "admin.fundraising", label: "Fundraising", href: "/admin/fundraising", required: [], policyFeature: "DONATION" },
        { id: "admin.pos", label: "POS Transactions", href: "/admin/pos/transactions", required: [] },
        { id: "admin.transfers", label: "Transfers", href: "/admin/transfers", required: [] },
      ],
    },

    // ============================================
    // SECTION 7: Clinic Operations
    // ============================================
    {
      id: "admin.section.clinic",
      label: "Clinic Operations",
      icon: "solar:medical-kit-outline",
      required: [],
      children: [
        { id: "admin.services", label: "Service Catalog", href: "/admin/services", required: [] },
        { id: "admin.appointments", label: "Appointments", href: "/admin/appointments", required: [] },
      ],
    },

    // ============================================
    // SECTION 8: Delivery & Logistics
    // ============================================
    {
      id: "admin.section.delivery",
      label: "Delivery & Logistics",
      icon: "solar:delivery-outline",
      required: [],
      children: [
        { id: "admin.delivery", label: "Delivery Hub", href: "/admin/delivery", required: [] },
        { id: "admin.deliveryJobs", label: "Delivery Jobs", href: "/admin/delivery/jobs", required: [] },
        { id: "admin.deliveryRiders", label: "Riders", href: "/admin/delivery/riders", required: [] },
        { id: "admin.deliveryHubs", label: "Hubs", href: "/admin/delivery/hubs", required: [] },
        { id: "admin.deliveryIncidents", label: "Incidents", href: "/admin/delivery/incidents", required: [] },
      ],
    },

    // ============================================
    // SECTION 9: Inventory Intelligence
    // ============================================
    {
      id: "admin.section.inventory",
      label: "Inventory Intelligence",
      icon: "solar:box-outline",
      required: [],
      children: [
        { id: "admin.inventory", label: "Inventory", href: "/admin/inventory", required: [] },
      ],
    },

    // ============================================
    // SECTION 10: Support & Moderation
    // ============================================
    {
      id: "admin.section.support",
      label: "Support & Moderation",
      icon: "solar:headphones-round-sound-outline",
      required: [],
      children: [
        { id: "admin.support", label: "Support Hub", href: "/admin/support", required: [] },
        { id: "admin.supportTickets", label: "Tickets", href: "/admin/support/tickets", required: [] },
        { id: "admin.supportReviews", label: "Reviews", href: "/admin/support/reviews", required: [] },
        { id: "admin.supportReports", label: "Reports / Abuse", href: "/admin/support/reports", required: [] },
      ],
    },

    // ============================================
    // SECTION 11: Content & Notifications
    // ============================================
    {
      id: "admin.section.content",
      label: "Content & Notifications",
      icon: "solar:document-text-outline",
      required: [],
      children: [
        { id: "admin.content", label: "Content Hub", href: "/admin/content", required: [] },
        { id: "admin.contentAnnouncements", label: "Announcements", href: "/admin/content/announcements", required: [] },
        { id: "admin.contentNotifications", label: "Notification Logs", href: "/admin/content/notifications", required: [] },
        { id: "admin.contentTemplates", label: "Template Library", href: "/admin/content/templates", required: [] },
        { id: "admin.contentCms", label: "CMS Pages", href: "/admin/content/cms", required: [] },
      ],
    },

    // ============================================
    // SECTION 12: System & Settings
    // ============================================
    {
      id: "admin.section.system",
      label: "System & Settings",
      icon: "solar:settings-outline",
      required: [],
      children: [
        { id: "admin.system", label: "System Hub", href: "/admin/system", required: [] },
        { id: "admin.health", label: "Health", href: "/admin/health", required: [] },
        { id: "admin.systemIntegrations", label: "Integrations", href: "/admin/system/integrations", required: [] },
        { id: "admin.systemSessions", label: "Active Sessions", href: "/admin/system/sessions", required: [] },
        { id: "admin.settings", label: "Settings", href: "/admin/settings", required: [] },
        { id: "admin.analytics", label: "Analytics", href: "/admin/analytics", required: [] },
      ],
    },

    // ============================================
    // SECTION 13: Audit & Security
    // ============================================
    {
      id: "admin.section.audit",
      label: "Audit & Security",
      icon: "solar:shield-user-outline",
      required: [],
      children: [
        { id: "admin.audit", label: "Audit Logs", href: "/admin/audit", required: [] },
        { id: "admin.onboarding", label: "Onboarding", href: "/admin/onboarding", required: [] },
        { id: "admin.onboardingPublish", label: "Publish Requests", href: "/admin/onboarding/publish-requests", required: [] },
        { id: "admin.onboardingPartner", label: "Partner Applications", href: "/admin/onboarding/partner-applications", required: [] },
      ],
    },

    // ============================================
    // SECTION 14: Planning & Docs (Global-Ready)
    // ============================================
    {
      id: "admin.section.planningDocs",
      label: "Planning & Docs",
      icon: "solar:document-text-outline",
      required: [],
      children: [
        { id: "admin.docs", label: "Planning & Docs", href: "/admin/docs", required: [] },
      ],
    },

    // ============================================
    // SECTION 15: Product Authenticity (MVP)
    // ============================================
    {
      id: "admin.section.authenticity",
      label: "Product Authenticity",
      icon: "solar:shield-check-outline",
      required: [],
      children: [
        { id: "admin.auth.dashboard", label: "Dashboard", href: "/admin/authenticity/dashboard", required: [] },
        { id: "admin.auth.factories", label: "Factories & Lines", href: "/admin/authenticity/factories", required: [] },
        { id: "admin.auth.products", label: "Product Versions", href: "/admin/authenticity/products", required: [] },
        { id: "admin.auth.batches", label: "Batches", href: "/admin/authenticity/batches", required: [] },
        { id: "admin.auth.serials", label: "Serials", href: "/admin/authenticity/serials", required: [] },
        { id: "admin.auth.alerts", label: "Fraud Alerts", href: "/admin/authenticity/alerts", required: [] },
      ],
    },
  ],
  country: [
    {
      id: "country.section.dashboard",
      label: "Dashboard",
      icon: "solar:home-smile-outline",
      required: ["country.dashboard.read"],
      children: [{ id: "country.dashboard", label: "Dashboard", href: "/country/dashboard", required: ["country.dashboard.read"] }],
    },
    {
      id: "country.section.operations",
      label: "Operations",
      icon: "solar:layers-outline",
      required: ["country.operations.read"],
      children: [
        { id: "country.adoptions", label: "Adoptions", href: "/country/adoptions", required: ["country.adoptions.read"] },
        { id: "country.donations", label: "Donations", href: "/country/donations", required: ["country.donations.read"], policyFeature: "DONATION" },
        { id: "country.fundraising", label: "Fund Raising", href: "/country/fundraising", required: ["country.fundraising.read"], policyFeature: "DONATION" },
        { id: "country.clinics", label: "Clinics", href: "/country/clinics", required: ["country.clinics.read"] },
        { id: "country.petshops", label: "Petshops", href: "/country/petshops", required: ["country.petshops.read"] },
        { id: "country.foster", label: "Foster Care", href: "/country/foster-care", required: ["country.foster.read"] },
        { id: "country.rescue", label: "Rescue Teams", href: "/country/rescue", required: ["country.rescue.read"] },
        { id: "country.shelters", label: "Shelter Homes", href: "/country/shelters", required: ["country.shelters.read"] },
      ],
    },
    {
      id: "country.section.moderationSupport",
      label: "Moderation & Support",
      icon: "solar:shield-check-outline",
      required: ["country.moderation.read", "country.support.read"],
      children: [
        { id: "country.moderation", label: "Content Moderation", href: "/country/moderation", required: ["country.moderation.read"] },
        { id: "country.support", label: "Support Tickets", href: "/country/support", required: ["country.support.read"] },
      ],
    },
    {
      id: "country.section.orgsPeople",
      label: "Organizations & People",
      icon: "solar:buildings-2-outline",
      required: ["country.orgs.read", "country.staff.read"],
      children: [
        { id: "country.orgs", label: "Organizations", href: "/country/orgs", required: ["country.orgs.read"] },
        { id: "country.staff", label: "Country Staff", href: "/country/staff", required: ["country.staff.read"] },
        { id: "country.staff.invites", label: "Invites", href: "/country/staff/invites", required: ["country.staff.invite"] },
      ],
    },
    {
      id: "country.section.complianceReports",
      label: "Compliance & Reports",
      icon: "solar:clipboard-check-outline",
      required: ["country.compliance.read", "country.reports.read", "country.audit.read"],
      children: [
        { id: "country.compliance", label: "Compliance Center", href: "/country/compliance", required: ["country.compliance.read"] },
        { id: "country.reports", label: "Reports", href: "/country/reports", required: ["country.reports.read"] },
        { id: "country.audit", label: "Audit Logs", href: "/country/audit-logs", required: ["country.audit.read"] },
      ],
    },
    {
      id: "country.section.settings",
      label: "Settings",
      icon: "solar:settings-outline",
      required: ["country.profile.read", "country.settings.features.read", "country.settings.policies.read"],
      children: [
        { id: "country.settings.features", label: "Feature Toggles", href: "/country/settings/features", required: ["country.settings.features.read"] },
        { id: "country.settings.policies", label: "Policy Rules", href: "/country/settings/policies", required: ["country.settings.policies.read"] },
        { id: "country.profile", label: "Profile", href: "/country/profile", required: ["country.profile.read"] },
      ],
    },
  ],
  mother: [
    { id: "mother.home", label: "Home", href: "/mother", icon: "solar:home-smile-outline", required: [] },
  ],
  producer: [
    { id: "producer.dashboard", label: "Dashboard", href: "/producer/dashboard", icon: "solar:home-smile-outline", required: [] },
    { id: "producer.kyc", label: "KYC / Verification", href: "/producer/kyc", icon: "solar:shield-check-outline", required: [] },
    { id: "producer.products", label: "Products", href: "/producer/products", icon: "solar:box-outline", required: [] },
    { id: "producer.batches", label: "Batches", href: "/producer/batches", icon: "solar:archive-outline", required: [] },
    {
      id: "producer.print",
      label: "Print",
      icon: "solar:printer-outline",
      required: [],
      children: [
        { id: "producer.print.batches", label: "Batches", href: "/producer/print/batches", required: [] },
      ],
    },
    { id: "producer.approvals", label: "Approvals", href: "/producer/approvals", icon: "solar:checklist-minimalistic-outline", required: ["producer.org.read"] },
    { id: "producer.staff", label: "Staff", href: "/producer/staff", icon: "solar:users-group-two-rounded-bold-duotone", required: ["producer.org.read"] },
    { id: "producer.support", label: "Support", href: "/producer/support/tickets", icon: "solar:chat-round-dots-outline", required: [] },
  ],
  // Branch-scoped clinic items (Patients, Appointments, etc.) come from branchSidebarConfig when inside /staff/branch/[branchId]; keep this list minimal.
  staff: [
    { id: "staff.dashboard", label: "Branches", href: "/staff/branch", icon: "solar:home-smile-outline", required: [] },
    { id: "staff.warehouse", label: "Warehouse Ops", href: "/staff/warehouse", icon: "solar:box-outline", required: ["warehouse.view"] },
    { id: "staff.workspace", label: "Workspace", href: "/staff/workspace", icon: "solar:widget-5-outline", required: [] },
  ],
  doctor: [
    { id: "doctor.dashboard", label: "Dashboard", href: "/doctor/dashboard", icon: "solar:home-smile-outline", required: [] },
    { id: "doctor.clinics", label: "Clinics", href: "/doctor/clinics", icon: "solar:buildings-2-outline", required: [] },
    { id: "doctor.requests", label: "My Requests", href: "/doctor/requests", icon: "solar:clipboard-list-outline", required: [] },
    { id: "doctor.appointments", label: "Appointments", href: "/doctor/appointments", icon: "solar:calendar-outline", required: [] },
    { id: "doctor.schedule", label: "Schedule", href: "/doctor/schedule", icon: "solar:calendar-mark-outline", required: [] },
    { id: "doctor.follow-ups", label: "Follow-ups", href: "/doctor/follow-ups", icon: "solar:calendar-search-outline", required: [] },
    { id: "doctor.patients", label: "Patients / Visits", href: "/doctor/patients", icon: "solar:shield-check-outline", required: [] },
    { id: "doctor.prescriptions", label: "Prescriptions", href: "/doctor/prescriptions", icon: "solar:document-text-outline", required: [] },
    { id: "doctor.cases", label: "Cases / Surgery", href: "/doctor/cases", icon: "solar:heart-pulse-outline", required: [] },
    { id: "doctor.services", label: "Services", href: "/doctor/services", icon: "solar:stethoscope-outline", required: [] },
    {
      id: "doctor.serviceFees",
      label: "Service fees & pricing",
      href: "/doctor/service-fees",
      icon: "solar:tag-outline",
      required: [],
    },
    { id: "doctor.settlement", label: "Settlement / Earnings", href: "/doctor/settlement", icon: "solar:wallet-money-outline", required: [] },
    { id: "doctor.notifications", label: "Notifications", href: "/doctor/notifications", icon: "solar:bell-outline", required: [] },
  ],
};

/**
 * Returns the full menu tree for a panel (no permission filtering).
 * Used by Larkon dashboard sidebar to restore full WowDash-style menus.
 */
export function getFullMenu(app: AppKey): MenuItem[] {
  if (app === "owner") return CORE_OWNER_FALLBACK;
  return REGISTRY[app as keyof typeof REGISTRY] || [];
}

export function buildMenu(app: AppKey, permissions: string[] | Set<string>, options: BuildMenuOptions = {}): MenuItem[] {
  const perms = permissions instanceof Set ? permissions : new Set((permissions || []).map((x) => String(x)));
  const base = REGISTRY[app] || [];
  const filtered = filterTree(base, perms);

  // Hotfix fallback: keep core Owner navigation reachable when permissions aren't seeded/assigned yet.
  // Some environments may return non-empty but mismatched permission keys; in that case the filtered tree
  // can still end up empty or missing the core Owner My Business children.
  if (app === "owner" && options.isAuthenticated) {
    const hasMyBusiness = filtered.some((x) => x.id === "owner.myBusiness");
    const myBiz = filtered.find((x) => x.id === "owner.myBusiness");
    const myBizKids = Array.isArray(myBiz?.children) ? myBiz!.children! : [];

    // If menu is empty OR My Business is missing/empty, merge/repair from fallback.
    if (filtered.length === 0 || !hasMyBusiness || myBizKids.length === 0) {
      const merged: MenuItem[] = [...filtered];
      for (const it of CORE_OWNER_FALLBACK) {
        const idx = merged.findIndex((m) => m.id === it.id);
        if (idx === -1) merged.push(it);
        else {
          // If existing item is missing children, prefer fallback's children.
          const existing = merged[idx];
          if (it.children?.length && (!existing.children || existing.children.length === 0)) {
            merged[idx] = { ...existing, children: it.children };
          }
        }
      }
      return merged;
    }
  }

  // Admin: if filtered is empty (e.g. permissions not seeded), show full section-block structure.
  if (app === "admin" && options.isAuthenticated && filtered.length === 0) {
    return base;
  }
  if (app === "country" && options.isAuthenticated && filtered.length === 0) {
    return base;
  }

  return filtered;
}

export function appKeyFromPath(pathname?: string): AppKey {
  const p = String(pathname || "");
  if (p.startsWith("/admin")) return "admin";
  if (p.startsWith("/country")) return "country";
  if (p.startsWith("/owner")) return "owner";
  if (p.startsWith("/producer")) return "producer";
  if (p.startsWith("/shop")) return "shop";
  if (p.startsWith("/clinic")) return "clinic";
  if (p.startsWith("/doctor")) return "doctor";
  if (p.startsWith("/mother")) return "mother";
  if (p.startsWith("/staff")) return "staff";
  return "owner";
}
