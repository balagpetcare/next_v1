/**
 * Panel menus for Larkon dashboard sidebar.
 * Built from WowDash/permissionMenu registry; routes match app/<panel>/(larkon)/* (URLs stay /<panel>/<path>).
 */
import type { MenuItemType } from '@larkon/types/menu'
import { getFullMenu, type AppKey } from '../../lib/permissionMenu'
import { mapAdminHref, isImplementedAdminHref, isStubAdminHref } from './adapters/adminRouteMap'

const BASE_TO_APP: Record<string, AppKey> = {
  '/admin': 'admin',
  '/owner': 'owner',
  '/shop': 'shop',
  '/clinic': 'clinic',
  '/doctor': 'doctor',
  '/mother': 'mother',
  '/producer': 'producer',
  '/country': 'country',
  '/staff': 'staff',
}

function appKeyFromBasePath(basePath: string): AppKey | null {
  const p = basePath.replace(/\/$/, '') || '/admin'
  return BASE_TO_APP[p] ?? null
}

/** Normalize href so panel root points to /panel/dashboard where we use redirects. */
function normalizeHref(href: string | undefined, app: AppKey): string | undefined {
  if (!href) return undefined
  if (app === 'admin' && href === '/admin') return '/admin/dashboard'
  if (app === 'shop' && href === '/shop') return '/shop/dashboard'
  if (app === 'clinic' && href === '/clinic') return '/clinic/dashboard'
  if (app === 'doctor' && href === '/doctor') return '/doctor/dashboard'
  if (app === 'mother' && href === '/mother') return '/mother/dashboard'
  return href
}

type SourceItem = {
  id: string
  label: string
  href?: string
  icon?: string
  children?: SourceItem[]
}

/**
 * Convert permissionMenu item to Larkon MenuItemType.
 * For admin: applies route map and optionally filters unimplemented.
 */
function convertItem(
  item: SourceItem,
  parentKey: string | undefined,
  app: AppKey,
  options: { filterUnimplementedAdmin?: boolean } = {},
): MenuItemType | null {
  let href = item.href
  if (app === 'admin' && href) {
    href = mapAdminHref(href) ?? href
  }
  const url = normalizeHref(href, app)

  // Admin filter: hide unimplemented items when flag is false
  if (app === 'admin' && options.filterUnimplementedAdmin && item.href) {
    if (!isImplementedAdminHref(item.href)) return null
  }

  const key = item.id.replace(/\./g, '_')
  const node: MenuItemType = {
    key,
    label: item.label,
    icon: item.icon ?? 'solar:widget-5-outline',
    url,
    parentKey: parentKey ?? undefined,
  }
  // Show SOON badge for admin stub routes (Coming Soon pages)
  if (app === 'admin' && item.href && isStubAdminHref(item.href)) {
    node.badge = { variant: 'secondary', text: 'SOON' }
  }
  if (item.children && item.children.length > 0) {
    const kids = item.children
      .map((c) => convertItem(c, key, app, options))
      .filter((n): n is MenuItemType => n != null)
    if (kids.length === 0) return null // section with no visible children - hide
    node.children = kids
  }
  return node
}

/**
 * Returns full sidebar menu for the given panel basePath (e.g. /owner, /admin, /shop).
 * Admin now uses REGISTRY.admin from permissionMenu (same as other panels).
 */
export function getPanelMenuItems(basePath: string): MenuItemType[] | null {
  const app = appKeyFromBasePath(basePath)
  if (!app) return null

  const raw = getFullMenu(app)
  if (!raw || raw.length === 0) return null

  const filterUnimplementedAdmin = app === 'admin'
  const items = raw
    .map((item) => convertItem(item as SourceItem, undefined, app, { filterUnimplementedAdmin }))
    .filter((n): n is MenuItemType => n != null)

  return items.length > 0 ? items : null
}
