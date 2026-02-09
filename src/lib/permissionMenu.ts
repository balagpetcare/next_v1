"use client";

export type AppKey = "owner" | "admin" | "shop" | "clinic" | "mother" | "producer" | "country";

export type MenuItem = {
  id: string;
  label: string;
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
      { id: "owner.requests.transfers", label: "Inventory Transfers", href: "/owner/inventory/transfers", required: [], badgeType: "count" },
      { id: "owner.requests.adjustments", label: "Inventory Adjustments", href: "/owner/inventory/adjustments", required: [], badgeType: "count" },
      { id: "owner.requests.returns", label: "Returns & Damages", href: "/owner/returns", required: [], badgeType: "count" },
      { id: "owner.requests.cancellations", label: "Cancellations", href: "/owner/cancellations", required: [], badgeType: "count" },
      { id: "owner.requests.notifications", label: "Notifications", href: "/owner/notifications", required: [], badgeType: "count" },
    ],
  },
  {
    id: "owner.inventory",
    label: "Inventory",
    icon: "solar:box-outline",
    required: [],
    children: [
      { id: "owner.inventory.overview", label: "Overview", href: "/owner/inventory", required: [] },
      { id: "owner.inventory.warehouse", label: "Warehouse", href: "/owner/inventory/warehouse", required: [] },
      { id: "owner.inventory.stockRequests", label: "Stock Requests", href: "/owner/inventory/stock-requests", required: [] },
      { id: "owner.inventory.transfers", label: "Transfers", href: "/owner/inventory/transfers", required: [] },
      { id: "owner.inventory.receipts", label: "Receipts", href: "/owner/inventory/receipts", required: [] },
      { id: "owner.inventory.adjustments", label: "Adjustments", href: "/owner/inventory/adjustments", required: [] },
      { id: "owner.inventory.batches", label: "Batches", href: "/owner/inventory/batches", required: [] },
    ],
  },
  {
    id: "owner.products",
    label: "Products",
    icon: "solar:box-outline",
    required: [],
    children: [
      { id: "owner.catalog", label: "Catalog", href: "/owner/catalog", required: [] },
      { id: "owner.products.list", label: "All Products", href: "/owner/products", required: [] },
      { id: "owner.products.new", label: "New Product", href: "/owner/products/new", required: [] },
      { id: "owner.products.approvals", label: "Approvals", href: "/owner/product-approvals", required: [] },
      { id: "owner.products.requests", label: "Product Requests", href: "/owner/product-requests", required: [] },
      { id: "owner.products.inventory", label: "Inventory", href: "/owner/inventory", required: [] },
      { id: "owner.products.stockRequests", label: "Stock Requests", href: "/owner/inventory/stock-requests", required: [] },
      { id: "owner.products.transfers", label: "Transfers", href: "/owner/transfers", required: [] },
      { id: "owner.products.returns", label: "Returns", href: "/owner/returns", required: [] },
    ],
  },
  { id: "owner.finance", label: "Finance", href: "/owner/finance", icon: "solar:wallet-outline", required: [] },
  { id: "owner.audit", label: "Audit & System", href: "/owner/audit", icon: "solar:shield-check-outline", required: [] },
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
        { id: "owner.requests.transfers", label: "Inventory Transfers", href: "/owner/inventory/transfers", required: ["inventory.read"], badgeType: "count" },
        { id: "owner.requests.adjustments", label: "Inventory Adjustments", href: "/owner/inventory/adjustments", required: ["inventory.read"], badgeType: "count" },
        { id: "owner.requests.returns", label: "Returns & Damages", href: "/owner/returns", required: ["inventory.read"], badgeType: "count" },
        { id: "owner.requests.cancellations", label: "Cancellations", href: "/owner/cancellations", required: ["inventory.read"], badgeType: "count" },
        { id: "owner.requests.notifications", label: "Notifications", href: "/owner/notifications", required: [], badgeType: "count" },
      ],
    },
    {
      id: "owner.inventory",
      label: "Inventory",
      icon: "solar:box-outline",
      required: ["inventory.read"],
      children: [
        { id: "owner.inventory.overview", label: "Overview", href: "/owner/inventory", required: ["inventory.read"] },
        { id: "owner.inventory.warehouse", label: "Warehouse", href: "/owner/inventory/warehouse", required: ["inventory.read"] },
        { id: "owner.inventory.stockRequests", label: "Stock Requests", href: "/owner/inventory/stock-requests", required: ["inventory.read"] },
        { id: "owner.inventory.transfers", label: "Transfers", href: "/owner/inventory/transfers", required: ["inventory.read"] },
        { id: "owner.inventory.receipts", label: "Receipts", href: "/owner/inventory/receipts", required: ["inventory.read"] },
        { id: "owner.inventory.adjustments", label: "Adjustments", href: "/owner/inventory/adjustments", required: ["inventory.read"] },
        { id: "owner.inventory.batches", label: "Batches", href: "/owner/inventory/batches", required: ["inventory.read"] },
      ],
    },
    {
      id: "owner.products",
      label: "Products",
      icon: "solar:box-outline",
      required: ["product.read", "org.read"],
      children: [
        { id: "owner.catalog", label: "Catalog", href: "/owner/catalog", required: ["product.read"] },
        { id: "owner.products.list", label: "All Products", href: "/owner/products", required: ["product.read"] },
        { id: "owner.products.new", label: "New Product", href: "/owner/products/new", required: ["product.create", "org.write"] },
        { id: "owner.products.approvals", label: "Approvals", href: "/owner/product-approvals", required: ["product.read"] },
        { id: "owner.products.requests", label: "Product Requests", href: "/owner/product-requests", required: ["product.read"] },
        { id: "owner.products.inventory", label: "Inventory", href: "/owner/inventory", required: ["inventory.read"] },
        { id: "owner.products.stockRequests", label: "Stock Requests", href: "/owner/inventory/stock-requests", required: ["inventory.read"] },
        { id: "owner.products.transfers", label: "Transfers", href: "/owner/transfers", required: ["inventory.read"] },
        { id: "owner.products.returns", label: "Returns", href: "/owner/returns", required: ["inventory.read"] },
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
      id: "owner.orders",
      label: "Orders",
      icon: "solar:bag-check-outline",
      href: "/owner/orders",
      required: ["orders.read", "org.read"],
    },
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
      children: [{ id: "owner.settings.profile", label: "Profile", href: "/owner/settings", required: ["settings.read"] }],
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
    { id: "clinic.patients", label: "Patients", href: "/clinic/patients", icon: "solar:shield-check-outline", required: ["clinic.patients.read"] },
    { id: "clinic.staff", label: "Staff", href: "/clinic/staff", icon: "solar:user-id-outline", required: ["staff.read"] },
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
        { id: "admin.verifications", label: "Verifications", href: "/admin/verifications", required: [] },
        { id: "admin.verificationMetrics", label: "Verification Metrics", href: "/admin/verification-metrics", required: [] },
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
  ],
};

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
  if (p.startsWith("/mother")) return "mother";
  return "owner";
}
