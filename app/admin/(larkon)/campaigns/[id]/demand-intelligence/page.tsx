'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import CampaignDemandHub from '@/src/bpa/campaign/admin/CampaignDemandHub'

function DemandContent() {
  const params = useParams()
  const campaignId = Number(params?.id)
  return <CampaignDemandHub campaignId={campaignId} />
}

export default function AdminCampaignDemandIntelligencePage() {
  return (
    <AdminPageShell
      title="Demand Forecasting & Rollout Planning"
      breadcrumbs={[{ label: 'Campaigns', href: '/admin/campaigns' }, { label: 'Demand forecasting' }]}
    >
      <Suspense fallback={<p className="text-muted">Loading demand intelligence…</p>}>
        <DemandContent />
      </Suspense>
    </AdminPageShell>
  )
}
