// Producer Dashboard Menu Configuration
// Role-based menu items

export const producerMenuItems = [
  {
    title: "Dashboard",
    path: "/producer/dashboard",
    icon: "solar:home-2-bold-duotone",
    permission: "producer.org.read",
  },
  {
    title: "Products",
    icon: "solar:box-bold-duotone",
    permission: "producer.products.read",
    subMenu: [
      {
        title: "All Products",
        path: "/producer/products",
        permission: "producer.products.read",
      },
      {
        title: "Add Product",
        path: "/producer/products/new",
        permission: "producer.products.write",
      },
    ],
  },
  {
    title: "Batches",
    icon: "solar:layers-bold-duotone",
    permission: "producer.batches.read",
    subMenu: [
      {
        title: "All Batches",
        path: "/producer/batches",
        permission: "producer.batches.read",
      },
    ],
  },
  {
    title: "Staff Management",
    path: "/producer/staff",
    icon: "solar:users-group-two-rounded-bold-duotone",
    permission: "producer.org.write",
    ownerOnly: true,
  },
  {
    title: "Verification Logs",
    path: "/producer/verifications",
    icon: "solar:shield-check-bold-duotone",
    permission: "producer.verification.read",
  },
  {
    title: "Analytics",
    path: "/producer/analytics",
    icon: "solar:chart-bold-duotone",
    permission: "producer.analytics.read",
  },
  {
    title: "KYC Status",
    path: "/producer/kyc",
    icon: "solar:document-text-bold-duotone",
    permission: "producer.kyc.view",
  },
];

/**
 * Filter menu items based on user permissions
 * @param {Array} menuItems - All menu items
 * @param {Array} userPermissions - User's permissions
 * @param {Boolean} isOwner - Is user the owner
 * @returns {Array} Filtered menu items
 */
export function filterMenuByPermissions(menuItems, userPermissions = [], isOwner = false) {
  if (isOwner) {
    // Owner has access to everything
    return menuItems;
  }

  return menuItems
    .filter((item) => {
      // Check owner-only items
      if (item.ownerOnly && !isOwner) return false;

      // Check permission
      if (item.permission && !userPermissions.includes(item.permission)) {
        return false;
      }

      return true;
    })
    .map((item) => {
      // Filter submenu items
      if (item.subMenu) {
        return {
          ...item,
          subMenu: item.subMenu.filter((subItem) => {
            if (subItem.permission && !userPermissions.includes(subItem.permission)) {
              return false;
            }
            return true;
          }),
        };
      }
      return item;
    })
    .filter((item) => {
      // Remove items with empty submenu
      if (item.subMenu && item.subMenu.length === 0) {
        return false;
      }
      return true;
    });
}
