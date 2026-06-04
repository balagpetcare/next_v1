'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import AdminFiltersBar from '@/src/bpa/admin/components/AdminFiltersBar'
import ErrorState from '@/src/bpa/admin/components/ErrorState'
import {
  campaignAdminBulkCreateSlots,
  campaignAdminCloseSlot,
  campaignAdminOpenSlot,
  campaignAdminLocations,
  campaignAdminLocationSlots,
  resolveCampaignSlotId,
  type CampaignLocationRow,
  type CampaignSlotRow,
} from '@/lib/campaignApi'
import {
  formatCampaignSlotRange,
  formatCampaignSlotTime,
  slotRemainingCapacity,
} from '@/lib/campaignSlotFormat'

type RepeatPattern = 'DAILY' | 'WEEKDAYS' | 'WEEKENDS' | 'CUSTOM'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function AdminCampaignSlotsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const campaignId = Number(params?.id)
  const initialLocationId = searchParams.get('locationId') || ''
  const [locations, setLocations] = useState<CampaignLocationRow[]>([])
  const [slots, setSlots] = useState<CampaignSlotRow[]>([])
  const [filterValues, setFilterValues] = useState({ locationId: initialLocationId })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [bulk, setBulk] = useState({
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    sessionName: 'Morning Session',
    startTime: '09:00',
    endTime: '10:00',
    checkInStartTime: '08:30',
    bookingCutoffTime: '09:45',
    capacity: '500',
    repeatPattern: 'DAILY' as RepeatPattern,
    customDays: [1, 2, 3, 4, 5] as number[],
  })

  const load = useCallback(async () => {
    if (!Number.isFinite(campaignId)) return
    setLoading(true)
    setError('')
    try {
      const locs = (await campaignAdminLocations(campaignId)) as CampaignLocationRow[]
      setLocations(locs)
      const locId = Number(filterValues.locationId) || locs[0]?.id
      if (locId) {
        const list = await campaignAdminLocationSlots(locId, {
          startDate: bulk.startDate,
          endDate: bulk.endDate,
        })
        setSlots(list)
        if (!filterValues.locationId) {
          setFilterValues((f) => ({ ...f, locationId: String(locId) }))
        }
      } else {
        setSlots([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load slots')
    } finally {
      setLoading(false)
    }
  }, [campaignId, filterValues.locationId, bulk.startDate, bulk.endDate])

  useEffect(() => {
    load()
  }, [load])

  function toggleCustomDay(day: number) {
    setBulk((b) => {
      const set = new Set(b.customDays)
      if (set.has(day)) set.delete(day)
      else set.add(day)
      return { ...b, customDays: [...set].sort((a, c) => a - c) }
    })
  }

  async function createBulk(e: React.FormEvent) {
    e.preventDefault()
    const locationId = Number(filterValues.locationId)
    if (!locationId) return
    setActionError('')
    try {
      const body: Record<string, unknown> = {
        locationId,
        startDate: bulk.startDate,
        endDate: bulk.endDate,
        sessionName: bulk.sessionName.trim() || undefined,
        checkInStartTime: bulk.checkInStartTime || undefined,
        bookingCutoffTime: bulk.bookingCutoffTime || undefined,
        repeatPattern: bulk.repeatPattern,
        slots: [
          {
            startTime: bulk.startTime,
            endTime: bulk.endTime,
            capacity: Number(bulk.capacity) || 50,
          },
        ],
      }
      if (bulk.repeatPattern === 'CUSTOM') {
        body.customDays = bulk.customDays
      }
      await campaignAdminBulkCreateSlots(body)
      await load()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to create slots')
    }
  }

  async function closeSlot(row: CampaignSlotRow) {
    setActionError('')
    try {
      await campaignAdminCloseSlot(resolveCampaignSlotId(row))
      await load()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to close slot')
    }
  }

  async function openSlot(row: CampaignSlotRow) {
    setActionError('')
    try {
      await campaignAdminOpenSlot(resolveCampaignSlotId(row))
      await load()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to open slot')
    }
  }

  function slotTimeLabel(row: CampaignSlotRow) {
    if (row.startTimeLabel && row.endTimeLabel) {
      return `${row.startTimeLabel} – ${row.endTimeLabel}`
    }
    return formatCampaignSlotRange(row.startTime, row.endTime)
  }

  return (
    <AdminPageShell
      title="Campaign slots"
      breadcrumbs={[{ label: 'Campaigns', href: '/admin/campaigns' }, { label: 'Slots' }]}
    >
      {error ? <ErrorState message={error} onRetry={load} /> : null}
      {actionError ? <div className="alert alert-warning">{actionError}</div> : null}

      <AdminFiltersBar
        showSearch={false}
        filterValues={filterValues}
        onFilterChange={(key, value) => setFilterValues((prev) => ({ ...prev, [key]: value }))}
        onReset={() => setFilterValues({ locationId: locations[0] ? String(locations[0].id) : '' })}
        filters={[
          {
            key: 'locationId',
            label: 'Location',
            render: (value, onChange) => (
              <select className="form-select form-select-sm" value={value} onChange={(e) => onChange(e.target.value)}>
                <option value="">Select location</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            ),
          },
        ]}
      />

      {locations.length === 0 ? (
        <div className="alert alert-info">
          Add a location first. <Link href={`/admin/campaigns/${campaignId}/locations`}>Go to locations</Link>
        </div>
      ) : (
        <form className="card border-0 shadow-sm mb-4" onSubmit={createBulk}>
          <div className="card-header bg-transparent">
            <h6 className="mb-0">Bulk create vaccination sessions</h6>
            <p className="small text-muted mb-0 mt-1">
              Sessions use 12-hour labels on booking pages. Check-in must be at or before start; booking cutoff at or
              before end.
            </p>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-3">
                <label className="form-label small">Session name</label>
                <input
                  className="form-control form-control-sm"
                  value={bulk.sessionName}
                  onChange={(e) => setBulk((b) => ({ ...b, sessionName: e.target.value }))}
                  placeholder="Morning Session"
                />
              </div>
              <div className="col-md-2">
                <label className="form-label small">From date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={bulk.startDate}
                  onChange={(e) => setBulk((b) => ({ ...b, startDate: e.target.value }))}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label small">To date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={bulk.endDate}
                  onChange={(e) => setBulk((b) => ({ ...b, endDate: e.target.value }))}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label small">Start (24h)</label>
                <input
                  type="time"
                  className="form-control form-control-sm"
                  value={bulk.startTime}
                  onChange={(e) => setBulk((b) => ({ ...b, startTime: e.target.value }))}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label small">End (24h)</label>
                <input
                  type="time"
                  className="form-control form-control-sm"
                  value={bulk.endTime}
                  onChange={(e) => setBulk((b) => ({ ...b, endTime: e.target.value }))}
                />
              </div>
              <div className="col-md-1">
                <label className="form-label small">Capacity</label>
                <input
                  className="form-control form-control-sm"
                  value={bulk.capacity}
                  onChange={(e) => setBulk((b) => ({ ...b, capacity: e.target.value }))}
                />
              </div>
            </div>
            <div className="row g-3 mt-1">
              <div className="col-md-2">
                <label className="form-label small">Check-in from</label>
                <input
                  type="time"
                  className="form-control form-control-sm"
                  value={bulk.checkInStartTime}
                  onChange={(e) => setBulk((b) => ({ ...b, checkInStartTime: e.target.value }))}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label small">Booking cutoff</label>
                <input
                  type="time"
                  className="form-control form-control-sm"
                  value={bulk.bookingCutoffTime}
                  onChange={(e) => setBulk((b) => ({ ...b, bookingCutoffTime: e.target.value }))}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small">Repeat pattern</label>
                <select
                  className="form-select form-select-sm"
                  value={bulk.repeatPattern}
                  onChange={(e) => setBulk((b) => ({ ...b, repeatPattern: e.target.value as RepeatPattern }))}
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKDAYS">Weekdays (Mon–Fri)</option>
                  <option value="WEEKENDS">Weekends (Sat–Sun)</option>
                  <option value="CUSTOM">Custom days</option>
                </select>
              </div>
              {bulk.repeatPattern === 'CUSTOM' ? (
                <div className="col-md-4 d-flex flex-wrap gap-1 align-items-end">
                  {WEEKDAY_LABELS.map((label, i) => (
                    <button
                      key={label}
                      type="button"
                      className={`btn btn-sm ${bulk.customDays.includes(i) ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => toggleCustomDay(i)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <p className="small text-muted mt-2 mb-0">
              Preview: {bulk.sessionName || 'Session'} · {formatCampaignSlotRange(bulk.startTime, bulk.endTime)} ·
              Check-in {formatCampaignSlotTime(bulk.checkInStartTime)} · Cutoff{' '}
              {formatCampaignSlotTime(bulk.bookingCutoffTime)}
            </p>
          </div>
          <div className="card-footer bg-transparent">
            <button type="submit" className="btn btn-primary btn-sm">
              Create slots
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-muted">Loading slots…</p>
      ) : slots.length === 0 ? (
        <p className="text-muted">No slots in this date range.</p>
      ) : (
        <div className="row g-3">
          {slots.map((row) => {
            const remaining = slotRemainingCapacity(row)
            const booked = row.bookedCount ?? row.capacity - remaining
            return (
              <div key={row.id} className="col-md-6 col-lg-4">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div>
                        <h6 className="mb-1">{row.sessionName || 'Vaccination Session'}</h6>
                        <div className="small text-muted">
                          {row.date ? new Date(row.date).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}
                        </div>
                        <div className="fw-semibold mt-2">{slotTimeLabel(row)}</div>
                        {row.checkInStartTime ? (
                          <div className="small text-muted">Check-in from {formatCampaignSlotTime(row.checkInStartTime)}</div>
                        ) : null}
                        {row.bookingCutoffTime ? (
                          <div className="small text-muted">
                            Booking closes {formatCampaignSlotTime(row.bookingCutoffTime)}
                          </div>
                        ) : null}
                      </div>
                      <span
                        className={`badge ${row.status === 'OPEN' ? 'bg-success' : row.status === 'FULL' ? 'bg-warning text-dark' : 'bg-secondary'}`}
                      >
                        {row.status}
                      </span>
                    </div>
                    <ul className="list-unstyled small mt-3 mb-0">
                      <li>
                        <strong>Capacity:</strong> {row.capacity}
                      </li>
                      <li>
                        <strong>Booked:</strong> {booked}
                      </li>
                      <li>
                        <strong>Remaining:</strong> {remaining}
                      </li>
                    </ul>
                  </div>
                  <div className="card-footer bg-transparent d-flex gap-1">
                    <span className="small text-muted me-auto">ID {row.id}</span>
                    {row.status === 'OPEN' ? (
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => closeSlot(row)}>
                        Close
                      </button>
                    ) : null}
                    {row.status === 'CLOSED' ? (
                      <button type="button" className="btn btn-sm btn-outline-success" onClick={() => openSlot(row)}>
                        Open
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AdminPageShell>
  )
}
