'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import CampaignStatusBadge from '@/src/bpa/campaign/admin/CampaignStatusBadge'
import {
  campaignAdminActivate,
  campaignAdminGet,
  campaignAdminPause,
  type CampaignDetail,
} from '@/lib/campaignApi'

type Props = {
  campaignId: number
}

export default function CampaignShellHeader({ campaignId }: Props) {
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)

  const load = useCallback(async () => {
    if (!Number.isFinite(campaignId)) return
    try {
      setCampaign(await campaignAdminGet(campaignId))
    } catch {
      setCampaign(null)
    }
  }, [campaignId])

  useEffect(() => {
    load()
  }, [load])

  async function lifecycle(action: 'activate' | 'pause') {
    if (!campaign) return
    if (action === 'activate') await campaignAdminActivate(campaign.id)
    else await campaignAdminPause(campaign.id)
    await load()
  }

  if (!campaign) return null

  return (
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3 pb-2 border-bottom">
      <div>
        <h1 className="h5 mb-1">{campaign.name}</h1>
        <p className="text-muted small mb-0 font-monospace">{campaign.slug}</p>
      </div>
      <div className="d-flex flex-wrap align-items-center gap-2">
        <CampaignStatusBadge status={campaign.status} />
        {campaign.status === 'DRAFT' || campaign.status === 'PAUSED' ? (
          <button type="button" className="btn btn-success btn-sm" onClick={() => lifecycle('activate')}>
            Activate
          </button>
        ) : null}
        {campaign.status === 'ACTIVE' ? (
          <button type="button" className="btn btn-warning btn-sm" onClick={() => lifecycle('pause')}>
            Pause
          </button>
        ) : null}
        <Link href={`/admin/campaigns/${campaignId}/configuration`} className="btn btn-outline-secondary btn-sm">
          Settings
        </Link>
      </div>
    </div>
  )
}
