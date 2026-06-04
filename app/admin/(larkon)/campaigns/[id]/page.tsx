'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import DataTable from '@/src/bpa/admin/components/DataTable'
import ErrorState from '@/src/bpa/admin/components/ErrorState'
import CampaignStatusBadge from '@/src/bpa/campaign/admin/CampaignStatusBadge'
import CampaignDashboardWidgets from '@/src/bpa/campaign/admin/CampaignDashboardWidgets'
import CampaignTrendChart from '@/src/bpa/campaign/admin/CampaignTrendChart'
import {
  campaignAdminActivate,
  campaignAdminDashboardOverview,
  campaignAdminGet,
  campaignAdminPause,
  campaignAdminStats,
  type CampaignDashboardOverview,
  type CampaignDetail,
  type CampaignStats,
} from '@/lib/campaignApi'

export default function AdminCampaignDashboardPage() {
  const params = useParams()
  const id = Number(params?.id)
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [stats, setStats] = useState<CampaignStats | null>(null)
  const [overview, setOverview] = useState<CampaignDashboardOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!Number.isFinite(id)) return
    setLoading(true)
    setError('')
    try {
      const [c, s, o] = await Promise.all([
        campaignAdminGet(id),
        campaignAdminStats(id),
        campaignAdminDashboardOverview(id),
      ])
      setCampaign(c)
      setStats(s)
      setOverview(o)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load campaign')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function lifecycle(action: 'activate' | 'pause') {
    if (!campaign) return
    if (action === 'activate') await campaignAdminActivate(campaign.id)
    else await campaignAdminPause(campaign.id)
    await load()
  }

  if (error) return <ErrorState message={error} onRetry={load} />

  const locationRows = (stats?.byLocation ?? []).map((row) => ({
    id: row.locationId,
    locationName: row.locationName,
    bookings: row.bookings,
    vaccinations: row.vaccinations,
  }))

  return (
    <AdminPageShell
      title={campaign?.name ?? 'Campaign dashboard'}
      breadcrumbs={[
        { label: 'Admin', href: '/admin/dashboard' },
        { label: 'Campaigns', href: '/admin/campaigns' },
        { label: campaign?.name ?? '…' },
      ]}
      actions={
        campaign ? (
          <div className="d-flex gap-2 align-items-center">
            <CampaignStatusBadge status={campaign.status} />
            {campaign.status === 'DRAFT' || campaign.status === 'PAUSED' ? (
              <button type="button" className="btn btn-success btn-sm" onClick={() => lifecycle('activate')}>
                Activate
              </button>
            ) : null}
            {campaign.status === 'ACTIVE' ? (
              <button type="button" className="btn btn-warning btn-sm" onClick={() => lifecycle('pause')}>
                Pause
              </button>
            ) : null}
          </div>
        ) : null
      }
    >
      {loading ? <p className="text-muted">Loading…</p> : null}

      {overview ? <CampaignDashboardWidgets overview={overview} /> : null}

      {stats ? (
        <div className="row g-3 mb-4">
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-transparent">
                <h5 className="mb-0">Booking trend</h5>
              </div>
              <div className="card-body">
                <CampaignTrendChart stats={stats} />
              </div>
            </div>
          </div>
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <p className="text-muted small mb-1">Completion rate</p>
                <h3 className="mb-3">{stats.completionRate}%</h3>
                <p className="text-muted small mb-1">Show rate</p>
                <h3 className="mb-0">{stats.showRate}%</h3>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {locationRows.length ? (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
            <h5 className="mb-0">By location</h5>
            <Link href={`/admin/campaigns/${id}/locations`} className="btn btn-sm btn-link">
              Manage locations
            </Link>
          </div>
          <DataTable
            columns={[
              { key: 'location', label: 'Location', render: (r) => r.locationName },
              { key: 'bookings', label: 'Bookings', render: (r) => r.bookings },
              { key: 'vaccinations', label: 'Vaccinations', render: (r) => r.vaccinations ?? '—' },
            ]}
            rows={locationRows}
            keyField="id"
          />
        </div>
      ) : null}

      <div className="d-flex flex-wrap gap-2">
        <Link href={`/admin/campaigns/${id}/bookings`} className="btn btn-outline-primary btn-sm">
          Bookings
        </Link>
        <Link href={`/admin/campaigns/${id}/reports`} className="btn btn-outline-primary btn-sm">
          Reports
        </Link>
        <Link href={`/admin/campaigns/${id}/operations-center`} className="btn btn-outline-primary btn-sm">
          Operations Center
        </Link>
        <Link href={`/admin/campaigns/${id}/configuration`} className="btn btn-outline-secondary btn-sm">
          Configuration
        </Link>
      </div>
    </AdminPageShell>
  )
}
