'use client'

import { useParams } from 'next/navigation'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import CampaignPlanningPanel from '@/src/bpa/campaign/admin/CampaignPlanningPanel'

export default function AdminCampaignPlanningPage() {
  const params = useParams()
  const campaignId = Number(params?.id)

  return (
    <AdminPageShell
      title="Campaign Planning"
      breadcrumbs={[
        { label: 'Campaigns', href: '/admin/campaigns' },
        { label: 'Campaign Planning' },
      ]}
    >
      <CampaignPlanningPanel campaignId={campaignId} />
    </AdminPageShell>
  )
}
