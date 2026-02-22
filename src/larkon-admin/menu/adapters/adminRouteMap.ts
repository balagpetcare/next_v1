/**
 * Admin route mapping: permissionMenu hrefs → actual app/admin routes.
 * Used when REGISTRY.admin hrefs don't match existing page paths.
 */

/** permissionMenu href → actual route (where pages exist under app/admin/(larkon)) */
export const ADMIN_ROUTE_MAP: Record<string, string> = {
  '/admin/roles': '/admin/role/role-list',
  '/admin/products': '/admin/products/product-list',
  '/admin/orders': '/admin/orders/orders-list',
  '/admin/inventory': '/admin/inventory/warehouse',
  '/admin/support': '/admin/support/help-center',
}

/**
 * permissionMenu hrefs that have working pages (direct or via map).
 * When ADMIN_MENU_SHOW_UNIMPLEMENTED=false, only these items are shown.
 */
export const IMPLEMENTED_ADMIN_HREFS: Set<string> = new Set([
  '/admin/branch-types',
  '/admin/branches',
  '/admin/countries',
  '/admin/dashboard',
  '/admin/fundraising',
  '/admin/health',
  '/admin/inventory',
  '/admin/orders',
  '/admin/organizations',
  '/admin/permissions',
  '/admin/products',
  '/admin/roles',
  '/admin/settings',
  '/admin/staff',
  '/admin/states',
  '/admin/super-admin-whitelist',
  '/admin/support',
  '/admin/users',
  '/admin/verification-metrics',
  '/admin/verifications',
  '/admin/wallet',
])

/**
 * Map permissionMenu href to actual route (uses ADMIN_ROUTE_MAP if defined).
 */
export function mapAdminHref(href: string | undefined): string | undefined {
  if (!href) return undefined
  return ADMIN_ROUTE_MAP[href] ?? href
}

/**
 * Whether to show unimplemented admin routes.
 * Set NEXT_PUBLIC_ADMIN_MENU_SHOW_UNIMPLEMENTED=true to show all BPA registry items.
 */
export function showUnimplementedAdminRoutes(): boolean {
  try {
    return (
      typeof process !== 'undefined' &&
      process.env?.NEXT_PUBLIC_ADMIN_MENU_SHOW_UNIMPLEMENTED === 'true'
    )
  } catch {
    return false
  }
}

/**
 * Returns true if this href should be shown in admin sidebar.
 */
export function isImplementedAdminHref(href: string | undefined): boolean {
  if (!href) return false
  if (showUnimplementedAdminRoutes()) return true
  return IMPLEMENTED_ADMIN_HREFS.has(href)
}
