'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import AdminFiltersBar from '@/src/bpa/admin/components/AdminFiltersBar'
import DataTable from '@/src/bpa/admin/components/DataTable'
import ErrorState from '@/src/bpa/admin/components/ErrorState'
import {
  campaignAdminBookings,
  campaignAdminStaffStats,
  type CampaignBookingRow,
  type CampaignStaffStatsRow,
} from '@/lib/campaignApi'

type AuditRow = {
  id: string
  at: string
  action: string
  entity: string
  detail: string
}

function bookingEvents(b: CampaignBookingRow): AuditRow[] {
  const rows: AuditRow[] = []
  if (b.bookingDate) {
    rows.push({
      id: `${b.id}-booked`,
      at: b.bookingDate,
      action: 'BOOKING_CREATED',
      entity: b.bookingRef,
      detail: `${b.ownerName} · ${b.pets?.length ?? b.petCount ?? 0} pet(s)`,
    })
  }
  if (b.checkedInAt) {
    rows.push({
      id: `${b.id}-checkin`,
      at: b.checkedInAt,
      action: 'BOOKING_CHECKED_IN',
      entity: b.bookingRef,
      detail: b.queueNumber ? `Queue ${b.queueNumber}` : 'Checked in',
    })
  }
  if (b.completedAt) {
    rows.push({
      id: `${b.id}-complete`,
      at: b.completedAt,
      action: 'BOOKING_COMPLETED',
      entity: b.bookingRef,
      detail: 'All pets processed',
    })
  }
  if (b.status === 'NO_SHOW') {
    rows.push({
      id: `${b.id}-noshow`,
      at: b.bookingDate ?? '',
      action: 'BOOKING_NO_SHOW',
      entity: b.bookingRef,
      detail: b.ownerName,
    })
  }
  if (b.status === 'CANCELLED') {
    rows.push({
      id: `${b.id}-cancel`,
      at: b.bookingDate ?? '',
      action: 'BOOKING_CANCELLED',
      entity: b.bookingRef,
      detail: b.ownerName,
    })
  }
  return rows
}

export default function AdminCampaignAuditPage() {
  const params = useParams()
  const campaignId = Number(params?.id)
  const [events, setEvents] = useState<AuditRow[]>([])
  const [staffStats, setStaffStats] = useState<CampaignStaffStatsRow[]>([])
  const [filterValues, setFilterValues] = useState({ action: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!Number.isFinite(campaignId)) return
    setLoading(true)
    setError('')
    try {
      const [bookingsRes, staff] = await Promise.all([
        campaignAdminBookings(campaignId, { page: 1, pageSize: 100 }),
        campaignAdminStaffStats(campaignId),
      ])
      const derived = (bookingsRes.items ?? []).flatMap(bookingEvents)
      derived.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      setEvents(derived)
      setStaffStats(staff)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit data')
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    load()
  }, [load])

  const filtered = filterValues.action
    ? events.filter((e) => e.action === filterValues.action)
    : events

  return (
    <AdminPageShell title="Audit logs" breadcrumbs={[{ label: 'Campaigns', href: '/admin/campaigns' }, { label: 'Audit' }]}>
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      <div className="alert alert-secondary small">
        Activity derived from booking lifecycle events and staff audit counters. Full campaign audit log API listing is not yet exposed on admin routes.
      </div>

      {staffStats.length ? (
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-header bg-transparent">
            <h6 className="mb-0">Staff activity summary</h6>
          </div>
          <DataTable
            columns={[
              { key: 'name', label: 'Staff', render: (r: CampaignStaffStatsRow) => r.displayName },
              { key: 'role', label: 'Role', render: (r: CampaignStaffStatsRow) => r.role },
              { key: 'checkIns', label: 'Check-ins', render: (r: CampaignStaffStatsRow) => r.totalCheckIns },
              { key: 'actions', label: 'Audit actions', render: (r: CampaignStaffStatsRow) => r.totalActions },
            ]}
            rows={staffStats}
            keyField="staffId"
          />
        </div>
      ) : null}

      <AdminFiltersBar
        showSearch={false}
        filterValues={filterValues}
        onFilterChange={(key, value) => setFilterValues((prev) => ({ ...prev, [key]: value }))}
        onReset={() => setFilterValues({ action: '' })}
        filters={[
          {
            key: 'action',
            label: 'Action',
            render: (value, onChange) => (
              <select className="form-select form-select-sm" value={value} onChange={(e) => onChange(e.target.value)}>
                <option value="">All</option>
                <option value="BOOKING_CREATED">Booking created</option>
                <option value="BOOKING_CHECKED_IN">Checked in</option>
                <option value="BOOKING_COMPLETED">Completed</option>
                <option value="BOOKING_NO_SHOW">No show</option>
                <option value="BOOKING_CANCELLED">Cancelled</option>
              </select>
            ),
          },
        ]}
      />

      <DataTable
        columns={[
          {
            key: 'at',
            label: 'When',
            render: (r: AuditRow) => (r.at ? new Date(r.at).toLocaleString() : '—'),
          },
          { key: 'action', label: 'Action', render: (r: AuditRow) => <span className="font-monospace small">{r.action}</span> },
          { key: 'entity', label: 'Entity', render: (r: AuditRow) => r.entity },
          { key: 'detail', label: 'Detail', render: (r: AuditRow) => r.detail },
        ]}
        rows={filtered}
        loading={loading}
        keyField="id"
      />
    </AdminPageShell>
  )
}
