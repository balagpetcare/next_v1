'use client'

import { useRouter } from 'next/navigation'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import CampaignForm, { campaignFormToPayload } from '@/src/bpa/campaign/admin/CampaignForm'
import { campaignAdminCreate, campaignAdminSaveConfig } from '@/lib/campaignApi'

export default function AdminCampaignNewPage() {
  const router = useRouter()

  return (
    <AdminPageShell
      title="Create campaign"
      breadcrumbs={[
        { label: 'Admin', href: '/admin/dashboard' },
        { label: 'Campaigns', href: '/admin/campaigns' },
        { label: 'New' },
      ]}
    >
      <CampaignForm
        submitLabel="Create campaign"
        onCancel={() => router.push('/admin/campaigns')}
        onSubmit={async (values) => {
          const payload = campaignFormToPayload(values)
          const { config, ...campaignPayload } = payload as any
          const created = await campaignAdminCreate(campaignPayload)
          if (config) {
            await campaignAdminSaveConfig(created.id, config)
          }
          router.push(`/admin/campaigns/${created.id}`)
        }}
      />
    </AdminPageShell>
  )
}
