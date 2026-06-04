'use client'

import { useParams } from 'next/navigation'
import CampaignSidebar from '@/src/bpa/campaign/admin/CampaignSidebar'
import CampaignShellHeader from '@/src/bpa/campaign/admin/CampaignShellHeader'

export default function CampaignDetailLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const campaignId = Number(params?.id)

  if (!Number.isFinite(campaignId)) {
    return <>{children}</>
  }

  return (
    <div className="campaign-workspace">
      <div className="d-flex flex-column flex-lg-row gap-3 align-items-start">
        <CampaignSidebar campaignId={campaignId} />
        <div className="flex-grow-1 min-w-0 w-100">
          <CampaignShellHeader campaignId={campaignId} />
          {children}
        </div>
      </div>
    </div>
  )
}
