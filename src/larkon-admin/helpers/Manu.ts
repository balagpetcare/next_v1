import type { MenuItemType } from '@larkon/types/menu'
import { getPanelMenuItems } from '@larkon/menu/panelMenus'

/** Minimal fallback when panel has no full menu (e.g. empty permissions or error). */
function getMinimalPanelMenu(basePath: string): MenuItemType[] {
  const p = basePath.replace(/\/$/, '')
  return [
    { key: 'dashboard', label: 'Dashboard', icon: 'solar:home-smile-outline', url: `${p}/dashboard` },
    { key: 'settings', label: 'Settings', icon: 'solar:settings-outline', url: `${p}/settings` },
  ]
}

/**
 * Returns menu items for the current panel. Use basePath from LarkonPanelContext.
 * All panels (admin, owner, shop, clinic, etc.) use permissionMenu registry via getPanelMenuItems.
 * Falls back to minimal menu if registry returns null/empty.
 */
export const getMenuItems = (basePath?: string): MenuItemType[] => {
  const path = basePath ?? '/admin'
  const panelItems = getPanelMenuItems(path)
  if (panelItems && panelItems.length > 0) return panelItems
  return getMinimalPanelMenu(path)
}

export const findAllParent = (menuItems: MenuItemType[], menuItem: MenuItemType): string[] => {
  let parents: string[] = []
  const parent = findMenuItem(menuItems, menuItem.parentKey)
  if (parent) {
    parents.push(parent.key)
    if (parent.parentKey) {
      parents = [...parents, ...findAllParent(menuItems, parent)]
    }
  }
  return parents
}

function collectLeafMenuItems(menuItems: MenuItemType[]): MenuItemType[] {
  const out: MenuItemType[] = []
  for (const n of menuItems) {
    if (n.children?.length) out.push(...collectLeafMenuItems(n.children))
    else if (n.url) out.push(n)
  }
  return out
}

function normalizeMenuPath(path: string | undefined): string {
  const t = String(path || '').replace(/\/$/, '')
  return t || '/'
}

/**
 * Resolve the active sidebar leaf using longest URL prefix among leaves.
 * - Exact match wins among same length.
 * - `/owner/inventory/stock-requests/12` matches `/owner/inventory/stock-requests` over `/owner/inventory`.
 */
export const getMenuItemFromURL = (items: MenuItemType | MenuItemType[], url: string): MenuItemType | undefined => {
  const roots = items instanceof Array ? items : [items]
  const trimmed = normalizeMenuPath(url)
  const leaves = collectLeafMenuItems(roots).sort(
    (a, b) => normalizeMenuPath(b.url).length - normalizeMenuPath(a.url).length,
  )
  let best: MenuItemType | undefined
  let bestLen = -1
  for (const leaf of leaves) {
    const u = normalizeMenuPath(leaf.url)
    if (!u) continue
    if (trimmed === u || (u !== '/' && trimmed.startsWith(`${u}/`))) {
      if (u.length > bestLen) {
        bestLen = u.length
        best = leaf
      }
    }
  }
  return best
}

export const findMenuItem = (menuItems: MenuItemType[] | undefined, menuItemKey: MenuItemType['key'] | undefined): MenuItemType | null => {
  if (menuItems && menuItemKey) {
    for (const item of menuItems) {
      if (item.key === menuItemKey) {
        return item
      }
      const found = findMenuItem(item.children, menuItemKey)
      if (found) return found
    }
  }
  return null
}
