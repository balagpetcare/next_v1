/**
 * Entity configuration system for declarative entity definitions
 * This allows easy addition of new entities by just adding configuration
 */

export const entityConfigs = {
  organization: {
    name: "Organization",
    plural: "Organizations",
    icon: "solar:buildings-2-outline",
    apiPath: "/api/v1/owner/organizations",
    listPath: "/owner/organizations",
    detailPath: (id) => `/owner/organizations/${id}`,
    editPath: (id) => `/owner/organizations/${id}/edit`,
    newPath: "/owner/organizations/new",
    columns: [
      { key: "name", label: "Name", sortable: true, type: "link" },
      { key: "status", label: "Status", type: "badge" },
      { key: "verificationStatus", label: "Verification", type: "badge" },
      { key: "email", label: "Email" },
      { key: "supportPhone", label: "Phone" },
    ],
    filters: ["status", "verificationStatus"],
    stats: ["total", "verified", "pending"],
    quickFilters: [
      { key: "verificationStatus", value: "VERIFIED", label: "Verified" },
      { key: "verificationStatus", value: "PENDING_REVIEW", label: "Pending" },
      { key: "status", value: "ACTIVE", label: "Active" },
    ],
  },
  branch: {
    name: "Branch",
    plural: "Branches",
    icon: "solar:shop-2-outline",
    apiPath: "/api/v1/owner/branches",
    listPath: "/owner/branches",
    detailPath: (id) => `/owner/branches/${id}`,
    editPath: (id) => `/owner/branches/${id}/edit`,
    newPath: "/owner/branches/new",
    columns: [
      { key: "name", label: "Branch Name", sortable: true, type: "link" },
      { key: "phone", label: "Contact", type: "link" },
      { key: "verificationStatus", label: "Status", type: "badge" },
      { key: "createdAt", label: "Created", type: "date" },
    ],
    filters: ["status", "verificationStatus"],
    stats: ["total", "verified", "pending"],
    quickFilters: [
      { key: "verificationStatus", value: "VERIFIED", label: "Verified" },
      { key: "verificationStatus", value: "SUBMITTED", label: "Submitted" },
      { key: "verificationStatus", value: "DRAFT", label: "Draft" },
    ],
  },
  staff: {
    name: "Staff",
    plural: "Staffs",
    icon: "solar:user-id-outline",
    apiPath: "/api/v1/owner/staffs",
    listPath: "/owner/staffs",
    detailPath: (id) => `/owner/staffs/${id}`,
    editPath: (id) => `/owner/staffs/${id}/edit`,
    newPath: "/owner/staffs/new",
    columns: [
      {
        key: "user.profile.displayName",
        label: "Staff",
        sortable: true,
        type: "link",
      },
      { key: "role", label: "Role" },
      { key: "branch.name", label: "Branch" },
      { key: "status", label: "Status", type: "badge" },
      { key: "user.auth.email", label: "Email" },
    ],
    filters: ["status", "role", "branchId"],
    stats: ["total", "active", "inactive"],
    quickFilters: [
      { key: "status", value: "ACTIVE", label: "Active" },
      { key: "status", value: "INACTIVE", label: "Inactive" },
      { key: "role", value: "BRANCH_MANAGER", label: "Managers" },
    ],
    advancedFilters: [
      {
        key: "role",
        label: "Role",
        type: "select",
        options: [
          { value: "ORG_ADMIN", label: "ORG_ADMIN" },
          { value: "BRANCH_MANAGER", label: "BRANCH_MANAGER" },
          { value: "BRANCH_STAFF", label: "BRANCH_STAFF" },
          { value: "SELLER", label: "SELLER" },
        ],
      },
    ],
  },
};

/**
 * Get entity configuration by type
 */
export function getEntityConfig(entityType) {
  return entityConfigs[entityType] || null;
}

/**
 * Get all entity types
 */
export function getEntityTypes() {
  return Object.keys(entityConfigs);
}

/**
 * Helper to build breadcrumbs for an entity
 */
export function buildBreadcrumbs(entityType, action = "list") {
  const config = getEntityConfig(entityType);
  if (!config) return [];

  const base = [
    { label: "Owner", href: "/owner" },
    { label: config.plural, href: config.listPath },
  ];

  if (action === "detail") {
    base.push({ label: "Details" });
  } else if (action === "edit") {
    base.push({ label: "Edit" });
  } else if (action === "new") {
    base.push({ label: "New" });
  }

  return base;
}
