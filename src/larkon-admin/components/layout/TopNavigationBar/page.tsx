'use client'

import { useState } from 'react'
import LkInput from '@larkon-ui/components/LkInput'
import IconifyIcon from '@larkon/components/wrappers/IconifyIcon'
import { useLarkonPanelBasePath } from '@larkon/context/LarkonPanelContext'
import ActivityStreamToggle from './components/ActivityStreamToggle'
import LeftSideBarToggle from './components/LeftSideBarToggle'
import Notifications from './components/Notifications'
import ProfileDropdown from './components/ProfileDropdown'
import ThemeCustomizerToggle from './components/ThemeCustomizerToggle'
import ThemeModeToggle from './components/ThemeModeToggle'
import TopBarTitle from './components/TopBarTitle'
import QuickAppointmentDrawer from '@/src/components/clinic/QuickAppointmentDrawer'

const page = () => {
  const basePath = useLarkonPanelBasePath()
  const [quickAppointmentOpen, setQuickAppointmentOpen] = useState(false)
  const showQuickAppointment = basePath === '/clinic' || basePath === '/staff'

  return (
    <>
      <header className="topbar">
        <div className="container-fluid">
          <div className="navbar-header">
            <div className="d-flex align-items-center">
              <LeftSideBarToggle />
              <TopBarTitle />
            </div>
            <div className="d-flex align-items-center gap-1">
              {showQuickAppointment && (
                <button
                  type="button"
                  className="btn btn-icon btn-ghost-secondary btn-sm"
                  onClick={() => setQuickAppointmentOpen(true)}
                  title="Quick Appointment"
                  aria-label="Quick Appointment"
                >
                  <IconifyIcon className='fs-24' icon="solar:calendar-add-linear" />
                </button>
              )}
              <ThemeModeToggle />

              <Notifications />

              <ThemeCustomizerToggle />

              <ActivityStreamToggle />

              <ProfileDropdown />
              <form className="app-search d-none d-md-block ms-2">
                <div className="position-relative">
                  <LkInput type="search" placeholder="Search..." autoComplete="off" className="pe-5" />
                  <IconifyIcon icon="solar:magnifer-linear" className="search-widget-icon" />
                </div>
              </form>
            </div>
          </div>
        </div>
      </header>
      <QuickAppointmentDrawer open={quickAppointmentOpen} onClose={() => setQuickAppointmentOpen(false)} />
    </>
  )
}

export default page
