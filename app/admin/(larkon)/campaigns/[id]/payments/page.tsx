'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import DataTable from '@/src/bpa/admin/components/DataTable'
import ErrorState from '@/src/bpa/admin/components/ErrorState'
import { campaignAdminCheckoutSessions } from '@/lib/campaignApi'

type CheckoutRow = {
  id: string
  status?: string
  ownerPhone?: string
  amount?: number | string
  paymentMethod?: string
  couponCode?: string
  createdAt?: string
  expiresAt?: string
  orderId?: number
}

export default function AdminCampaignPaymentsPage() {
  const params = useParams()
  const campaignId = Number(params?.id)
  const [rows, setRows] = useState<CheckoutRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!Number.isFinite(campaignId)) return
    setLoading(true)
    setError('')
    try {
      const data = await campaignAdminCheckoutSessions(campaignId)
      const list = Array.isArray(data) ? data : (data as { sessions?: CheckoutRow[] })?.sessions ?? []
      setRows(list as CheckoutRow[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load checkout sessions')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    load()
  }, [load])

  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <AdminPageShell
      title="Payments"
      breadcrumbs={[{ label: 'Campaigns', href: '/admin/campaigns' }, { label: 'Payments' }]}
    >
      <p className="text-muted small mb-3">
        Express checkout sessions and payment intents for this campaign. Revenue detail is on{' '}
        <a href={`/admin/campaigns/${campaignId}/operations-center`}>Operations Center</a>.
      </p>
      <DataTable
        columns={[
          { key: 'id', label: 'Session', render: (r) => <span className="font-monospace small">{r.id}</span> },
          { key: 'phone', label: 'Phone', render: (r) => r.ownerPhone ?? '—' },
          { key: 'status', label: 'Status', render: (r) => r.status ?? '—' },
          { key: 'amount', label: 'Amount', render: (r) => (r.amount != null ? String(r.amount) : '—') },
          { key: 'method', label: 'Method', render: (r) => r.paymentMethod ?? '—' },
          { key: 'created', label: 'Created', render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : '—') },
        ]}
        rows={rows}
        loading={loading}
        keyField="id"
      />
    </AdminPageShell>
  )
}
