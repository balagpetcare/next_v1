'use client'
import FallbackLoading from '@larkon/components/FallbackLoading'
import IconifyIcon from '@larkon/components/wrappers/IconifyIcon'
import { useLayoutContext } from '@larkon/context/useLayoutContext'
import dynamic from 'next/dynamic'
import React, { Suspense, useState } from 'react'

const ActivityStream = dynamic(() => import('@larkon/components/wrappers/ActivityStream'))

const ActivityStreamToggle = () => {
  const {
    activityStream: { open, toggle },
  } = useLayoutContext()
  const [hasOpenedOnce, setHasOpenedOnce] = useState(open)

  const toggleActivityStreamOffcanvas = () => {
    if (!hasOpenedOnce) setHasOpenedOnce(true)
    toggle()
  }

  return (
    <>
      <div className="topbar-item d-none d-md-flex">
        <button
          onClick={toggleActivityStreamOffcanvas}
          type="button"
          className="topbar-button"
          id="theme-settings-btn"
          data-bs-toggle="offcanvas"
          data-bs-target="#theme-activity-offcanvas"
          aria-controls="theme-settings-offcanvas">
          <IconifyIcon icon="solar:clock-circle-bold-duotone" className="fs-24 align-middle" />
        </button>
      </div>
      <Suspense fallback={<FallbackLoading />}>{hasOpenedOnce && <ActivityStream open={open} toggle={toggleActivityStreamOffcanvas} />}</Suspense>
    </>
  )
}

export default ActivityStreamToggle
