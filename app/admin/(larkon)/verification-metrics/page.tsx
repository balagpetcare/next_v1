'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { apiGet } from '@/lib/api'

const ENTITY_TYPES = [
  { value: '', label: 'All' },
  { value: 'OWNER', label: 'Owner' },
  { value: 'ORGANIZATION', label: 'Organization' },
  { value: 'BRANCH', label: 'Branch' },
]

function qs(params: Record<string, string | number | undefined | null>) {
  const u = new URLSearchParams()
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null || v === '') continue
    u.set(k, String(v))
  }
  const s = u.toString()
  return s ? `?${s}` : ''
}

function StatCard({ title, value, subtitle }: { title: string; value: unknown; subtitle?: string }) {
  return (
    <div className="card radius-12 p-3">
      <div className="text-secondary small">{title}</div>
      <div className="fs-4 fw-bold lh-sm">{value != null ? String(value) : '—'}</div>
      {subtitle ? <div className="text-secondary small mt-1">{subtitle}</div> : null}
    </div>
  )
}

function formatEntityBreakdown(byEntityType: Record<string, number> | undefined) {
  if (!byEntityType) return '—'
  const parts = Object.entries(byEntityType)
    .filter(([, v]) => Number(v) > 0)
    .map(([k, v]) => `${k}: ${v}`)
  return parts.length ? parts.join(' · ') : '—'
}

function fmtWhen(s: string | undefined) {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleString()
  } catch {
    return String(s)
  }
}

function downloadCsv(filename: string, rows: Record<string, unknown>[], columns?: string[]) {
  try {
    const cols = columns?.length ? columns : Object.keys((rows?.[0] as object) || {})
    const escape = (v: unknown) => {
      if (v === null || v === undefined) return ''
      const s = String(v)
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
      return s
    }
    const lines = [cols.join(','), ...rows.map((r) => cols.map((c) => escape((r as Record<string, unknown>)?.[c])).join(','))]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || 'export.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (e) {
    alert((e as Error)?.message || 'Failed to export CSV')
  }
}

function entityLink(entityType: string, entityId: unknown) {
  if (!entityType || entityId === undefined || entityId === null) return '#'
  if (entityType === 'ORGANIZATION') return `/admin/organizations/${entityId}`
  if (entityType === 'BRANCH') return `/admin/branches/${entityId}`
  if (entityType === 'OWNER') return '/admin/users'
  return '#'
}

export default function VerificationMetricsPage() {
  const [days, setDays] = useState(7)
  const [entityType, setEntityType] = useState('')
  const [entityId, setEntityId] = useState('')
  const [limit, setLimit] = useState(50)
  const attemptsRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const [summary, setSummary] = useState<Record<string, unknown> | null>(null)
  const [timeseries, setTimeseries] = useState<{ day: string; count: number }[]>([])
  const [topEntities, setTopEntities] = useState<{ entityType: string; entityId: number; count: number }[]>([])
  const [attempts, setAttempts] = useState<Array<Record<string, unknown>>>([])

  const query = useMemo(() => ({ days, entityType, entityId }), [days, entityType, entityId])

  async function load() {
    setLoading(true)
    setErr('')
    try {
      const [s, ts, top, at] = await Promise.all([
        apiGet<{ data?: Record<string, unknown> }>(`/api/v1/admin/verification-metrics/summary${qs({ ...query, top: 10 })}`),
        apiGet<{ data?: { series?: { day: string; count: number }[] }; series?: { day: string; count: number }[] }>(`/api/v1/admin/verification-metrics/timeseries${qs(query)}`),
        apiGet<{ data?: { rows?: { entityType: string; entityId: number; count: number }[] }; rows?: { entityType: string; entityId: number; count: number }[] }>(`/api/v1/admin/verification-metrics/top-entities${qs({ ...query, limit: 10 })}`),
        apiGet<{ data?: unknown[] }>(`/api/v1/admin/verification-metrics/locked-update-attempts${qs({ ...query, limit })}`),
      ])

      setSummary((s as { data?: Record<string, unknown> })?.data ?? (s as Record<string, unknown>))
      const tsData = (ts as { data?: { series?: { day: string; count: number }[] } })?.data?.series ?? (ts as { series?: { day: string; count: number }[] })?.series ?? []
      setTimeseries(Array.isArray(tsData) ? tsData : [])
      const topData = (top as { data?: { rows?: { entityType: string; entityId: number; count: number }[] } })?.data?.rows ?? (top as { rows?: { entityType: string; entityId: number; count: number }[] })?.rows ?? []
      setTopEntities(Array.isArray(topData) ? topData : [])
      const atData = (at as { data?: unknown[] })?.data ?? at
      setAttempts(Array.isArray(atData) ? (atData as Array<Record<string, unknown>>) : [])
    } catch (e) {
      setErr((e as Error)?.message || 'Failed to load metrics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [days, entityType, entityId])

  const maxTs = useMemo(() => {
    const m = Math.max(0, ...(timeseries || []).map((x) => Number(x.count || 0)))
    return m || 1
  }, [timeseries])

  return (
    <div className="container-fluid py-3">
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3">
        <div>
          <h2 className="mb-1">Verification Monitoring</h2>
          <p className="text-secondary mb-0 small">
            Reads V3.5 metrics endpoints. Use this while you keep <code>VERIFICATION_HARD_LOCK=false</code>.
          </p>
        </div>

        <div className="d-flex gap-2 align-items-center flex-wrap">
          <div>
            <label className="small text-secondary d-block">Days</label>
            <select className="form-select form-select-sm" value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ width: 80 }}>
              {[7, 14, 30, 60, 90].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="small text-secondary d-block">Entity</label>
            <select className="form-select form-select-sm" value={entityType} onChange={(e) => setEntityType(e.target.value)} style={{ width: 130 }}>
              {ENTITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="small text-secondary d-block">Entity ID</label>
            <input className="form-control form-control-sm" value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="(optional)" style={{ width: 100 }} />
          </div>
          <div>
            <label className="small text-secondary d-block">Attempts</label>
            <select className="form-select form-select-sm" value={limit} onChange={(e) => setLimit(Number(e.target.value))} style={{ width: 70 }}>
              {[50, 100, 200].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary btn-sm" onClick={load} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => downloadCsv('verification-metrics-timeseries.csv', timeseries as unknown as Record<string, unknown>[], ['day', 'count'])}
            disabled={loading || !timeseries.length}
          >
            Export Timeseries CSV
          </button>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => downloadCsv('verification-metrics-top-entities.csv', topEntities as unknown as Record<string, unknown>[], ['entityType', 'entityId', 'count'])}
            disabled={loading || !topEntities.length}
          >
            Export Top Entities CSV
          </button>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => downloadCsv('verification-metrics-attempts.csv', attempts as unknown as Record<string, unknown>[], ['createdAt', 'entityType', 'entityId', 'userId', 'reason'])}
            disabled={loading || !attempts.length}
          >
            Export Attempts CSV
          </button>
        </div>
      </div>

      {err ? <div className="alert alert-danger">{err}</div> : null}

      <div className="row g-3 mb-3">
        <div className="col-12 col-md-4">
          <StatCard title="Total locked attempts" value={(summary?.total ?? summary?.totalAttempts) as number} />
        </div>
        <div className="col-12 col-md-4">
          <StatCard title="Unique entities" value={summary?.uniqueEntities as number} />
        </div>
        <div className="col-12 col-md-4">
          <StatCard title="Entity type breakdown" value={formatEntityBreakdown(summary?.byEntityType as Record<string, number>)} subtitle="Counts within selected window" />
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <div className="card radius-12 p-3">
            <h6 className="mb-1">Timeseries</h6>
            <p className="text-secondary small mb-2">Daily locked-update attempt counts</p>
            {(timeseries || []).length === 0 ? (
              <div className="text-secondary small">No data</div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {(timeseries || []).slice().reverse().map((row) => {
                  const c = Number(row.count || 0)
                  const w = Math.round((c / maxTs) * 100)
                  return (
                    <div key={row.day} className="d-flex align-items-center gap-2">
                      <div className="font-monospace small" style={{ minWidth: 110 }}>{row.day}</div>
                      <div className="flex-grow-1 bg-light rounded" style={{ height: 10, overflow: 'hidden' }}>
                        <div className="bg-dark h-100" style={{ width: `${w}%` }} />
                      </div>
                      <div className="fw-bold" style={{ minWidth: 40 }}>{c}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card radius-12 p-3">
            <h6 className="mb-1">Top entities</h6>
            <p className="text-secondary small mb-2">Entities with repeated locked attempts</p>
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Entity</th>
                    <th>ID</th>
                    <th className="text-end">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {(topEntities || []).length === 0 ? (
                    <tr><td colSpan={3} className="text-secondary">No data</td></tr>
                  ) : (
                    (topEntities || []).map((r, idx) => (
                      <tr key={`${r.entityType}-${r.entityId}-${idx}`} style={{ cursor: 'pointer' }} onClick={() => { setEntityType(r.entityType); setEntityId(String(r.entityId)); attemptsRef.current?.scrollIntoView({ behavior: 'smooth' }); }}>
                        <td>{r.entityType}</td>
                        <td><Link href={entityLink(r.entityType, r.entityId)} className="text-decoration-underline">{r.entityId}</Link></td>
                        <td className="text-end fw-bold">{r.count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div ref={attemptsRef} className="card radius-12 p-3 mt-3">
        <h6 className="mb-1">Recent locked update attempts</h6>
        <p className="text-secondary small mb-2">Last 50 attempts (newest first)</p>
        <div className="table-responsive">
          <table className="table table-sm mb-0">
            <thead>
              <tr>
                <th>When</th>
                <th>Entity</th>
                <th>Entity ID</th>
                <th>User</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {(attempts || []).length === 0 ? (
                <tr><td colSpan={5} className="text-secondary">No data</td></tr>
              ) : (
                (attempts || []).map((a, idx) => (
                  <tr key={String(a.id ?? idx)}>
                    <td className="font-monospace small">{fmtWhen(a.createdAt as string)}</td>
                    <td>{String(a.entityType ?? '')}</td>
                    <td><Link href={entityLink(a.entityType as string, a.entityId)} className="text-decoration-underline">{String(a.entityId ?? '')}</Link></td>
                    <td>{a.userId != null ? String(a.userId) : '—'}</td>
                    <td>{String(a.reason ?? '—')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="d-flex gap-2 mt-3">
        <Link href="/admin/verifications" className="btn btn-outline-secondary btn-sm">Back to Verifications</Link>
        <Link href="/admin/dashboard" className="btn btn-outline-secondary btn-sm">Dashboard</Link>
      </div>
    </div>
  )
}
