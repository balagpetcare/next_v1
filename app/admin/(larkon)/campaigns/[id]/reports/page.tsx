'use client'

import { useParams } from 'next/navigation'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import CampaignReportsPanel from '@/src/bpa/campaign/admin/CampaignReportsPanel'

export default function AdminCampaignReportsPage() {
  const params = useParams()
  const campaignId = Number(params?.id)

  return (
    <AdminPageShell
      title="Reports"
      breadcrumbs={[{ label: 'Campaigns', href: '/admin/campaigns' }, { label: 'Reports' }]}
    >
      <CampaignReportsPanel campaignId={campaignId} />
    </AdminPageShell>
  )
}
