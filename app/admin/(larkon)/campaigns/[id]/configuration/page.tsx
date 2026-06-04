'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import ErrorState from '@/src/bpa/admin/components/ErrorState'
import CampaignForm, { campaignFormToPayload, campaignToFormValues } from '@/src/bpa/campaign/admin/CampaignForm'
import { campaignAdminGet, campaignAdminUpdate, campaignAdminSaveConfig } from '@/lib/campaignApi'

export default function AdminCampaignConfigurationPage() {
  const params = useParams()
  const router = useRouter()
  const id = Number(params?.id)
  const [initial, setInitial] = useState<ReturnType<typeof campaignToFormValues> | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!Number.isFinite(id)) return
    try {
      const c = await campaignAdminGet(id)
      setInitial(campaignToFormValues(c))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <AdminPageShell
      title="Configuration"
      breadcrumbs={[
        { label: 'Campaigns', href: '/admin/campaigns' },
        { label: 'Configuration' },
      ]}
    >
      <p className="mb-3">
        <Link href={`/admin/campaigns/${id}/included-vaccines`} className="btn btn-outline-primary btn-sm">
          Manage vaccines included (landing &amp; booking)
        </Link>
      </p>
      {initial ? (
        <CampaignForm
          initial={initial}
          submitLabel="Save changes"
          onCancel={() => router.push(`/admin/campaigns/${id}`)}
          onSubmit={async (values) => {
            const payload = campaignFormToPayload(values)
            delete (payload as { slug?: string }).slug
            const { config, ...campaignPayload } = payload as Record<string, unknown> & { config?: unknown }
            await campaignAdminUpdate(id, campaignPayload)
            if (config) {
              await campaignAdminSaveConfig(id, config as Parameters<typeof campaignAdminSaveConfig>[1])
            }
            router.push(`/admin/campaigns/${id}`)
          }}
        />
      ) : (
        <p className="text-muted">Loading…</p>
      )}
    </AdminPageShell>
  )
}
