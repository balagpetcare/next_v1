'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '@iconify/react'
import { getCampaignAdminNav, isCampaignNavActive } from '@/src/bpa/campaign/admin/campaignAdminNavConfig'

type Props = {
  campaignId: number
}

export default function CampaignSidebar({ campaignId }: Props) {
  const pathname = usePathname()
  const items = getCampaignAdminNav(campaignId)

  return (
    <nav
      className="campaign-workspace-nav flex-shrink-0"
      style={{ width: '100%', maxWidth: 240 }}
      aria-label="Campaign sections"
    >
      <Link
        href="/admin/campaigns"
        className="btn btn-sm btn-outline-secondary w-100 mb-3 d-flex align-items-center gap-1"
      >
        <Icon icon="solar:arrow-left-outline" className="flex-shrink-0" />
        <span>All campaigns</span>
      </Link>
      <ul className="list-unstyled mb-0">
        {items.map((it) => {
          const active = isCampaignNavActive(pathname ?? '', it)
          return (
            <li key={it.key} className="mb-1">
              <Link
                href={it.href}
                className={`d-flex align-items-center gap-2 px-3 py-2 rounded text-decoration-none small ${
                  active ? 'bg-primary text-white' : 'text-body hover-bg-light'
                }`}
                style={active ? undefined : { background: active ? undefined : 'transparent' }}
              >
                <Icon icon={it.icon} width={18} className="flex-shrink-0" />
                <span>{it.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
