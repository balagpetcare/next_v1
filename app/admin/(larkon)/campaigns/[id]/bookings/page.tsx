'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import AdminFiltersBar from '@/src/bpa/admin/components/AdminFiltersBar'
import DataTable from '@/src/bpa/admin/components/DataTable'
import ErrorState from '@/src/bpa/admin/components/ErrorState'
import CampaignStatusBadge from '@/src/bpa/campaign/admin/CampaignStatusBadge'
import { PaginationBar } from '@/src/components/common/PaginationBar'
import CampaignExportButtons from '@/src/bpa/campaign/admin/CampaignExportButtons'
import {
  campaignAdminBookings,
  campaignAdminExportBookings,
  type CampaignBookingRow,
  type CampaignExportFormat,
} from '@/lib/campaignApi'

function maskPhone(phone: string) {
  if (!phone || phone.length < 6) return phone
  return `${phone.slice(0, 5)}***${phone.slice(-3)}`
}

export default function AdminCampaignBookingsPage() {
  const params = useParams()
  const campaignId = Number(params?.id)
  const [items, setItems] = useState<CampaignBookingRow[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [filterValues, setFilterValues] = useState({ status: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!Number.isFinite(campaignId)) return
    setLoading(true)
    setError('')
    try {
      const res = await campaignAdminBookings(campaignId, {
        page,
        pageSize,
        status: filterValues.status || undefined,
      })
      setItems(res.items ?? [])
      setTotal(res.total ?? 0)
      setTotalPages(res.totalPages ?? 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load bookings')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [campaignId, page, pageSize, filterValues.status])

  useEffect(() => {
    load()
  }, [load])

  const columns = [
    {
      key: 'ref',
      label: 'Reference',
      render: (r: CampaignBookingRow) => <span className="font-monospace small">{r.bookingRef}</span>,
    },
    { key: 'owner', label: 'Owner', render: (r: CampaignBookingRow) => r.ownerName },
    { key: 'phone', label: 'Phone', render: (r: CampaignBookingRow) => maskPhone(r.ownerPhone) },
    {
      key: 'pets',
      label: 'Pets',
      render: (r: CampaignBookingRow) => r.pets?.length ?? r.petCount ?? '—',
    },
    {
      key: 'location',
      label: 'Location',
      render: (r: CampaignBookingRow) => r.location?.name ?? '—',
    },
    {
      key: 'status',
      label: 'Status',
      render: (r: CampaignBookingRow) => <CampaignStatusBadge status={r.status} />,
    },
  ]

  return (
    <AdminPageShell title="Bookings" breadcrumbs={[{ label: 'Campaigns', href: '/admin/campaigns' }, { label: 'Bookings' }]}>
      <AdminFiltersBar
        showSearch={false}
        filterValues={filterValues}
        onFilterChange={(key, value) => {
          setFilterValues((prev) => ({ ...prev, [key]: value }))
          setPage(1)
        }}
        onReset={() => {
          setFilterValues({ status: '' })
          setPage(1)
        }}
        filters={[
          {
            key: 'status',
            label: 'Status',
            render: (value, onChange) => (
              <select
                className="form-select form-select-sm"
                value={value}
                onChange={(e) => onChange(e.target.value)}
              >
                <option value="">All</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CHECKED_IN">Checked in</option>
                <option value="COMPLETED">Completed</option>
                <option value="NO_SHOW">No show</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            ),
          },
        ]}
      />
      <div className="mb-3">
        <CampaignExportButtons
          label="Export bookings"
          onExport={(format: CampaignExportFormat) =>
            campaignAdminExportBookings(campaignId, format, {
              status: filterValues.status || undefined,
            })
          }
        />
      </div>
      {error ? <ErrorState message={error} onRetry={load} /> : null}
      <DataTable columns={columns} rows={items} loading={loading} keyField="id" />
      <PaginationBar
        page={page}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </AdminPageShell>
  )
}
