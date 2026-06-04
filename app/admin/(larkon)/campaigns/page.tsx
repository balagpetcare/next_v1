'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import AdminFiltersBar from '@/src/bpa/admin/components/AdminFiltersBar'
import DataTable from '@/src/bpa/admin/components/DataTable'
import EmptyState from '@/src/bpa/admin/components/EmptyState'
import ErrorState from '@/src/bpa/admin/components/ErrorState'
import CampaignStatusBadge from '@/src/bpa/campaign/admin/CampaignStatusBadge'
import { campaignAdminList, type CampaignSummary } from '@/lib/campaignApi'

function formatRange(c: CampaignSummary) {
  const s = c.startDate ? new Date(c.startDate).toLocaleDateString() : '—'
  const e = c.endDate ? new Date(c.endDate).toLocaleDateString() : '—'
  return `${s} – ${e}`
}

export default function AdminCampaignsListPage() {
  const [items, setItems] = useState<CampaignSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterValues, setFilterValues] = useState({ status: '' })

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { campaigns } = await campaignAdminList({
        status: filterValues.status || undefined,
        pageSize: 50,
      })
      setItems(campaigns)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load campaigns')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [filterValues.status])

  useEffect(() => {
    load()
  }, [load])

  const columns = [
    {
      key: 'name',
      label: 'Campaign',
      render: (row: CampaignSummary) => (
        <div>
          <Link href={`/admin/campaigns/${row.id}`} className="fw-semibold text-decoration-none">
            {row.name}
          </Link>
          <div className="text-muted small">{row.slug}</div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: CampaignSummary) => <CampaignStatusBadge status={row.status} />,
    },
    {
      key: 'period',
      label: 'Period',
      render: (row: CampaignSummary) => formatRange(row),
    },
    {
      key: 'pricing',
      label: 'Pricing',
      render: (row: CampaignSummary) =>
        row.pricingType === 'FREE' ? 'Free' : `${row.pricingType} ${row.priceAmount ?? ''} ${row.currency ?? 'BDT'}`,
    },
    {
      key: 'bookings',
      label: 'Bookings',
      render: (row: CampaignSummary) => row._count?.bookings ?? '—',
    },
    {
      key: 'actions',
      label: '',
      render: (row: CampaignSummary) => (
        <Link href={`/admin/campaigns/${row.id}`} className="btn btn-sm btn-outline-primary">
          Open
        </Link>
      ),
    },
  ]

  return (
    <AdminPageShell
      title="Vaccination campaigns"
      breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Campaigns' }]}
      actions={
        <Link href="/admin/campaigns/new" className="btn btn-primary btn-sm">
          <i className="ri-add-line me-1" aria-hidden />
          Create campaign
        </Link>
      }
    >
      <AdminFiltersBar
        showSearch={false}
        filterValues={filterValues}
        onFilterChange={(key, value) => setFilterValues((prev) => ({ ...prev, [key]: value }))}
        onReset={() => setFilterValues({ status: '' })}
        filters={[
          {
            key: 'status',
            label: 'Status',
            render: (value, onChange) => (
              <select
                id="admin-filter-status"
                className="form-select form-select-sm"
                value={value}
                onChange={(e) => onChange(e.target.value)}
              >
                <option value="">All</option>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="COMPLETED">Completed</option>
              </select>
            ),
          },
        ]}
      />

      {error ? <ErrorState message={error} onRetry={load} /> : null}
      {!error && !loading && items.length === 0 ? (
        <EmptyState title="No campaigns" description="Create your first vaccination campaign." />
      ) : null}

      <DataTable columns={columns} rows={items} loading={loading} keyField="id" />
    </AdminPageShell>
  )
}
