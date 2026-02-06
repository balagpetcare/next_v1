// Central config for all admin panels.
// Add/remove panels here.

export const PANELS = {
  admin: {
    key: "admin",
    label: "Super Admin",
    basePath: "/admin",
    brand: { title: "BPA — Super Admin" },
  },
  owner: {
    key: "owner",
    label: "Owner Panel",
    basePath: "/owner",
    brand: { title: "BPA — Owner" },
  },
  manager: {
    key: "manager",
    label: "Branch Manager",
    basePath: "/manager",
    brand: { title: "BPA — Manager" },
  },
  staff: {
    key: "staff",
    label: "Staff Panel",
    basePath: "/staff",
    brand: { title: "BPA — Staff" },
  },
  delivery: {
    key: "delivery",
    label: "Delivery Hub",
    basePath: "/delivery",
    brand: { title: "BPA — Delivery Hub" },
  },
  support: {
    key: "support",
    label: "Customer Support",
    basePath: "/support",
    brand: { title: "BPA — Support" },
  },
};

// Default navigation tree (can be customized per panel by filtering later)
export const DEFAULT_NAV = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: "solar:home-smile-angle-outline" },
  { key: "branches", label: "Branches", href: "/branches", icon: "solar:buildings-3-outline" },
  { key: "staff", label: "Staff", href: "/staff", icon: "solar:users-group-rounded-outline" },
  { key: "users", label: "Users", href: "/users", icon: "solar:user-circle-outline" },
  { key: "wallet", label: "Wallet", href: "/wallet", icon: "solar:wallet-2-outline" },
  { key: "fundraising", label: "Fundraising", href: "/fundraising", icon: "solar:heart-pulse-outline" },
  { key: "audit", label: "Audit Logs", href: "/audit-logs", icon: "solar:clipboard-list-outline" },
  { key: "settings", label: "Settings", href: "/settings", icon: "solar:settings-outline" },
];
