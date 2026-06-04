'use client'

import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import CampaignIncludedVaccinesPanel from '@/src/bpa/campaign/admin/CampaignIncludedVaccinesPanel'
import { useParams } from 'next/navigation'

export default function AdminCampaignIncludedVaccinesPage() {
  const params = useParams()
  const id = Number(params?.id)

  return (
    <AdminPageShell
      title="Vaccines included"
      breadcrumbs={[
        { label: 'Campaigns', href: '/admin/campaigns' },
        { label: 'Vaccines included' },
      ]}
    >
      {Number.isFinite(id) ? <CampaignIncludedVaccinesPanel campaignId={id} /> : null}
    </AdminPageShell>
  )
}
