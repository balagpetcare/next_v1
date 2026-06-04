'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import AdminFiltersBar from '@/src/bpa/admin/components/AdminFiltersBar'
import DataTable from '@/src/bpa/admin/components/DataTable'
import ErrorState from '@/src/bpa/admin/components/ErrorState'
import CampaignLocationEditor from '@/src/bpa/campaign/admin/CampaignLocationEditor'
import {
  campaignAdminLocations,
  campaignAdminUpdateLocation,
  type CampaignLocationRow,
} from '@/lib/campaignApi'

export default function AdminCampaignLocationsPage() {
  const params = useParams()
  const campaignId = Number(params?.id)
  const [locations, setLocations] = useState<CampaignLocationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterValues, setFilterValues] = useState({ active: '' })
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<CampaignLocationRow | null>(null)

  const load = useCallback(async () => {
    if (!Number.isFinite(campaignId)) return
    setLoading(true)
    setError('')
    try {
      const rows = await campaignAdminLocations(campaignId, { includeInactive: true })
      setLocations(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load locations')
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setEditorOpen(true)
  }

  function openEdit(row: CampaignLocationRow) {
    setEditing(row)
    setEditorOpen(true)
  }

  const filtered = locations.filter((l) => {
    if (filterValues.active === 'active') return l.isActive !== false
    if (filterValues.active === 'inactive') return l.isActive === false
    return true
  })

  const columns = [
    { key: 'name', label: 'Name', render: (r: CampaignLocationRow) => r.name },
    { key: 'address', label: 'Address', render: (r: CampaignLocationRow) => r.address || '—' },
    { key: 'phone', label: 'Phone', render: (r: CampaignLocationRow) => r.contactPhone || '—' },
    {
      key: 'zone',
      label: 'Coverage zone',
      render: (r: CampaignLocationRow) => r.coverageZoneName || '—',
    },
    {
      key: 'bookingArea',
      label: 'Booking area',
      render: (r: CampaignLocationRow) => r.bookingArea || '—',
    },
    { key: 'capacity', label: 'Daily capacity', render: (r: CampaignLocationRow) => r.dailyCapacity ?? '—' },
    {
      key: 'status',
      label: 'Status',
      render: (r: CampaignLocationRow) =>
        r.isActive === false ? (
          <span className="badge bg-secondary">Inactive</span>
        ) : (
          <span className="badge bg-success">Active</span>
        ),
    },
    {
      key: 'actions',
      label: '',
      render: (r: CampaignLocationRow) => (
        <div className="d-flex flex-wrap gap-1">
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openEdit(r)}>
            Edit
          </button>
          <Link href={`/admin/campaigns/${campaignId}/slots?locationId=${r.id}`} className="btn btn-sm btn-outline-secondary">
            Slots
          </Link>
          {r.isActive !== false ? (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => campaignAdminUpdateLocation(r.id, { isActive: false }).then(load)}
            >
              Deactivate
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-outline-success"
              onClick={() => campaignAdminUpdateLocation(r.id, { isActive: true }).then(load)}
            >
              Activate
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <AdminPageShell
      title="Campaign locations"
      breadcrumbs={[{ label: 'Campaigns', href: '/admin/campaigns' }, { label: 'Locations' }]}
      actions={
        <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
          Add location
        </button>
      }
    >
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      <AdminFiltersBar
        showSearch={false}
        filterValues={filterValues}
        onFilterChange={(key, value) => setFilterValues((prev) => ({ ...prev, [key]: value }))}
        onReset={() => setFilterValues({ active: '' })}
        filters={[
          {
            key: 'active',
            label: 'Status',
            render: (value, onChange) => (
              <select className="form-select form-select-sm" value={value} onChange={(e) => onChange(e.target.value)}>
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            ),
          },
        ]}
      />

      <p className="small text-muted mb-3">
        Map each site to a Dhaka metro coverage zone and BdArea so express booking and analytics (bookings/revenue by
        location & zone) stay accurate. No raw JSON editing required.
      </p>

      <DataTable columns={columns} rows={filtered} loading={loading} keyField="id" />

      <CampaignLocationEditor
        campaignId={campaignId}
        open={editorOpen}
        editing={editing}
        onClose={() => setEditorOpen(false)}
        onSaved={load}
      />
    </AdminPageShell>
  )
}
