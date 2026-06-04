'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  campaignAdminAreaDemandDashboard,
  campaignAdminDemandIntelligence,
  campaignAdminNotifyPreRegistered,
  campaignAdminPreBookingDashboard,
  campaignAdminRolloutDemandReports,
  campaignAdminWaitingListDashboard,
  type DemandIntelligenceReport,
} from '@/lib/campaignApi'
import DemandForecastDashboard from '@/src/bpa/campaign/admin/demand-forecast/DemandForecastDashboard'

type HubTab = 'intelligence' | 'rollout-demand' | 'pre-reg'

type PreRegRow = {
  id: number
  phone: string
  catCount: number
  status: string
  districtId?: number
  upazilaId?: number
  createdAt?: string
}

type DemandReport = {
  mostRequestedDistricts?: Array<{
    districtName?: string
    divisionName?: string
    registrations: number
    estimatedCats: number
  }>
  mostRequestedCities?: Array<{
    cityName?: string
    registrations: number
    estimatedCats: number
  }>
  estimatedVaccineDemand?: number
  totalPreRegistrations?: number
}

type Props = { campaignId: number }

export default function CampaignDemandHub({ campaignId }: Props) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const initialTab: HubTab =
    tabParam === 'rollout-demand' || tabParam === 'pre-reg' ? tabParam : 'intelligence'
  const [tab, setTab] = useState<HubTab>(initialTab)

  const [intel, setIntel] = useState<DemandIntelligenceReport | null>(null)
  const [rolloutReport, setRolloutReport] = useState<DemandReport | null>(null)
  const [preData, setPreData] = useState<{ rows?: PreRegRow[]; byStatus?: unknown[] } | null>(null)
  const [areaDemand, setAreaDemand] = useState<unknown>(null)
  const [waiting, setWaiting] = useState<PreRegRow[]>([])
  const [preSubTab, setPreSubTab] = useState<'pre' | 'demand' | 'waiting'>('pre')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notifyMsg, setNotifyMsg] = useState('')

  useEffect(() => {
    setTab(initialTab)
  }, [initialTab])

  const loadIntel = useCallback(async () => {
    setIntel(await campaignAdminDemandIntelligence(campaignId))
  }, [campaignId])

  const loadRollout = useCallback(async () => {
    const data = await campaignAdminRolloutDemandReports(campaignId)
    setRolloutReport(data as DemandReport)
  }, [campaignId])

  const loadPreReg = useCallback(async () => {
    const [pre, area, wait] = await Promise.all([
      campaignAdminPreBookingDashboard(campaignId),
      campaignAdminAreaDemandDashboard(campaignId),
      campaignAdminWaitingListDashboard(campaignId),
    ])
    setPreData(pre as { rows?: PreRegRow[]; byStatus?: unknown[] })
    setAreaDemand(area)
    setWaiting(Array.isArray(wait) ? (wait as PreRegRow[]) : [])
  }, [campaignId])

  const load = useCallback(async () => {
    if (!Number.isFinite(campaignId)) return
    setLoading(true)
    setError('')
    try {
      await Promise.all([loadIntel(), loadRollout(), loadPreReg()])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load demand data')
    } finally {
      setLoading(false)
    }
  }, [campaignId, loadIntel, loadRollout, loadPreReg])

  useEffect(() => {
    load()
  }, [load])

  async function notifyAll() {
    setNotifyMsg('')
    try {
      const res = await campaignAdminNotifyPreRegistered(campaignId)
      setNotifyMsg(`Notified ${res.notified} pre-registered owner(s).`)
      await loadPreReg()
    } catch (e) {
      setNotifyMsg(e instanceof Error ? e.message : 'Notify failed')
    }
  }

  const preRows = preData?.rows ?? []

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <Link href={`/admin/campaigns/${campaignId}/rollout`} className="btn btn-sm btn-outline-primary">
          Manage rollout phases & regions
        </Link>
        <span className="text-muted small">National rollout operations</span>
      </div>

      <ul className="nav nav-tabs mb-3">
        {(
          [
            ['intelligence', 'Demand forecasting'],
            ['rollout-demand', 'Rollout demand'],
            ['pre-reg', 'Pre-registration insights'],
          ] as const
        ).map(([id, label]) => (
          <li className="nav-item" key={id}>
            <button
              type="button"
              className={`nav-link ${tab === id ? 'active' : ''}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>

      {error ? <div className="alert alert-danger">{error}</div> : null}
      {loading ? <p className="text-muted">Loading…</p> : null}

      {!loading && tab === 'intelligence' && intel ? <DemandForecastDashboard report={intel} /> : null}

      {!loading && tab === 'rollout-demand' && rolloutReport ? (
        <>
          <p className="text-muted small mb-3">Pre-registration–weighted demand snapshot (rollout reports API).</p>
          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <p className="text-muted small mb-1">Estimated vaccine demand (cats)</p>
                  <p className="h3 mb-0">{rolloutReport.estimatedVaccineDemand ?? 0}</p>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <p className="text-muted small mb-1">Total pre-registrations</p>
                  <p className="h3 mb-0">{rolloutReport.totalPreRegistrations ?? 0}</p>
                </div>
              </div>
            </div>
          </div>
          <h5 className="mb-2">Most requested districts</h5>
          <div className="table-responsive mb-4">
            <table className="table table-sm table-hover">
              <thead className="table-light">
                <tr>
                  <th>District</th>
                  <th>Division</th>
                  <th>Registrations</th>
                  <th>Est. cats</th>
                </tr>
              </thead>
              <tbody>
                {(rolloutReport.mostRequestedDistricts ?? []).slice(0, 20).map((d, i) => (
                  <tr key={i}>
                    <td>{d.districtName ?? '—'}</td>
                    <td>{d.divisionName ?? '—'}</td>
                    <td>{d.registrations}</td>
                    <td>{d.estimatedCats}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h5 className="mb-2">Most requested cities (upazilas)</h5>
          <div className="table-responsive">
            <table className="table table-sm table-hover">
              <thead className="table-light">
                <tr>
                  <th>Upazila</th>
                  <th>Registrations</th>
                  <th>Est. cats</th>
                </tr>
              </thead>
              <tbody>
                {(rolloutReport.mostRequestedCities ?? []).slice(0, 20).map((c, i) => (
                  <tr key={i}>
                    <td>{c.cityName ?? '—'}</td>
                    <td>{c.registrations}</td>
                    <td>{c.estimatedCats}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {!loading && tab === 'pre-reg' ? (
        <>
          <div className="d-flex flex-wrap gap-2 mb-3">
            {(
              [
                ['pre', 'Pre-booking'],
                ['demand', 'Area demand'],
                ['waiting', 'Waiting list'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`btn btn-sm ${preSubTab === id ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setPreSubTab(id)}
              >
                {label}
              </button>
            ))}
            <button type="button" className="btn btn-sm btn-outline-success ms-auto" onClick={notifyAll}>
              Notify waiting (SMS)
            </button>
          </div>
          {notifyMsg ? <div className="alert alert-info py-2">{notifyMsg}</div> : null}

          {preSubTab === 'pre' ? (
            <div className="table-responsive">
              <table className="table table-sm table-hover">
                <thead className="table-light">
                  <tr>
                    <th>Phone</th>
                    <th>Cats</th>
                    <th>Status</th>
                    <th>District</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {preRows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.phone}</td>
                      <td>{r.catCount}</td>
                      <td>
                        <span className="badge bg-secondary">{r.status}</span>
                      </td>
                      <td>{r.districtId ?? '—'}</td>
                      <td className="small">{r.createdAt ? String(r.createdAt).slice(0, 19) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {preSubTab === 'demand' ? (
            <pre className="border rounded p-3 bg-light small" style={{ maxHeight: 480, overflow: 'auto' }}>
              {JSON.stringify(areaDemand, null, 2)}
            </pre>
          ) : null}

          {preSubTab === 'waiting' ? (
            <div className="table-responsive">
              <table className="table table-sm table-hover">
                <thead className="table-light">
                  <tr>
                    <th>Phone</th>
                    <th>Cats</th>
                    <th>District</th>
                    <th>Upazila</th>
                    <th>Queued</th>
                  </tr>
                </thead>
                <tbody>
                  {waiting.map((r) => (
                    <tr key={r.id}>
                      <td>{r.phone}</td>
                      <td>{r.catCount}</td>
                      <td>{r.districtId ?? '—'}</td>
                      <td>{r.upazilaId ?? '—'}</td>
                      <td className="small">{r.createdAt ? String(r.createdAt).slice(0, 19) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}

      {!loading ? (
        <button type="button" className="btn btn-outline-secondary btn-sm mt-3" onClick={load}>
          Refresh all
        </button>
      ) : null}
    </div>
  )
}
