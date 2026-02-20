import avatar1 from '@larkon/assets/images/users/avatar-1.jpg'
import IconifyIcon from '@larkon/components/wrappers/IconifyIcon'
import { useLarkonPanelBasePath } from '@larkon/context/LarkonPanelContext'
import Image from 'next/image'
import Link from 'next/link'
import { Dropdown, DropdownHeader, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap'

/** Panel-specific profile dropdown links (WowDash MasterLayout parity). */
function getProfileDropdownLinks(basePath: string): {
  profile: string
  settings: string
  support: string | null
  logout: string
} {
  const p = basePath.replace(/\/$/, '') || '/admin'
  if (p === '/admin') {
    return { profile: '/admin/settings', settings: '/admin/settings', support: '/admin/support', logout: '/admin/logout' }
  }
  if (p === '/country') {
    return { profile: '/country/profile', settings: '/country/settings/features', support: '/country/support', logout: '/api/logout' }
  }
  if (p === '/owner') {
    return { profile: '/owner/settings', settings: '/owner/settings', support: '/owner/notifications', logout: '/owner/logout' }
  }
  if (p === '/staff') {
    return { profile: '/staff/branch', settings: '/staff/branch', support: null, logout: '/api/logout' }
  }
  // shop, clinic, producer, mother: generic panel paths
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
  return (
    <Dropdown className="topbar-item">
      <DropdownToggle
        as={'a'}
        type="button"
        className="topbar-button content-none"
        id="page-header-user-dropdown "
        data-bs-toggle="dropdown"
        aria-haspopup="true"
        aria-expanded="false">
        <span className="d-flex align-items-center">
          <Image className="rounded-circle" width={32} src={avatar1} alt="avatar-3" />
        </span>
      </DropdownToggle>
      <DropdownMenu className="dropdown-menu-end">
        <DropdownHeader as={'h6'} className="dropdown-header">
          Welcome!
        </DropdownHeader>
        <DropdownItem as={Link} href={links.profile}>
          <IconifyIcon icon="bx:user-circle" className="text-muted fs-18 align-middle me-1" />
          <span className="align-middle">Profile</span>
        </DropdownItem>
        <DropdownItem as={Link} href={links.settings}>
          <IconifyIcon icon="bx:cog" className="text-muted fs-18 align-middle me-1" />
          <span className="align-middle">Settings</span>
        </DropdownItem>
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
