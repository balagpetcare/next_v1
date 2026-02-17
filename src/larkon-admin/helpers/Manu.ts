import { MENU_ITEMS } from '@larkon/assets/data/menu-items'
import type { MenuItemType } from '@larkon/types/menu'
import { getPanelMenuItems } from '@larkon/menu/panelMenus'

/** Minimal fallback when panel has no full menu defined. */
function getMinimalPanelMenu(basePath: string): MenuItemType[] {
  const p = basePath.replace(/\/$/, '')
  return [
    { key: 'dashboard', label: 'Dashboard', icon: 'solar:widget-5-bold-duotone', url: `${p}/dashboard` },
    { key: 'settings', label: 'Settings', icon: 'solar:settings-bold-duotone', url: `${p}/settings` },
    { key: 'profile', label: 'Profile', icon: 'solar:chat-square-like-bold-duotone', url: `${p}/profile` },
  ]
}

/**
 * Returns menu items for the current panel. Use basePath from LarkonPanelContext.
 * For /admin returns full MENU_ITEMS; for owner/shop/clinic/mother/producer/country/staff returns
 * full restored menu from permissionMenu registry; otherwise minimal menu.
 */
export const getMenuItems = (basePath?: string): MenuItemType[] => {
  const path = basePath ?? '/admin'
  if (path === '/admin') return MENU_ITEMS
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

export const getMenuItemFromURL = (items: MenuItemType | MenuItemType[], url: string): MenuItemType | undefined => {
  if (items instanceof Array) {
    for (const item of items) {
      const foundItem = getMenuItemFromURL(item, url)
      if (foundItem) {
        return foundItem
      }
    }
  } else {
    if (items.url == url) return items
    if (items.children != null) {
      for (const item of items.children) {
        const found = getMenuItemFromURL(item, url)
        if (found) return found
      }
    }
  }
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
