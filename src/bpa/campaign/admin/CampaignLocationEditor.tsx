'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDebouncedValue } from '@/components/location/useDebouncedValue'
import {
  campaignAdminBdAreasByZone,
  campaignAdminCoverageZones,
  campaignAdminCreateLocation,
  campaignAdminUpdateLocation,
  type CampaignCoverageZone,
  type CampaignBdAreaOption,
  type CampaignLocationRow,
} from '@/lib/campaignApi'

export type LocationFormValues = {
  name: string
  address: string
  contactPhone: string
  dailyCapacity: string
  coverageZoneId: string
  bookingArea: string
  bdAreaId: string
  isActive: boolean
}

const emptyForm = (): LocationFormValues => ({
  name: '',
  address: '',
  contactPhone: '',
  dailyCapacity: '100',
  coverageZoneId: '',
  bookingArea: '',
  bdAreaId: '',
  isActive: true,
})

function formFromLocation(row: CampaignLocationRow): LocationFormValues {
  return {
    name: row.name,
    address: row.address ?? '',
    contactPhone: row.contactPhone ?? '',
    dailyCapacity: String(row.dailyCapacity ?? 100),
    coverageZoneId: row.coverageZoneId != null ? String(row.coverageZoneId) : '',
    bookingArea: row.bookingArea ?? '',
    bdAreaId: row.bdAreaId != null ? String(row.bdAreaId) : '',
    isActive: row.isActive !== false,
  }
}

function buildPayload(campaignId: number, form: LocationFormValues) {
  const coverageZoneId = form.coverageZoneId ? Number(form.coverageZoneId) : undefined
  const bdAreaId = form.bdAreaId ? Number(form.bdAreaId) : undefined
  return {
    campaignId,
    name: form.name.trim(),
    address: form.address.trim() || undefined,
    contactPhone: form.contactPhone.trim() || undefined,
    dailyCapacity: Number(form.dailyCapacity) || 100,
    isActive: form.isActive,
    addressJson: {
      coverageZoneId,
      bdAreaId,
      bookingArea: form.bookingArea.trim() || undefined,
    },
  }
}

type Props = {
  campaignId: number
  open: boolean
  editing: CampaignLocationRow | null
  onClose: () => void
  onSaved: () => void
}

export default function CampaignLocationEditor({
  campaignId,
  open,
  editing,
  onClose,
  onSaved,
}: Props) {
  const [form, setForm] = useState<LocationFormValues>(emptyForm)
  const [zones, setZones] = useState<CampaignCoverageZone[]>([])
  const [areas, setAreas] = useState<CampaignBdAreaOption[]>([])
  const [areaSearch, setAreaSearch] = useState('')
  const [areasLoading, setAreasLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const debouncedAreaSearch = useDebouncedValue(areaSearch, 300)
  const zoneId = form.coverageZoneId ? Number(form.coverageZoneId) : null

  useEffect(() => {
    if (!open) return
    setForm(editing ? formFromLocation(editing) : emptyForm())
    setAreaSearch('')
    setError('')
    campaignAdminCoverageZones()
      .then(setZones)
      .catch(() => setZones([]))
  }, [open, editing])

  const loadAreas = useCallback(async () => {
    if (!zoneId) {
      setAreas([])
      return
    }
    setAreasLoading(true)
    try {
      const rows = await campaignAdminBdAreasByZone(zoneId, debouncedAreaSearch.trim() || undefined)
      setAreas(rows)
    } catch {
      setAreas([])
    } finally {
      setAreasLoading(false)
    }
  }, [zoneId, debouncedAreaSearch])

  useEffect(() => {
    if (!open) return
    loadAreas()
  }, [open, loadAreas])

  const suggestedAreas = useMemo(() => areas.slice(0, 8), [areas])

  function patch(patch: Partial<LocationFormValues>) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  function handleZoneChange(nextZoneId: string) {
    patch({ coverageZoneId: nextZoneId, bdAreaId: '' })
    setAreaSearch('')
  }

  function handleBdAreaChange(nextId: string) {
    const area = areas.find((a) => String(a.id) === nextId)
    patch({
      bdAreaId: nextId,
      bookingArea: area?.nameEn || form.bookingArea,
    })
  }

  function validateClient(): string | null {
    if (!form.name.trim()) return 'Location name is required'
    if (!form.coverageZoneId && !form.bdAreaId) {
      return 'Select a coverage zone or a BdArea'
    }
    if (!form.bookingArea.trim() && !form.bdAreaId) {
      return 'Enter a booking area label or select a BdArea'
    }
    const cap = Number(form.dailyCapacity)
    if (!Number.isFinite(cap) || cap < 1) return 'Daily capacity must be at least 1'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const clientErr = validateClient()
    if (clientErr) {
      setError(clientErr)
      return
    }
    setBusy(true)
    setError('')
    try {
      const payload = buildPayload(campaignId, form)
      if (editing) {
        await campaignAdminUpdateLocation(editing.id, payload)
      } else {
        await campaignAdminCreateLocation(payload)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save location')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} role="dialog">
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <form className="modal-content" onSubmit={handleSubmit}>
          <div className="modal-header">
            <h5 className="modal-title">{editing ? 'Edit location' : 'Add campaign location'}</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
          </div>
          <div className="modal-body">
            {error ? <div className="alert alert-danger py-2">{error}</div> : null}

            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Location name *</label>
                <input
                  className="form-control"
                  value={form.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Phone</label>
                <input
                  className="form-control"
                  value={form.contactPhone}
                  onChange={(e) => patch({ contactPhone: e.target.value })}
                  placeholder="01XXXXXXXXX"
                />
              </div>
              <div className="col-12">
                <label className="form-label">Address</label>
                <input
                  className="form-control"
                  value={form.address}
                  onChange={(e) => patch({ address: e.target.value })}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Daily capacity *</label>
                <input
                  type="number"
                  min={1}
                  className="form-control"
                  value={form.dailyCapacity}
                  onChange={(e) => patch({ dailyCapacity: e.target.value })}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={form.isActive ? 'active' : 'inactive'}
                  onChange={(e) => patch({ isActive: e.target.value === 'active' })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="col-12">
                <hr className="my-1" />
                <p className="small text-muted mb-2">Coverage mapping (Dhaka metro / location master)</p>
              </div>

              <div className="col-md-6">
                <label className="form-label">Coverage zone *</label>
                <select
                  className="form-select"
                  value={form.coverageZoneId}
                  onChange={(e) => handleZoneChange(e.target.value)}
                >
                  <option value="">Select zone…</option>
                  {zones.map((z) => (
                    <option key={z.id} value={String(z.id)}>
                      {z.name}
                      {z.city ? ` (${z.city})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">Booking area</label>
                <input
                  className="form-control"
                  value={form.bookingArea}
                  onChange={(e) => patch({ bookingArea: e.target.value })}
                  placeholder="e.g. Mirpur 10"
                />
                <div className="form-text">Auto-filled when you pick a BdArea; used in public booking & analytics.</div>
              </div>

              <div className="col-12">
                <label className="form-label">BdArea (searchable)</label>
                <input
                  className="form-control form-control-sm mb-2"
                  placeholder={zoneId ? 'Search areas in this zone…' : 'Select a coverage zone first'}
                  value={areaSearch}
                  onChange={(e) => setAreaSearch(e.target.value)}
                  disabled={!zoneId}
                />
                <select
                  className="form-select"
                  value={form.bdAreaId}
                  onChange={(e) => handleBdAreaChange(e.target.value)}
                  disabled={!zoneId || areasLoading}
                >
                  <option value="">
                    {areasLoading ? 'Loading…' : zoneId ? 'Select BdArea (optional)' : 'Select zone first'}
                  </option>
                  {areas.map((a) => (
                    <option key={a.id} value={String(a.id)}>
                      {a.nameEn}
                      {a.nameBn ? ` (${a.nameBn})` : ''}
                    </option>
                  ))}
                </select>
                {zoneId && suggestedAreas.length > 0 ? (
                  <div className="mt-2 d-flex flex-wrap gap-1">
                    <span className="small text-muted me-1">Suggested:</span>
                    {suggestedAreas.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => handleBdAreaChange(String(a.id))}
                      >
                        {a.nameEn}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : editing ? 'Update location' : 'Create location'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
