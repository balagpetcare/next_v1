'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import DataTable from '@/src/bpa/admin/components/DataTable'
import ErrorState from '@/src/bpa/admin/components/ErrorState'
import {
  campaignAdminAssignStaff,
  campaignAdminLocations,
  campaignAdminRemoveStaff,
  campaignAdminStaffList,
  campaignAdminStaffStats,
  campaignAdminUpdateStaffRole,
  type CampaignLocationRow,
  type CampaignStaffRow,
  type CampaignStaffStatsRow,
} from '@/lib/campaignApi'

const ROLES = ['ADMIN', 'COORDINATOR', 'CHECK_IN', 'VACCINATOR', 'SUPPORT'] as const

export default function AdminCampaignStaffPage() {
  const params = useParams()
  const campaignId = Number(params?.id)
  const [staff, setStaff] = useState<CampaignStaffRow[]>([])
  const [stats, setStats] = useState<CampaignStaffStatsRow[]>([])
  const [locations, setLocations] = useState<CampaignLocationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ userId: '', role: 'CHECK_IN', locationId: '' })

  const load = useCallback(async () => {
    if (!Number.isFinite(campaignId)) return
    setLoading(true)
    setError('')
    try {
      const [s, st, locs] = await Promise.all([
        campaignAdminStaffList(campaignId),
        campaignAdminStaffStats(campaignId),
        campaignAdminLocations(campaignId) as Promise<CampaignLocationRow[]>,
      ])
      setStaff(s)
      setStats(st)
      setLocations(locs)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load staff')
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    load()
  }, [load])

  async function assign(e: React.FormEvent) {
    e.preventDefault()
    await campaignAdminAssignStaff({
      campaignId,
      userId: Number(form.userId),
      role: form.role,
      locationId: form.locationId ? Number(form.locationId) : undefined,
    })
    setForm({ userId: '', role: 'CHECK_IN', locationId: '' })
    await load()
  }

  const statMap = new Map(stats.map((s) => [s.staffId, s]))

  const columns = [
    {
      key: 'name',
      label: 'Staff',
      render: (r: CampaignStaffRow) => r.user?.profile?.displayName ?? `User #${r.userId}`,
    },
    { key: 'role', label: 'Role', render: (r: CampaignStaffRow) => r.role },
    {
      key: 'location',
      label: 'Location',
      render: (r: CampaignStaffRow) => r.location?.name ?? 'All locations',
    },
    {
      key: 'checkIns',
      label: 'Check-ins',
      render: (r: CampaignStaffRow) => statMap.get(r.id)?.totalCheckIns ?? 0,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r: CampaignStaffRow) => statMap.get(r.id)?.totalActions ?? 0,
    },
    {
      key: 'edit',
      label: '',
      render: (r: CampaignStaffRow) => (
        <div className="d-flex gap-1">
          <select
            className="form-select form-select-sm"
            value={r.role}
            onChange={async (e) => {
              await campaignAdminUpdateStaffRole(r.id, e.target.value)
              await load()
            }}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => campaignAdminRemoveStaff(r.id).then(load)}>
            Remove
          </button>
        </div>
      ),
    },
  ]

  return (
    <AdminPageShell title="Staff assignment" breadcrumbs={[{ label: 'Campaigns', href: '/admin/campaigns' }, { label: 'Staff' }]}>
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      <form className="card border-0 shadow-sm mb-3" onSubmit={assign}>
        <div className="card-body row g-2 align-items-end">
          <div className="col-md-3">
            <label className="form-label small">BPA user ID</label>
            <input
              className="form-control form-control-sm"
              value={form.userId}
              onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
              required
              placeholder="User ID"
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small">Role</label>
            <select className="form-select form-select-sm" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label small">Location (optional)</label>
            <select className="form-select form-select-sm" value={form.locationId} onChange={(e) => setForm((f) => ({ ...f, locationId: e.target.value }))}>
              <option value="">All locations</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <button type="submit" className="btn btn-primary btn-sm w-100">
              Assign staff
            </button>
          </div>
        </div>
      </form>

      <DataTable columns={columns} rows={staff} loading={loading} keyField="id" />
    </AdminPageShell>
  )
}
