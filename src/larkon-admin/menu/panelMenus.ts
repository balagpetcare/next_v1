/**
 * Panel menus for Larkon dashboard sidebar.
 * Built from WowDash/permissionMenu registry; routes match app/<panel>/(larkon)/* (URLs stay /<panel>/<path>).
 */
import type { MenuItemType } from '@larkon/types/menu'
import { getFullMenu, type AppKey } from '../../lib/permissionMenu'

const BASE_TO_APP: Record<string, AppKey> = {
  '/admin': 'admin',
  '/owner': 'owner',
  '/shop': 'shop',
  '/clinic': 'clinic',
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
  if (app === 'shop' && href === '/shop') return '/shop/dashboard'
  if (app === 'clinic' && href === '/clinic') return '/clinic/dashboard'
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

function convertItem(item: SourceItem, parentKey: string | undefined, app: AppKey): MenuItemType {
  const url = normalizeHref(item.href, app)
  const key = item.id.replace(/\./g, '_')
  const node: MenuItemType = {
    key,
    label: item.label,
    icon: item.icon,
    url,
    parentKey: parentKey ?? undefined,
  }
  if (item.children && item.children.length > 0) {
    node.children = item.children.map((c) => convertItem(c, key, app))
  }
  return node
}

/**
 * Returns full sidebar menu for the given panel basePath (e.g. /owner, /shop).
 * For admin, returns null (caller should use MENU_ITEMS).
 */
export function getPanelMenuItems(basePath: string): MenuItemType[] | null {
  const app = appKeyFromBasePath(basePath)
  if (!app || app === 'admin') return null

  const raw = getFullMenu(app)
  if (!raw || raw.length === 0) return null

  const items = raw.map((item) => convertItem(item as SourceItem, undefined, app))
  return items
}
