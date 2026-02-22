'use client'

import dynamic from 'next/dynamic'
import React from 'react'

/** BPA notification UI (latest): real API /api/v1/notifications, dropdown design matches /owner/notifications page. */
const NotificationBell = dynamic(() => import('@/src/components/NotificationBell'), { ssr: false })

const Notifications = () => {
  return <NotificationBell enabled={true} />
}

export default Notifications
