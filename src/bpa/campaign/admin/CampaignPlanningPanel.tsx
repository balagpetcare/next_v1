'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import DataTable from '@/src/bpa/admin/components/DataTable'
import {
  campaignAdminAssignBookingVenue,
  campaignAdminBookings,
  campaignAdminLocations,
  campaignAdminPlanning,
  type CampaignBookingRow,
  type CampaignPlanningData,
} from '@/lib/campaignApi'

type Props = { campaignId: number }

function fmt(n: number) {
  return new Intl.NumberFormat('en-BD').format(n)
}

function bdt(n: number) {
  return `৳${fmt(n)}`
}

export default function CampaignPlanningPanel({ campaignId }: Props) {
  const [data, setData] = useState<CampaignPlanningData | null>(null)
  const [pending, setPending] = useState<CampaignBookingRow[]>([])
  const [locations, setLocations] = useState<Array<{ id: number; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [assignBookingId, setAssignBookingId] = useState<number | ''>('')
  const [assignLocationId, setAssignLocationId] = useState('')
  const [assignSlotId, setAssignSlotId] = useState('')
  const [assignDate, setAssignDate] = useState('')
  const [assignBusy, setAssignBusy] = useState(false)
  const [assignMsg, setAssignMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [plan, bookPage, locs] = await Promise.all([
        campaignAdminPlanning(campaignId),
        campaignAdminBookings(campaignId, {
          page: 1,
          pageSize: 50,
          status: 'PENDING_ASSIGNMENT',
        }),
        campaignAdminLocations(campaignId, { includeInactive: false }),
      ])
      setData(plan)
      setPending(bookPage.items ?? [])
      setLocations(locs.map((l) => ({ id: l.id, name: l.name })))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load planning data')
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    load()
  }, [load])

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault()
    if (!assignBookingId || !assignLocationId || !assignSlotId) {
      setAssignMsg('Select booking, location, and slot ID')
      return
    }
    setAssignBusy(true)
    setAssignMsg('')
    try {
      await campaignAdminAssignBookingVenue(Number(assignBookingId), {
        locationId: Number(assignLocationId),
        slotId: Number(assignSlotId),
        bookingDate: assignDate || undefined,
      })
      setAssignMsg('Venue assigned — SMS sent to customer')
      setAssignBookingId('')
      setAssignLocationId('')
      setAssignSlotId('')
      setAssignDate('')
      await load()
    } catch (err) {
      setAssignMsg(err instanceof Error ? err.message : 'Assignment failed')
    } finally {
      setAssignBusy(false)
    }
  }

  if (loading) return <p className="text-muted">Loading campaign planning…</p>
  if (error) return <div className="alert alert-danger">{error}</div>
  if (!data) return null

  return (
    <div className="row g-4">
      <div className="col-12">
        <div className="alert alert-info mb-0">
          <strong>Zone-interest workflow:</strong> customers register by zone and area only. Use demand
          below to plan venues — then assign location + slot; customer receives SMS.{' '}
          <Link href={`/admin/campaigns/${campaignId}/locations`}>Manage locations</Link> (not
          auto-created).
        </div>
      </div>

      <div className="col-md-4">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body">
            <div className="text-muted small">Pending venue assignment</div>
            <div className="fs-2 fw-bold">{fmt(data.pendingVenueAssignment)}</div>
          </div>
        </div>
      </div>

      <div className="col-md-8">
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-transparent">
            <h6 className="mb-0">Assign venue (SMS notification)</h6>
          </div>
          <div className="card-body">
            <form className="row g-2" onSubmit={handleAssign}>
              <div className="col-md-6">
                <label className="form-label small">Booking</label>
                <select
                  className="form-select form-select-sm"
                  value={assignBookingId === '' ? '' : String(assignBookingId)}
                  onChange={(e) =>
                    setAssignBookingId(e.target.value ? Number(e.target.value) : '')
                  }
                >
                  <option value="">Select pending booking</option>
                  {pending.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bookingRef} — {b.ownerPhone}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label small">Location (venue)</label>
                <select
                  className="form-select form-select-sm"
                  value={assignLocationId}
                  onChange={(e) => setAssignLocationId(e.target.value)}
                >
                  <option value="">Select location</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label small">Slot ID</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  placeholder="From Slots page"
                  value={assignSlotId}
                  onChange={(e) => setAssignSlotId(e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small">Booking date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={assignDate}
                  onChange={(e) => setAssignDate(e.target.value)}
                />
              </div>
              <div className="col-md-4 d-flex align-items-end">
                <button type="submit" className="btn btn-primary btn-sm w-100" disabled={assignBusy}>
                  {assignBusy ? '…' : 'Assign & send SMS'}
                </button>
              </div>
            </form>
            {assignMsg ? <p className="small mt-2 mb-0 text-muted">{assignMsg}</p> : null}
            <p className="small text-muted mt-2 mb-0">
              Open{' '}
              <Link href={`/admin/campaigns/${campaignId}/slots`}>Slots</Link> to find slot IDs for the
              chosen location.
            </p>
          </div>
        </div>
      </div>

      <div className="col-12">
        <h6 className="border-bottom pb-2">Top zones (demand)</h6>
        <DataTable
          columns={[
            { key: 'rank', label: '#', render: (r) => r.rank },
            { key: 'zone', label: 'Zone', render: (r) => r.coverageZoneName || '—' },
            { key: 'bookings', label: 'Bookings', render: (r) => fmt(r.totalBookings) },
            { key: 'cats', label: 'Expected cats', render: (r) => fmt(r.totalCats) },
            { key: 'rev', label: 'Revenue', render: (r) => bdt(r.totalRevenue) },
            { key: 'exp', label: 'Expected revenue', render: (r) => bdt(r.expectedRevenue) },
          ]}
          rows={data.topZones}
          keyField="rank"
        />
      </div>

      <div className="col-12">
        <h6 className="border-bottom pb-2">Top areas (demand)</h6>
        <DataTable
          columns={[
            { key: 'rank', label: '#', render: (r) => r.rank },
            { key: 'area', label: 'Area', render: (r) => r.areaName },
            { key: 'zone', label: 'Zone', render: (r) => r.coverageZoneName || '—' },
            { key: 'bookings', label: 'Bookings', render: (r) => fmt(r.totalBookings) },
            { key: 'cats', label: 'Expected cats', render: (r) => fmt(r.totalCats) },
            { key: 'exp', label: 'Expected revenue', render: (r) => bdt(r.expectedRevenue) },
          ]}
          rows={data.topAreas}
          keyField="rank"
        />
      </div>

      <div className="col-12 text-muted small text-end">
        Generated: {data.generatedAt ? new Date(data.generatedAt).toLocaleString() : '—'}
      </div>
    </div>
  )
}
