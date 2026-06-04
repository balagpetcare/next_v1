'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import CampaignOperationsCenter from '@/src/bpa/campaign/admin/CampaignOperationsCenter'

function OperationsContent() {
  const params = useParams()
  const campaignId = Number(params?.id)
  return <CampaignOperationsCenter campaignId={campaignId} />
}

export default function AdminCampaignOperationsCenterPage() {
  return (
    <AdminPageShell
      title="Operations Center"
      breadcrumbs={[
        { label: 'Campaigns', href: '/admin/campaigns' },
        { label: 'Operations Center' },
      ]}
    >
      <Suspense fallback={<p className="text-muted">Loading operations center…</p>}>
        <OperationsContent />
      </Suspense>
    </AdminPageShell>
  )
}
