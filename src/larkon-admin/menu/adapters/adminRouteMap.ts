/**
 * Admin route mapping: permissionMenu hrefs → actual app/admin routes.
 * Used when REGISTRY.admin hrefs don't match existing page paths.
 * SINGLE SOURCE: only this file defines IMPLEMENTED_ADMIN_HREFS for admin sidebar.
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
 * Normalize href for lookup: safe for non-string, trim, collapse internal whitespace,
 * remove trailing slash, ensure starts with "/".
 */
function normalizeHrefForLookup(href: string | undefined): string {
  if (href == null) return ''
  const s = typeof href === 'string' ? href : String(href)
  const trimmed = s.trim()
  if (!trimmed) return ''
  const collapsed = trimmed.replace(/\s+/g, ' ').trim()
  const noTrailing = collapsed.replace(/\/+$/, '')
  const withLeading = noTrailing.startsWith('/') ? noTrailing : `/${noTrailing}`
  return withLeading
}

/**
 * Canonical lookup key for IMPLEMENTED_ADMIN_HREFS: normalize(permissionMenu href).
 * Set contains permissionMenu hrefs (e.g. /admin/health), not mapped routes.
 */
function getLookupHref(href: string | undefined): string {
  return normalizeHrefForLookup(href)
}

/**
 * Returns true if this href should be shown in admin sidebar.
 * Lookup: getLookupHref(href) → normalized permissionMenu href; Set.has(lookup).
 */
export function isImplementedAdminHref(href: string | undefined): boolean {
  const lookup = getLookupHref(href)
  if (!lookup) return false
  if (showUnimplementedAdminRoutes()) return true
  return IMPLEMENTED_ADMIN_HREFS.has(lookup)
}
