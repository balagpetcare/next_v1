import type { MenuItem, AppKey } from "@/src/lib/permissionMenu";
import { buildMenu } from "@/src/lib/permissionMenu";

export type NavItem = {
  label: string;
  href?: string;
  icon?: string;
  children?: NavItem[];
};

/**
 * Permission-driven navigation for Sidebar.tsx (simple tree).
 * NOTE: This replaces prior hardcoded OWNER_NAV.
 */
export function buildNav(app: AppKey, permissions: string[] = []): NavItem[] {
  const items: MenuItem[] = buildMenu(app, permissions, { isAuthenticated: true });
  const mapItem = (it: MenuItem): NavItem => ({
    label: it.label,
    href: it.href,
    icon: it.icon,
    children: it.children?.map(mapItem),
  });
  return items.map(mapItem);
}

// Backward-compat exports (avoid breaking imports). Prefer buildNav().
export const OWNER_NAV: NavItem[] = [];
