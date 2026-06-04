'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { ApexOptions } from 'apexcharts'
import Link from 'next/link'
import DataTable from '@/src/bpa/admin/components/DataTable'
import ErrorState from '@/src/bpa/admin/components/ErrorState'
import CampaignExportButtons from '@/src/bpa/campaign/admin/CampaignExportButtons'
import CampaignTrendChart from '@/src/bpa/campaign/admin/CampaignTrendChart'
import {
  campaignAdminDailySummary,
  campaignAdminExportAnalytics,
  campaignAdminExportBookings,
  campaignAdminStats,
  campaignAdminVaccinationStats,
  type CampaignExportFormat,
  type CampaignStats,
  type VaccinationStats,
} from '@/lib/campaignApi'

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false })

const REPORT_TYPES = [
  { id: 'summary', label: 'Summary', load: (id: number) => campaignAdminStats(id) },
  { id: 'daily', label: 'Daily summary', load: (id: number, date: string) => campaignAdminDailySummary(id, date) },
  { id: 'vaccine', label: 'Vaccine usage', load: (id: number) => campaignAdminVaccinationStats(id) },
] as const

function VaccinePieChart({ stats }: { stats: VaccinationStats }) {
  const data = stats.byVaccineType ?? []
  if (!data.length) return <p className="text-muted small">No vaccine breakdown yet.</p>
  const options: ApexOptions = {
    chart: { type: 'donut' },
    labels: data.map((d) => d.name),
    legend: { position: 'bottom' },
    colors: ['#405189', '#0ab39c', '#f7b84b', '#f06548'],
  }
  return <ReactApexChart options={options} series={data.map((d) => Number(d.count))} type="donut" height={280} />
}

type Props = { campaignId: number }

export default function CampaignReportsPanel({ campaignId }: Props) {
  const [stats, setStats] = useState<CampaignStats | null>(null)
  const [vax, setVax] = useState<VaccinationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reportType, setReportType] = useState<(typeof REPORT_TYPES)[number]['id']>('summary')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [report, setReport] = useState<unknown>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState('')

  const load = useCallback(async () => {
    if (!Number.isFinite(campaignId)) return
    setLoading(true)
    setError('')
    try {
      const [s, v] = await Promise.all([campaignAdminStats(campaignId), campaignAdminVaccinationStats(campaignId)])
      setStats(s)
      setVax(v)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    load()
  }, [load])

  async function generateReport() {
    setReportLoading(true)
    setReportError('')
    setReport(null)
    try {
      if (reportType === 'daily') {
        setReport(await campaignAdminDailySummary(campaignId, date))
      } else if (reportType === 'summary') {
        setReport(await campaignAdminStats(campaignId))
      } else {
        setReport(await campaignAdminVaccinationStats(campaignId))
      }
    } catch (e) {
      setReportError(e instanceof Error ? e.message : 'Report failed')
    } finally {
      setReportLoading(false)
    }
  }

  function downloadJson() {
    if (!report) return
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `campaign-${campaignId}-${reportType}-report.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const statusRows = vax
    ? [
        { id: 'pending', status: 'Pending', count: vax.pending ?? 0 },
        { id: 'completed', status: 'Completed', count: vax.completed ?? 0 },
        { id: 'deferred', status: 'Deferred', count: vax.deferred ?? 0 },
        { id: 'skipped', status: 'Skipped', count: vax.skipped ?? 0 },
      ]
    : []

  if (error) return <ErrorState message={error} onRetry={load} />
  if (loading) return <p className="text-muted">Loading reports…</p>

  return (
    <div>
      <p className="text-muted small mb-3">
        Merged campaign statistics and on-demand reports (formerly separate Statistics and Reports pages).
      </p>

      {stats && vax ? (
        <>
          <div className="row g-3 mb-4">
            {[
              { label: 'Bookings', value: stats.totalBookings },
              { label: 'Cats registered', value: vax.total },
              { label: 'Vaccinated', value: vax.completed ?? stats.totalVaccinations },
              { label: 'Completion %', value: `${stats.completionRate}%` },
            ].map((c) => (
              <div className="col-sm-6 col-lg-3" key={c.label}>
                <div className="card border-0 shadow-sm">
                  <div className="card-body">
                    <p className="text-muted small mb-1">{c.label}</p>
                    <h3 className="mb-0">{c.value}</h3>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="row g-3 mb-4">
            <div className="col-lg-7">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-transparent">
                  <h5 className="mb-0">Booking trend</h5>
                </div>
                <div className="card-body">
                  <CampaignTrendChart stats={stats} />
                </div>
              </div>
            </div>
            <div className="col-lg-5">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-transparent">
                  <h5 className="mb-0">By vaccine type</h5>
                </div>
                <div className="card-body">
                  <VaccinePieChart stats={vax} />
                </div>
              </div>
            </div>
          </div>

          <DataTable
            columns={[
              { key: 'status', label: 'Pet status', render: (r) => r.status },
              { key: 'count', label: 'Count', render: (r) => r.count },
            ]}
            rows={statusRows}
            keyField="id"
          />
        </>
      ) : null}

      <hr className="my-4" />

      <h5 className="mb-3">On-demand reports</h5>
      <div className="d-flex flex-wrap gap-2 mb-3">
        {REPORT_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn btn-sm ${reportType === t.id ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setReportType(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {reportType === 'daily' ? (
        <div className="mb-3">
          <label className="form-label">Date</label>
          <input type="date" className="form-control w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      ) : null}
      <button type="button" className="btn btn-primary mb-3" disabled={reportLoading} onClick={generateReport}>
        {reportLoading ? 'Generating…' : 'Generate report'}
      </button>
      {reportError ? <div className="alert alert-danger">{reportError}</div> : null}
      {report ? (
        <>
          <button type="button" className="btn btn-outline-secondary btn-sm mb-2" onClick={downloadJson}>
            Download JSON
          </button>
          <pre className="border rounded p-3 bg-light small" style={{ maxHeight: 360, overflow: 'auto' }}>
            {JSON.stringify(report, null, 2)}
          </pre>
        </>
      ) : null}

      <hr className="my-4" />

      <h5 className="mb-3">Exports</h5>
      <div className="row g-3">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h6 className="card-title">Booking export</h6>
              <p className="small text-muted mb-2">CSV, XLSX, or PDF — up to 25,000 rows.</p>
              <CampaignExportButtons
                onExport={(format: CampaignExportFormat) => campaignAdminExportBookings(campaignId, format)}
              />
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h6 className="card-title">Analytics export</h6>
              <p className="small text-muted mb-2">Payment summary, locations, and rollout regions.</p>
              <CampaignExportButtons
                onExport={(format: CampaignExportFormat) => campaignAdminExportAnalytics(campaignId, format)}
              />
            </div>
          </div>
        </div>
      </div>
      <p className="small text-muted mt-2 mb-0">
        Filtered booking exports are available on the{' '}
        <Link href={`/admin/campaigns/${campaignId}/bookings`}>Bookings</Link> page.
      </p>
    </div>
  )
}
