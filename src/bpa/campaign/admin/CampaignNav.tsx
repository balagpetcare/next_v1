/**
 * @deprecated Campaign Admin V2 — use `campaignAdminNavConfig.ts` + `CampaignSidebar.tsx`
 * and `app/admin/(larkon)/campaigns/[id]/layout.tsx`. Kept for reference only; do not import.
 */
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { label: 'Dashboard', suffix: '' },
  { label: 'Settings', suffix: '/edit' },
  { label: 'Rollout', suffix: '/rollout' },
  { label: 'Pre-registrations', suffix: '/pre-registrations' },
  { label: 'Rollout demand', suffix: '/rollout-reports' },
  { label: 'Demand intel', suffix: '/demand-intelligence' },
  { label: 'Locations', suffix: '/locations' },
  { label: 'Slots', suffix: '/slots' },
  { label: 'Staff', suffix: '/staff' },
  { label: 'Pricing', suffix: '/pricing' },
  { label: 'SMS Center', suffix: '/sms' },
  { label: 'Statistics', suffix: '/statistics' },
  { label: 'Analytics', suffix: '/analytics' },
  { label: 'Exports', suffix: '/exports' },
  { label: 'Reports', suffix: '/reports' },
  { label: 'Certificates', suffix: '/certificates' },
  { label: 'Verification', suffix: '/verification' },
  { label: 'Audit', suffix: '/audit' },
  { label: 'Bookings', suffix: '/bookings' },
] as const

export default function CampaignNav({ campaignId }: { campaignId: number }) {
  const pathname = usePathname()
  const base = `/admin/campaigns/${campaignId}`

  return (
    <ul className="nav nav-tabs nav-tabs-custom mb-3 flex-wrap gap-1">
      {TABS.map((tab) => {
        const href = `${base}${tab.suffix}`
        const active =
          tab.suffix === ''
            ? pathname === base || pathname === `${base}/`
            : pathname?.startsWith(href)
        return (
          <li className="nav-item" key={tab.suffix}>
            <Link className={`nav-link py-2 px-2 small ${active ? 'active' : ''}`} href={href}>
              {tab.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
