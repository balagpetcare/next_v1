/**
 * Minimal permission-aware menu builder.
 * Existing code imports: buildMenu, appKeyFromPath
 *
 * You can extend registries later without changing SiteMaster.
 */
export function appKeyFromPath(pathname = "") {
  const p = String(pathname || "");
  if (p.startsWith("/owner")) return "owner";
  if (p.startsWith("/admin")) return "admin";
  if (p.startsWith("/shop")) return "shop";
  if (p.startsWith("/clinic")) return "clinic";
  if (p.startsWith("/mother")) return "mother";
  return "app";
}

const REGISTRY = {
  owner: [
    {
      group: "My Business",
      items: [
        { href: "/owner/organization", label: "Organization", icon: "ri-building-2-line", requires: ["org.read"] },
        { href: "/owner/branches", label: "Branches", icon: "ri-git-branch-line", requires: ["branch.read"] },
        { href: "/owner/staffs", label: "Staffs", icon: "ri-team-line", requires: ["staff.read"] },
      ],
    },
    {
      group: "Other",
      items: [
        { href: "/owner/reports", label: "Reports", icon: "ri-bar-chart-line", requires: [] },
        { href: "/owner/settings", label: "Settings", icon: "ri-settings-3-line", requires: [] },
      ],
    },
  ],
};

function hasAnyPermission(userPerms = [], required = []) {
  if (!required || required.length === 0) return true;
  const set = new Set((userPerms || []).map((x) => String(x)));
  return required.some((r) => set.has(String(r)));
}

export function buildMenu(appKey, userPerms = []) {
  const groups = REGISTRY[appKey] || [];
  // If no perms provided, show all (dev-friendly)
  const perms = Array.isArray(userPerms) ? userPerms : [];
  return groups
    .map((g) => ({
      ...g,
      items: (g.items || []).filter((it) => (perms.length ? hasAnyPermission(perms, it.requires) : true)),
    }))
    .filter((g) => (g.items || []).length > 0);
}
