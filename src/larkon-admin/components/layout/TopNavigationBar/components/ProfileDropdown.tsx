'use client'

import avatar1 from '@larkon/assets/images/users/avatar-1.jpg'
import IconifyIcon from '@larkon/components/wrappers/IconifyIcon'
import { useLarkonPanelBasePath } from '@larkon/context/LarkonPanelContext'
import { useMe } from '@/src/lib/useMe'
import Image from 'next/image'
import Link from 'next/link'
import { Dropdown, DropdownHeader, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap'

/** Panel-specific profile dropdown links (WowDash MasterLayout parity). */
function getProfileDropdownLinks(basePath: string): {
  profile: string
  settings: string
  support: string | null
  logout: string
  /** Enterprise account hub (owner/staff) */
  accountHub?: string
  accountSettings?: string
  rolesBranches?: string
  security?: string
} {
  const p = basePath.replace(/\/$/, '') || '/admin'
  if (p === '/admin') {
    return { profile: '/admin/settings', settings: '/admin/settings', support: '/admin/support', logout: '/admin/logout' }
  }
  if (p === '/country') {
    return { profile: '/country/profile', settings: '/country/settings/features', support: '/country/support', logout: '/api/logout' }
  }
  if (p === '/owner') {
    return {
      profile: '/owner/account',
      settings: '/owner/account?tab=preferences',
      support: '/owner/notifications',
      logout: '/owner/logout',
      accountHub: '/owner/account',
      accountSettings: '/owner/account?tab=preferences',
      rolesBranches: '/owner/account?tab=branches',
      security: '/owner/account?tab=security',
    }
  }
  if (p === '/staff') {
    return {
      profile: '/staff/account',
      settings: '/staff/account?tab=preferences',
      support: null,
      logout: '/staff/logout',
      accountHub: '/staff/account',
      accountSettings: '/staff/account?tab=preferences',
      rolesBranches: '/staff/account?tab=branches',
      security: '/staff/account?tab=security',
    }
  }
  if (p === '/clinic') {
    return {
      profile: '/clinic/account',
      settings: '/clinic/account?tab=preferences',
      support: '/clinic/notifications',
      logout: '/api/logout',
      accountHub: '/clinic/account',
      accountSettings: '/clinic/account?tab=preferences',
      rolesBranches: '/clinic/account?tab=branches',
      security: '/clinic/account?tab=security',
    }
  }
  if (p === '/doctor') {
    return {
      profile: '/doctor/account',
      settings: '/doctor/account?tab=preferences',
      support: '/doctor/notifications',
      logout: '/api/logout',
      accountHub: '/doctor/account',
      accountSettings: '/doctor/account?tab=preferences',
      rolesBranches: '/doctor/account?tab=branches',
      security: '/doctor/account?tab=security',
    }
  }
  // shop, producer, mother: generic panel paths
  return {
    profile: `${p}/profile`,
    settings: `${p}/settings`,
    support: `${p}/notifications`,
    logout: '/api/logout',
  }
}

const ProfileDropdown = () => {
  const basePath = useLarkonPanelBasePath()
  const links = getProfileDropdownLinks(basePath)
  const { me } = useMe()
  const userProfile = me?.profile || (me as { data?: { profile?: unknown } })?.data?.profile
  const effectivePhoto =
    (userProfile as { effectivePhotoUrl?: string } | null | undefined)?.effectivePhotoUrl ||
    (userProfile as { avatarMedia?: { url?: string } } | null | undefined)?.avatarMedia?.url ||
    null

  const avatarPx = 40

  return (
    <Dropdown className="topbar-item" align="end">
      <DropdownToggle
        as="button"
        type="button"
        className="topbar-button content-none arrow-none profile-dropdown-toggle"
        id="page-header-user-dropdown"
        aria-haspopup="menu"
        aria-label="Account menu"
        title="Account menu"
        style={{
          width: avatarPx,
          height: avatarPx,
          minWidth: avatarPx,
          minHeight: avatarPx,
          padding: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxSizing: 'border-box',
          lineHeight: 0,
          verticalAlign: 'middle',
        }}>
        <span
          className="d-flex align-items-center justify-content-center flex-shrink-0 overflow-hidden rounded-circle bg-light"
          style={{
            width: avatarPx,
            height: avatarPx,
            minWidth: avatarPx,
            minHeight: avatarPx,
          }}>
          {effectivePhoto ? (
            <img
              key={effectivePhoto}
              src={effectivePhoto}
              alt=""
              width={avatarPx}
              height={avatarPx}
              className="rounded-circle"
              style={{
                objectFit: 'cover',
                display: 'block',
                width: avatarPx,
                height: avatarPx,
                maxWidth: avatarPx,
                maxHeight: avatarPx,
                flexShrink: 0,
              }}
              decoding="async"
            />
          ) : (
            <Image
              className="rounded-circle"
              width={avatarPx}
              height={avatarPx}
              src={avatar1}
              alt=""
              sizes={`${avatarPx}px`}
              style={{
                width: avatarPx,
                height: avatarPx,
                maxWidth: avatarPx,
                maxHeight: avatarPx,
                objectFit: 'cover',
                display: 'block',
              }}
            />
          )}
        </span>
      </DropdownToggle>
      <DropdownMenu className="dropdown-menu-end profile-dropdown-menu">
        <DropdownHeader as={'h6'} className="dropdown-header">
          Welcome!
        </DropdownHeader>
        <DropdownItem as={Link} href={links.profile}>
          <IconifyIcon icon="bx:user-circle" className="text-muted fs-18 align-middle me-1" />
          <span className="align-middle">{links.accountHub ? 'Profile overview' : 'Profile'}</span>
        </DropdownItem>
        {links.accountSettings ? (
          <DropdownItem as={Link} href={links.accountSettings}>
            <IconifyIcon icon="bx:cog" className="text-muted fs-18 align-middle me-1" />
            <span className="align-middle">My settings</span>
          </DropdownItem>
        ) : (
          <DropdownItem as={Link} href={links.settings}>
            <IconifyIcon icon="bx:cog" className="text-muted fs-18 align-middle me-1" />
            <span className="align-middle">Settings</span>
          </DropdownItem>
        )}
        {links.rolesBranches ? (
          <DropdownItem as={Link} href={links.rolesBranches}>
            <IconifyIcon icon="bx:buildings" className="text-muted fs-18 align-middle me-1" />
            <span className="align-middle">My roles & branches</span>
          </DropdownItem>
        ) : null}
        {links.security ? (
          <DropdownItem as={Link} href={links.security}>
            <IconifyIcon icon="bx:shield-quarter" className="text-muted fs-18 align-middle me-1" />
            <span className="align-middle">Security</span>
          </DropdownItem>
        ) : null}
        {links.support ? (
          <DropdownItem as={Link} href={links.support}>
            <IconifyIcon icon="bx:help-circle" className="text-muted fs-18 align-middle me-1" />
            <span className="align-middle">Support</span>
          </DropdownItem>
        ) : null}
        <div className="dropdown-divider my-1" />
        <DropdownItem as={Link} className=" text-danger" href={links.logout}>
          <IconifyIcon icon="bx:log-out" className="fs-18 align-middle me-1" />
          <span className="align-middle">Logout</span>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  )
}

export default ProfileDropdown
