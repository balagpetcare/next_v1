'use client'

import dynamic from 'next/dynamic'
import React from 'react'

/** Real API notification bell: polls /api/v1/notifications, shows unread count, links to access requests (owner) or branch selector (staff) */
const NotificationBell = dynamic(() => import('@/src/components/NotificationBell'), { ssr: false })

const Notifications = () => {
  return <NotificationBell enabled={true} />
}

export default Notifications
