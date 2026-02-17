'use client'
import IconifyIcon from '@larkon/components/wrappers/IconifyIcon'
import { findAllParent, findMenuItem, getMenuItemFromURL } from '@larkon/helpers/Manu'
import { MenuItemType, SubMenus } from '@larkon/types/menu'
import clsx from 'clsx'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fragment, KeyboardEvent, MouseEvent, useCallback, useEffect, useRef, useState } from 'react'
import { Collapse } from 'react-bootstrap'

const MenuItemWithChildren = ({ item, className, linkClassName, subMenuClassName, activeMenuItems, toggleMenu }: SubMenus) => {
  const [open, setOpen] = useState<boolean>(() => activeMenuItems?.includes(item.key) ?? false)
  const key = item.key
  const userToggledRef = useRef<{ key: string; open: boolean; ts: number } | null>(null)

  useEffect(() => {
    const fromActive = activeMenuItems!.includes(key)
    // Avoid overwriting user click: if user just toggled this item, trust it (150ms window)
    const recent = userToggledRef.current
    if (recent && recent.key === key && Date.now() - recent.ts < 150) {
      userToggledRef.current = null
      return
    }
    setOpen(fromActive)
  }, [activeMenuItems, key])

  const toggleMenuItem = (e: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const nextOpen = !open
    userToggledRef.current = { key, open: nextOpen, ts: Date.now() }
    setOpen(nextOpen)
    if (toggleMenu) toggleMenu(item, nextOpen)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleMenuItem(e)
    }
  }

  const getActiveClass = useCallback(
    (menuItem: MenuItemType) => {
      return activeMenuItems?.includes(menuItem.key) ? 'active' : ''
    },
    [activeMenuItems],
  )

  return (
    <li className={className}>
      <div
        role="button"
        tabIndex={0}
        onClick={toggleMenuItem}
        onKeyDown={handleKeyDown}
        aria-expanded={open}
        className={clsx(linkClassName)}
      >
        {item.icon && (
          <span className="nav-icon">
            {' '}
            <IconifyIcon icon={item.icon} />{' '}
          </span>
        )}
        <span className="nav-text">{item.label}</span>
        {!item.badge ? (
          <IconifyIcon icon="bx:chevron-down" className="menu-arrow ms-auto" />
        ) : (
          <span className={`badge badge-pill text-end bg-${item.badge.variant}`}>{item.badge.text}</span>
        )}
      </div>
      <Collapse in={open}>
        <div className={'collapse' + (open ? ' show' : '')}>
          <ul className={clsx(subMenuClassName)}>
            {(item.children || []).map((child, idx) => {
              return (
                <Fragment key={child.key ?? `sub-${idx}`}>
                  {child.children ? (
                    <MenuItemWithChildren
                      item={child}
                      linkClassName={clsx('nav-link menu-arrow', getActiveClass(child))}
                      activeMenuItems={activeMenuItems}
                      className="sub-nav-item"
                      subMenuClassName="nav sub-navbar-nav"
                      toggleMenu={toggleMenu}
                    />
                  ) : (
                    <MenuItem item={child} className="sub-nav-item" linkClassName={clsx('sub-nav-link', getActiveClass(child))} />
                  )}
                </Fragment>
              )
            })}
          </ul>
        </div>
      </Collapse>
    </li>
  )
}

const MenuItem = ({ item, className, linkClassName }: SubMenus) => {
  return (
    <li className={className}>
      <MenuItemLink item={item} className={linkClassName} />
    </li>
  )
}

const MenuItemLink = ({ item, className }: SubMenus) => {
  return (
    <Link href={item.url ?? ''} target={item.target} className={clsx(className, { disabled: item.isDisabled })}>
      {item.icon && (
        <span className="nav-icon">
          <IconifyIcon icon={item.icon} />
        </span>
      )}
      <span className="nav-text">{item.label}</span>
      {item.badge && <span className={`badge badge-pill text-end bg-${item.badge.variant}`}>{item.badge.text}</span>}
    </Link>
  )
}

type AppMenuProps = {
  menuItems: Array<MenuItemType>
}

const AppMenu = ({ menuItems }: AppMenuProps) => {
  const pathname = usePathname()

  const [activeMenuItems, setActiveMenuItems] = useState<Array<string>>([])
  const toggleMenu = useCallback(
    (menuItem: MenuItemType, show: boolean) => {
      if (show) {
        setActiveMenuItems((prev) => {
          const next = [menuItem.key, ...findAllParent(menuItems, menuItem)]
          return next
        })
      } else {
        setActiveMenuItems((prev) => prev.filter((k) => k !== menuItem.key))
      }
    },
    [menuItems],
  )

  const getActiveClass = useCallback(
    (item: MenuItemType) => {
      return activeMenuItems?.includes(item.key) ? 'active' : ''
    },
    [activeMenuItems],
  )

  const activeMenu = useCallback(() => {
    const trimmedURL = (pathname ?? '').replace(/\/$/, '') || '/'
    const matchingMenuItem = getMenuItemFromURL(menuItems, trimmedURL)

    if (matchingMenuItem) {
      const activeMt = findMenuItem(menuItems, matchingMenuItem.key)
      if (activeMt) {
        setActiveMenuItems([activeMt.key, ...findAllParent(menuItems, activeMt)])
      }

      setTimeout(() => {
        const activatedItem: HTMLAnchorElement | null = document.querySelector(`#leftside-menu-container .simplebar-content a[href="${trimmedURL}"]`)
        if (activatedItem) {
          const simplebarContent = document.querySelector('#leftside-menu-container .simplebar-content-wrapper')
          if (simplebarContent) {
            const offset = activatedItem.offsetTop - window.innerHeight * 0.4
            scrollTo(simplebarContent, offset, 600)
          }
        }
      }, 400)

      const easeInOutQuad = (t: number, b: number, c: number, d: number) => {
        t /= d / 2
        if (t < 1) return (c / 2) * t * t + b
        t--
        return (-c / 2) * (t * (t - 2) - 1) + b
      }

      const scrollTo = (element: any, to: number, duration: number) => {
        const start = element.scrollTop,
          change = to - start,
          increment = 20
        let currentTime = 0
        const animateScroll = function () {
          currentTime += increment
          const val = easeInOutQuad(currentTime, start, change, duration)
          element.scrollTop = val
          if (currentTime < duration) {
            setTimeout(animateScroll, increment)
          }
        }
        animateScroll()
      }
    }
  }, [pathname, menuItems])

  const lastPathnameRef = useRef<string | null>(null)
  const menuItemsRef = useRef(menuItems)
  menuItemsRef.current = menuItems
  useEffect(() => {
    if (!menuItemsRef.current?.length) return
    const isFirstRun = lastPathnameRef.current === null
    const pathChanged = lastPathnameRef.current !== pathname
    lastPathnameRef.current = pathname
    if (isFirstRun || pathChanged) activeMenu()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only run on pathname change to avoid overwriting user toggle
  }, [pathname])

  return (
    <ul className="navbar-nav" id="navbar-nav">
      {(menuItems || []).map((item, idx) => {
        return (
          <Fragment key={item.key ?? `menu-${idx}`}>
            {item.isTitle ? (
              <li className={clsx('menu-title', { 'mt-2': idx != 0 })}>{item.label}</li>
            ) : (
              <>
                {item.children ? (
                  <MenuItemWithChildren
                    item={item}
                    toggleMenu={toggleMenu}
                    className="nav-item"
                    linkClassName={clsx('nav-link menu-arrow', getActiveClass(item))}
                    subMenuClassName="nav sub-navbar-nav"
                    activeMenuItems={activeMenuItems}
                  />
                ) : (
                  <MenuItem item={item} linkClassName={clsx('nav-link', getActiveClass(item))} className="nav-item" />
                )}
              </>
            )}
          </Fragment>
        )
      })}
    </ul>
  )
}

export default AppMenu
