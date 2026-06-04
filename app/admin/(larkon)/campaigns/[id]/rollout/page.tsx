'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import {
  campaignAdminCreateRolloutRegion,
  campaignAdminRolloutPhases,
  campaignAdminUpdateRolloutPhase,
  campaignAdminUpdateRolloutRegion,
  campaignPublicBdDivisions,
  campaignPublicBdDistricts,
  campaignPublicBdUpazilas,
  type RolloutPhaseRow,
  type RolloutRegionRow,
  type BdGeoRow,
} from '@/lib/campaignApi'

export default function AdminCampaignRolloutPage() {
  const params = useParams()
  const campaignId = Number(params?.id)
  const [phases, setPhases] = useState<RolloutPhaseRow[]>([])
  const [divisions, setDivisions] = useState<BdGeoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [regionForm, setRegionForm] = useState({
    phaseId: '',
    divisionId: '',
    districtId: '',
    upazilaId: '',
    city: '',
    venueName: '',
    targetCapacity: '500',
    isActive: false,
    startDate: '',
    endDate: '',
  })
  const [districts, setDistricts] = useState<BdGeoRow[]>([])
  const [upazilas, setUpazilas] = useState<BdGeoRow[]>([])

  const load = useCallback(async () => {
    if (!Number.isFinite(campaignId)) return
    setLoading(true)
    setError('')
    try {
      const [p, d] = await Promise.all([
        campaignAdminRolloutPhases(campaignId),
        campaignPublicBdDivisions(),
      ])
      setPhases(p)
      setDivisions(d)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load rollout')
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!regionForm.divisionId) {
      setDistricts([])
      return
    }
    campaignPublicBdDistricts(Number(regionForm.divisionId))
      .then(setDistricts)
      .catch(() => setDistricts([]))
  }, [regionForm.divisionId])

  useEffect(() => {
    if (!regionForm.districtId) {
      setUpazilas([])
      return
    }
    campaignPublicBdUpazilas(Number(regionForm.districtId))
      .then(setUpazilas)
      .catch(() => setUpazilas([]))
  }, [regionForm.districtId])

  async function setPhaseStatus(phase: RolloutPhaseRow, status: string) {
    await campaignAdminUpdateRolloutPhase(phase.id, { status })
    await load()
  }

  async function addRegion(e: React.FormEvent) {
    e.preventDefault()
    const phaseId = Number(regionForm.phaseId)
    if (!phaseId) return
    await campaignAdminCreateRolloutRegion({
      phaseId,
      campaignId,
      divisionId: regionForm.divisionId ? Number(regionForm.divisionId) : null,
      districtId: regionForm.districtId ? Number(regionForm.districtId) : null,
      upazilaId: regionForm.upazilaId ? Number(regionForm.upazilaId) : null,
      city: regionForm.city.trim() || undefined,
      venueName: regionForm.venueName.trim() || undefined,
      targetCapacity: Number(regionForm.targetCapacity) || 0,
      isActive: regionForm.isActive,
      startDate: regionForm.startDate || undefined,
      endDate: regionForm.endDate || undefined,
    })
    setRegionForm({
      phaseId: '',
      divisionId: '',
      districtId: '',
      upazilaId: '',
      city: '',
      venueName: '',
      targetCapacity: '500',
      isActive: false,
      startDate: '',
      endDate: '',
    })
    await load()
  }

  async function toggleRegionActive(region: RolloutRegionRow) {
    await campaignAdminUpdateRolloutRegion(region.id, { isActive: !region.isActive })
    await load()
  }

  return (
    <AdminPageShell
      title="National rollout"
      breadcrumbs={[{ label: 'Campaigns', href: '/admin/campaigns' }, { label: 'Rollout' }]}
    >
      {error ? <div className="alert alert-danger">{error}</div> : null}
      {loading ? <p className="text-muted">Loading rollout phases…</p> : null}

      {!loading &&
        phases.map((phase) => (
          <div key={phase.id} className="card mb-4">
            <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div>
                <strong>{phase.name}</strong>
                <span className="badge bg-secondary ms-2">{phase.phaseCode}</span>
                <span className={`badge ms-1 ${phase.status === 'ACTIVE' ? 'bg-success' : 'bg-light text-dark'}`}>
                  {phase.status}
                </span>
              </div>
              <div className="btn-group btn-group-sm">
                {phase.status !== 'ACTIVE' ? (
                  <button type="button" className="btn btn-outline-success" onClick={() => setPhaseStatus(phase, 'ACTIVE')}>
                    Activate
                  </button>
                ) : (
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setPhaseStatus(phase, 'PLANNED')}>
                    Set planned
                  </button>
                )}
                <button type="button" className="btn btn-outline-primary" onClick={() => setPhaseStatus(phase, 'COMPLETED')}>
                  Complete
                </button>
              </div>
            </div>
            <div className="card-body">
              <p className="small text-muted mb-2">{phase.description}</p>
              <p className="small mb-3">
                Nationwide goal (phase): <strong>{phase.nationwideGoalPets}</strong> cats
              </p>
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>City / venue</th>
                      <th>Capacity</th>
                      <th>Booked</th>
                      <th>Dates</th>
                      <th>Active</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {(phase.regions ?? []).map((r) => (
                      <tr key={r.id}>
                        <td>
                          {r.city || '—'}
                          {r.venueName ? <span className="text-muted d-block small">{r.venueName}</span> : null}
                        </td>
                        <td>{r.targetCapacity}</td>
                        <td>
                          {r.bookedCount ?? 0}
                          {r.targetCapacity > 0 ? (
                            <div className="progress mt-1" style={{ height: 4 }}>
                              <div
                                className="progress-bar"
                                style={{
                                  width: `${Math.min(100, Math.round(((r.bookedCount ?? 0) / r.targetCapacity) * 100))}%`,
                                }}
                              />
                            </div>
                          ) : null}
                        </td>
                        <td className="small">
                          {r.startDate ? String(r.startDate).slice(0, 10) : '—'} →{' '}
                          {r.endDate ? String(r.endDate).slice(0, 10) : '—'}
                        </td>
                        <td>{r.isActive ? <span className="badge bg-success">Yes</span> : <span className="badge bg-secondary">No</span>}</td>
                        <td>
                          <button type="button" className="btn btn-link btn-sm p-0" onClick={() => toggleRegionActive(r)}>
                            {r.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}

      <div className="card">
        <div className="card-header">Add rollout region</div>
        <div className="card-body">
          <form className="row g-3" onSubmit={addRegion}>
            <div className="col-md-4">
              <label className="form-label">Phase</label>
              <select
                className="form-select"
                value={regionForm.phaseId}
                onChange={(e) => setRegionForm((f) => ({ ...f, phaseId: e.target.value }))}
                required
              >
                <option value="">Select phase…</option>
                {phases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Division</label>
              <select
                className="form-select"
                value={regionForm.divisionId}
                onChange={(e) =>
                  setRegionForm((f) => ({ ...f, divisionId: e.target.value, districtId: '', upazilaId: '' }))
                }
              >
                <option value="">Optional</option>
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nameEn}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">District</label>
              <select
                className="form-select"
                value={regionForm.districtId}
                onChange={(e) =>
                  setRegionForm((f) => ({ ...f, districtId: e.target.value, upazilaId: '' }))
                }
                disabled={!regionForm.divisionId}
              >
                <option value="">Optional</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nameEn}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Upazila</label>
              <select
                className="form-select"
                value={regionForm.upazilaId}
                onChange={(e) => setRegionForm((f) => ({ ...f, upazilaId: e.target.value }))}
                disabled={!regionForm.districtId}
              >
                <option value="">Optional</option>
                {upazilas.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nameEn}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">City</label>
              <input
                className="form-control"
                value={regionForm.city}
                onChange={(e) => setRegionForm((f) => ({ ...f, city: e.target.value }))}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Venue</label>
              <input
                className="form-control"
                value={regionForm.venueName}
                onChange={(e) => setRegionForm((f) => ({ ...f, venueName: e.target.value }))}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Capacity</label>
              <input
                type="number"
                className="form-control"
                value={regionForm.targetCapacity}
                onChange={(e) => setRegionForm((f) => ({ ...f, targetCapacity: e.target.value }))}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Start</label>
              <input
                type="date"
                className="form-control"
                value={regionForm.startDate}
                onChange={(e) => setRegionForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">End</label>
              <input
                type="date"
                className="form-control"
                value={regionForm.endDate}
                onChange={(e) => setRegionForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
            <div className="col-md-12 form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="region-active"
                checked={regionForm.isActive}
                onChange={(e) => setRegionForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              <label className="form-check-label" htmlFor="region-active">
                Active (booking open)
              </label>
            </div>
            <div className="col-12">
              <button type="submit" className="btn btn-primary">
                Add region
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminPageShell>
  )
}
