'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import DataTable from '@/src/bpa/admin/components/DataTable'
import AdminFiltersBar from '@/src/bpa/admin/components/AdminFiltersBar'
import { PaginationBar } from '@/src/components/common/PaginationBar'
import CampaignExportButtons from '@/src/bpa/campaign/admin/CampaignExportButtons'
import { CAMPAIGN_SMS_TEMPLATES } from '@/src/bpa/campaign/admin/smsTemplates'
import {
  campaignAdminAnalytics,
  campaignAdminBookings,
  campaignAdminExportAnalytics,
  campaignAdminExportBookings,
  campaignAdminGet,
  campaignAdminList,
  campaignAdminRecoverStuckSms,
  campaignAdminSendBulkSms,
  campaignAdminSmsCostSummary,
  campaignAdminSmsLogs,
  campaignAdminSmsTemplates,
  campaignCertificatePdfUrl,
  campaignPublicCertificate,
  type CampaignAnalyticsData,
  type CampaignBookingRow,
  type CampaignExportFormat,
  type CampaignSmsCostSummary,
  type CampaignSmsLogRow,
  type CampaignSummary,
} from '@/lib/campaignApi'
import { adminSmsGatewayTest } from '@/lib/smsApi'
import { normalizeBangladeshPhone } from '@/lib/phone'

type HubTab = 'analytics' | 'export' | 'sms' | 'certificates'

type CertRow = {
  id: string
  bookingRef: string
  petName: string
  token: string
}

type Props = { campaignId: number }

function fmt(n: number) {
  return new Intl.NumberFormat('en-BD').format(n)
}

function bdt(n: number) {
  return `৳${fmt(n)}`
}

function fmtBdt(n: number) {
  return `৳${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 2 }).format(n)}`
}

export default function CampaignOperationsCenter({ campaignId }: Props) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const initialTab: HubTab =
    tabParam === 'export' || tabParam === 'sms' || tabParam === 'certificates' ? tabParam : 'analytics'
  const [tab, setTab] = useState<HubTab>(initialTab)

  const [analytics, setAnalytics] = useState<CampaignAnalyticsData | null>(null)
  const [topCampaigns, setTopCampaigns] = useState<CampaignSummary[]>([])
  const [locations, setLocations] = useState<Array<{ id: number; name: string }>>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [error, setError] = useState('')

  const [exportStatus, setExportStatus] = useState('')
  const [exportDate, setExportDate] = useState('')
  const [exportLocationId, setExportLocationId] = useState('')

  const [smsMessage, setSmsMessage] = useState('')
  const [smsSendToAll, setSmsSendToAll] = useState(true)
  const [smsStatus, setSmsStatus] = useState('')
  const [smsDate, setSmsDate] = useState('')
  const [smsLocationIds, setSmsLocationIds] = useState<number[]>([])
  const [smsPhones, setSmsPhones] = useState('')
  const [smsBusy, setSmsBusy] = useState(false)
  const [smsResult, setSmsResult] = useState('')
  const [smsLogs, setSmsLogs] = useState<CampaignSmsLogRow[]>([])
  const [smsLogPage, setSmsLogPage] = useState(1)
  const [smsLogTotal, setSmsLogTotal] = useState(0)
  const [smsLogTotalPages, setSmsLogTotalPages] = useState(1)
  const [smsCost, setSmsCost] = useState<CampaignSmsCostSummary | null>(null)
  const [smsLogLoading, setSmsLogLoading] = useState(false)
  const [smsTestPhone, setSmsTestPhone] = useState('')
  const [smsTestBusy, setSmsTestBusy] = useState(false)
  const [smsTestResult, setSmsTestResult] = useState('')

  const [certRows, setCertRows] = useState<CertRow[]>([])
  const [certSearch, setCertSearch] = useState('')
  const [certLoading, setCertLoading] = useState(false)
  const [certPreview, setCertPreview] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    setTab(initialTab)
  }, [initialTab])

  const loadAnalytics = useCallback(async () => {
    if (!Number.isFinite(campaignId)) return
    setAnalyticsLoading(true)
    setError('')
    try {
      const [a, list, detail] = await Promise.all([
        campaignAdminAnalytics(campaignId),
        campaignAdminList({ pageSize: 50 }),
        campaignAdminGet(campaignId),
      ])
      setAnalytics(a)
      const ranked = [...(list.campaigns ?? [])].sort(
        (x, y) => (y._count?.bookings ?? 0) - (x._count?.bookings ?? 0)
      )
      setTopCampaigns(ranked.slice(0, 10))
      setLocations(
        (detail.locations ?? [])
          .filter((l) => l.isActive !== false)
          .map((l) => ({ id: l.id, name: l.name }))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load operations data')
    } finally {
      setAnalyticsLoading(false)
    }
  }, [campaignId])

  const loadSmsLogs = useCallback(async () => {
    if (!Number.isFinite(campaignId)) return
    setSmsLogLoading(true)
    try {
      const res = await campaignAdminSmsLogs(campaignId, { page: smsLogPage, pageSize: 15 })
      setSmsLogs(res.items ?? [])
      setSmsLogTotal(res.total ?? 0)
      setSmsLogTotalPages(res.totalPages ?? 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load SMS logs')
    } finally {
      setSmsLogLoading(false)
    }
  }, [campaignId, smsLogPage])

  const loadCerts = useCallback(async () => {
    setCertLoading(true)
    setError('')
    try {
      const { items } = await campaignAdminBookings(campaignId, { page: 1, pageSize: 100, status: 'COMPLETED' })
      const certs: CertRow[] = []
      for (const b of items) {
        for (const p of b.pets ?? []) {
          if (p.certificateToken) {
            certs.push({
              id: `${b.bookingRef}-${p.id}`,
              bookingRef: b.bookingRef,
              petName: p.name,
              token: p.certificateToken,
            })
          }
        }
      }
      setCertRows(certs)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load certificates')
    } finally {
      setCertLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  useEffect(() => {
    if (tab === 'sms') {
      loadSmsLogs()
      campaignAdminSmsCostSummary(campaignId).then(setSmsCost).catch(() => setSmsCost(null))
      campaignAdminSmsTemplates(campaignId).catch(() => undefined)
    }
    if (tab === 'certificates') loadCerts()
  }, [tab, loadSmsLogs, loadCerts, campaignId])

  const filteredCerts = useMemo(() => {
    if (!certSearch.trim() || certPreview) return certRows
    const q = certSearch.toUpperCase()
    return certRows.filter((r) => r.bookingRef.includes(q) || r.token.toUpperCase().includes(q))
  }, [certRows, certSearch, certPreview])

  function toggleSmsLocation(id: number) {
    setSmsLocationIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function runBulkSms(dryRun: boolean) {
    setSmsBusy(true)
    setSmsResult('')
    setError('')
    try {
      const phones = smsPhones
        .split(/[\n,;]+/)
        .map((p) => p.trim())
        .filter(Boolean)
      const useManualPhones = phones.length > 0
      const result = await campaignAdminSendBulkSms(campaignId, {
        message: smsMessage,
        phones: useManualPhones ? phones : undefined,
        sendToAll: useManualPhones ? undefined : smsSendToAll,
        bookingStatus: useManualPhones || smsSendToAll ? undefined : smsStatus || undefined,
        locationIds:
          useManualPhones || smsSendToAll ? undefined : smsLocationIds.length ? smsLocationIds : undefined,
        bookingDate: useManualPhones || smsSendToAll ? undefined : smsDate || undefined,
        dryRun,
      })
      setSmsResult(
        dryRun
          ? `Preview: ${result.recipientCount} recipient(s)`
          : `Queued: ${result.queued}, failed: ${result.failed}${result.errors.length ? ` — ${result.errors.slice(0, 3).join('; ')}` : ''}`
      )
      if (!dryRun) loadSmsLogs()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk SMS failed')
    } finally {
      setSmsBusy(false)
    }
  }

  async function lookupCert() {
    setError('')
    setCertPreview(null)
    setCertLoading(true)
    try {
      const q = certSearch.trim()
      if (/^CERT-/i.test(q)) {
        const data = await campaignPublicCertificate(q)
        setCertPreview({ ...(data as Record<string, unknown>), token: q })
        return
      }
      const ref = q.toUpperCase()
      const { items } = await campaignAdminBookings(campaignId, { page: 1, pageSize: 100 })
      const match = items.find((b: CampaignBookingRow) => b.bookingRef === ref)
      const token = match?.pets?.find((p) => p.certificateToken)?.certificateToken
      if (!token) {
        setError('No certificate found for this booking reference.')
        return
      }
      const data = await campaignPublicCertificate(token)
      setCertPreview({ ...(data as Record<string, unknown>), token })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lookup failed')
    } finally {
      setCertLoading(false)
    }
  }

  const hubTabs: { id: HubTab; label: string }[] = [
    { id: 'analytics', label: 'Analytics' },
    { id: 'export', label: 'Export' },
    { id: 'sms', label: 'SMS' },
    { id: 'certificates', label: 'Certificates' },
  ]

  return (
    <div className="campaign-operations-center">
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body py-3">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div>
              <h6 className="mb-1">Operations workflow</h6>
              <p className="text-muted small mb-0">
                Review analytics, export data, message pet owners, and manage certificates in one place.
              </p>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setTab('export')}>
                Export data
              </button>
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setTab('sms')}>
                Send SMS
              </button>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTab('certificates')}>
                Certificates
              </button>
            </div>
          </div>
        </div>
      </div>

      <ul className="nav nav-pills mb-3 flex-wrap gap-1">
        {hubTabs.map((t) => (
          <li key={t.id} className="nav-item">
            <Link
              href={`/admin/campaigns/${campaignId}/operations-center?tab=${t.id}`}
              className={`nav-link ${tab === t.id ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault()
                setTab(t.id)
                window.history.replaceState(null, '', `/admin/campaigns/${campaignId}/operations-center?tab=${t.id}`)
              }}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>

      {error ? <div className="alert alert-danger small">{error}</div> : null}

      {tab === 'analytics' ? (
        <div>
          {analyticsLoading ? (
            <p className="text-muted">Loading analytics…</p>
          ) : analytics ? (
            <div className="row g-3">
              <div className="col-12 d-flex flex-wrap justify-content-between align-items-center gap-2">
                <h6 className="mb-0">Payment &amp; revenue</h6>
                <CampaignExportButtons
                  label="Export analytics"
                  onExport={(format: CampaignExportFormat) => campaignAdminExportAnalytics(campaignId, format)}
                />
              </div>
              <div className="col-md-4">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body text-center">
                    <div className="text-muted small">Revenue (collected)</div>
                    <div className="fs-4 fw-bold text-success">
                      {bdt(analytics.paymentAnalytics.revenue ?? analytics.paymentAnalytics.collectedRevenue)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body text-center">
                    <div className="text-muted small">Expected revenue</div>
                    <div className="fs-4 fw-bold text-primary">{bdt(analytics.paymentAnalytics.expectedRevenue)}</div>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body text-center">
                    <div className="text-muted small">Pending payments</div>
                    <div className="fs-4 fw-bold">{fmt(analytics.paymentAnalytics.pendingPayments)}</div>
                  </div>
                </div>
              </div>

              <div className="col-12">
                <h6 className="border-bottom pb-2">Payment split</h6>
                <div className="table-responsive card border-0 shadow-sm">
                  <table className="table table-sm table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Channel</th>
                        <th className="text-end">Count</th>
                        <th className="text-end">Amount (BDT)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(analytics.paymentAnalytics.paymentSplit ?? []).map((row) => (
                        <tr key={row.channel}>
                          <td>{row.channel}</td>
                          <td className="text-end">{fmt(row.count)}</td>
                          <td className="text-end">{bdt(row.amountBdt)}</td>
                        </tr>
                      ))}
                      {!analytics.paymentAnalytics.paymentSplit?.length ? (
                        <tr>
                          <td colSpan={3} className="text-center text-muted py-3">
                            No payment split data
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="col-12 col-lg-6">
                <h6 className="border-bottom pb-2">Top locations (this campaign)</h6>
                <div className="table-responsive card border-0 shadow-sm">
                  <table className="table table-sm mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th>Location</th>
                        <th className="text-end">Bookings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.topLocations.map((loc) => (
                        <tr key={loc.locationId}>
                          <td>{loc.rank}</td>
                          <td>{loc.locationName}</td>
                          <td className="text-end">{fmt(loc.totalBookings)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="col-12 col-lg-6">
                <h6 className="border-bottom pb-2">Top campaigns (network)</h6>
                <div className="table-responsive card border-0 shadow-sm">
                  <table className="table table-sm mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Campaign</th>
                        <th>Status</th>
                        <th className="text-end">Bookings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topCampaigns.map((c) => (
                        <tr key={c.id} className={c.id === campaignId ? 'table-primary' : undefined}>
                          <td>
                            {c.id === campaignId ? (
                              <strong>{c.name}</strong>
                            ) : (
                              <Link href={`/admin/campaigns/${c.id}/operations-center`}>{c.name}</Link>
                            )}
                          </td>
                          <td className="small">{c.status}</td>
                          <td className="text-end">{fmt(c._count?.bookings ?? 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="col-12">
                <h6 className="border-bottom pb-2">Bookings by location</h6>
                <DataTable
                  columns={[
                    { key: 'name', label: 'Location', render: (r) => r.locationName },
                    { key: 'bookings', label: 'Bookings', render: (r) => fmt(r.totalBookings) },
                    { key: 'cats', label: 'Cats', render: (r) => fmt(r.totalCats) },
                    { key: 'cap', label: 'Daily cap.', render: (r) => fmt(r.dailyCapacity) },
                    {
                      key: 'revenue',
                      label: 'Revenue (BDT)',
                      render: (r) => fmt(r.totalRevenue ?? 0),
                    },
                  ]}
                  rows={analytics.bookingsByLocation}
                  keyField="locationId"
                />
              </div>

              <div className="col-12">
                <h6 className="border-bottom pb-2">Revenue by location</h6>
                <DataTable
                  columns={[
                    { key: 'name', label: 'Location', render: (r) => r.locationName },
                    { key: 'bookings', label: 'Bookings', render: (r) => fmt(r.totalBookings) },
                    { key: 'cats', label: 'Cats', render: (r) => fmt(r.totalCats) },
                    {
                      key: 'revenue',
                      label: 'Revenue (BDT)',
                      render: (r) => fmt(r.totalRevenue ?? 0),
                    },
                  ]}
                  rows={analytics.revenueByLocation ?? []}
                  keyField="locationId"
                />
              </div>

              <div className="col-12">
                <h6 className="border-bottom pb-2">Bookings by area (BdArea)</h6>
                <DataTable
                  columns={[
                    { key: 'area', label: 'Area', render: (r) => r.areaName },
                    { key: 'zone', label: 'Zone', render: (r) => r.coverageZoneName || '—' },
                    { key: 'bookings', label: 'Bookings', render: (r) => fmt(r.totalBookings) },
                    { key: 'cats', label: 'Cats', render: (r) => fmt(r.totalCats) },
                    {
                      key: 'revenue',
                      label: 'Revenue (BDT)',
                      render: (r) => fmt(r.totalRevenue ?? 0),
                    },
                  ]}
                  rows={analytics.bookingsByBdArea ?? analytics.bookingsByArea ?? []}
                  keyField="bdAreaId"
                />
              </div>

              <div className="col-12">
                <h6 className="border-bottom pb-2">Bookings by coverage zone (Dhaka metro)</h6>
                <DataTable
                  columns={[
                    {
                      key: 'zone',
                      label: 'Coverage zone',
                      render: (r) =>
                        r.coverageZoneName ||
                        (r.bookingArea ? `Area: ${r.bookingArea}` : '—'),
                    },
                    { key: 'city', label: 'City', render: (r) => r.city || '—' },
                    { key: 'bookings', label: 'Bookings', render: (r) => fmt(r.totalBookings) },
                    { key: 'cats', label: 'Cats', render: (r) => fmt(r.totalCats) },
                    {
                      key: 'revenue',
                      label: 'Revenue (BDT)',
                      render: (r) => fmt(r.totalRevenue ?? 0),
                    },
                  ]}
                  rows={analytics.bookingsByCoverageZone}
                  keyField="rowKey"
                />
              </div>

              <div className="col-12 text-muted small text-end">
                Generated: {analytics.generatedAt ? new Date(analytics.generatedAt).toLocaleString() : '—'}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'export' ? (
        <div className="row g-4">
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-transparent">
                <h6 className="mb-0">Export bookings</h6>
              </div>
              <div className="card-body">
                <p className="small text-muted">Download booking rows as CSV, XLSX, or PDF.</p>
                <div className="row g-2 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small">Status</label>
                    <select className="form-select form-select-sm" value={exportStatus} onChange={(e) => setExportStatus(e.target.value)}>
                      <option value="">All</option>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CHECKED_IN">Checked in</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Booking date</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={exportDate}
                      onChange={(e) => setExportDate(e.target.value)}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small">Location</label>
                    <select
                      className="form-select form-select-sm"
                      value={exportLocationId}
                      onChange={(e) => setExportLocationId(e.target.value)}
                    >
                      <option value="">All locations</option>
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <CampaignExportButtons
                  label="Bookings"
                  onExport={(format) =>
                    campaignAdminExportBookings(campaignId, format, {
                      status: exportStatus || undefined,
                      date: exportDate || undefined,
                      locationId: exportLocationId ? Number(exportLocationId) : undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-transparent">
                <h6 className="mb-0">Export analytics snapshot</h6>
              </div>
              <div className="card-body">
                <p className="small text-muted">
                  Full analytics dashboard export (locations, zones, revenue, payment split).
                </p>
                <CampaignExportButtons
                  label="Analytics"
                  onExport={(format) => campaignAdminExportAnalytics(campaignId, format)}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'sms' ? (
        <div className="row g-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm border-start border-4 border-info">
              <div className="card-header bg-transparent">
                <h6 className="mb-0">SMS gateway test</h6>
              </div>
              <div className="card-body">
                <p className="small text-muted mb-3">
                  Send a test message via BulkSMSBD to verify credentials, queue, and delivery. Admin only.
                </p>
                <div className="row g-2 align-items-end">
                  <div className="col-md-5">
                    <label className="form-label small" htmlFor="sms-test-phone">
                      Phone number
                    </label>
                    <input
                      id="sms-test-phone"
                      type="tel"
                      className="form-control font-monospace"
                      placeholder="01701022277 or +880…"
                      value={smsTestPhone}
                      onChange={(e) => setSmsTestPhone(e.target.value)}
                    />
                  </div>
                  <div className="col-md-auto">
                    <button
                      type="button"
                      className="btn btn-info"
                      disabled={smsTestBusy || !smsTestPhone.trim()}
                      onClick={async () => {
                        setSmsTestBusy(true)
                        setSmsTestResult('')
                        try {
                          const phone = normalizeBangladeshPhone(smsTestPhone.trim())
                          const res = await adminSmsGatewayTest(phone)
                          const d = res.data
                          const lines = [
                            res.success ? 'Gateway: OK' : 'Gateway: FAILED',
                            d?.provider ? `Provider: ${d.provider}` : null,
                            d?.messageId ? `Message ID: ${d.messageId}` : null,
                            d?.logId != null ? `Log ID: ${d.logId}` : null,
                            d?.queued ? 'Queued: yes' : d?.queued === false ? 'Queued: no (direct send)' : null,
                            d?.error ? `Error: ${d.error}` : null,
                            res.error?.message ? `API: ${res.error.message}` : null,
                          ].filter(Boolean)
                          setSmsTestResult(lines.join('\n'))
                        } catch (e) {
                          setSmsTestResult(e instanceof Error ? e.message : 'Test failed')
                        } finally {
                          setSmsTestBusy(false)
                        }
                      }}
                    >
                      {smsTestBusy ? 'Sending…' : 'Send test SMS'}
                    </button>
                  </div>
                </div>
                {smsTestResult ? (
                  <pre className="small bg-light rounded p-3 mt-3 mb-0 font-monospace" style={{ whiteSpace: 'pre-wrap' }}>
                    {smsTestResult}
                  </pre>
                ) : null}
              </div>
            </div>
          </div>
          <div className="col-lg-7">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-transparent">
                <h6 className="mb-0">Send bulk SMS</h6>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">Audience</label>
                  <div className="d-flex flex-wrap gap-3">
                    <label className="form-check">
                      <input
                        type="radio"
                        className="form-check-input"
                        checked={smsSendToAll}
                        onChange={() => setSmsSendToAll(true)}
                      />
                      <span className="form-check-label">All bookings (non-cancelled)</span>
                    </label>
                    <label className="form-check">
                      <input
                        type="radio"
                        className="form-check-input"
                        checked={!smsSendToAll}
                        onChange={() => setSmsSendToAll(false)}
                      />
                      <span className="form-check-label">Filtered selection</span>
                    </label>
                  </div>
                </div>

                {!smsSendToAll ? (
                  <>
                    <div className="mb-3">
                      <label className="form-label small">Selected locations</label>
                      <div className="d-flex flex-wrap gap-2">
                        {locations.length === 0 ? (
                          <span className="text-muted small">No active locations</span>
                        ) : (
                          locations.map((l) => (
                            <label key={l.id} className="form-check form-check-inline border rounded px-2 py-1">
                              <input
                                type="checkbox"
                                className="form-check-input me-1"
                                checked={smsLocationIds.includes(l.id)}
                                onChange={() => toggleSmsLocation(l.id)}
                              />
                              <span className="form-check-label small">{l.name}</span>
                            </label>
                          ))
                        )}
                      </div>
                      <p className="text-muted small mb-0 mt-1">Leave unchecked to include all locations.</p>
                    </div>
                    <div className="row g-2 mb-3">
                      <div className="col-md-6">
                        <label className="form-label small">Selected status</label>
                        <select className="form-select form-select-sm" value={smsStatus} onChange={(e) => setSmsStatus(e.target.value)}>
                          <option value="">Any (non-cancelled)</option>
                          <option value="CONFIRMED">Confirmed</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CHECKED_IN">Checked in</option>
                          <option value="NO_SHOW">No show</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small">Selected date</label>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={smsDate}
                          onChange={(e) => setSmsDate(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                ) : null}

                <div className="mb-3">
                  <label className="form-label">Message *</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    maxLength={500}
                    value={smsMessage}
                    onChange={(e) => setSmsMessage(e.target.value)}
                    placeholder="Campaign announcement…"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small">Manual phone list (optional — overrides filters)</label>
                  <textarea
                    className="form-control font-monospace small"
                    rows={2}
                    value={smsPhones}
                    onChange={(e) => setSmsPhones(e.target.value)}
                    placeholder="017xxxxxxxx"
                  />
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <button type="button" className="btn btn-outline-primary btn-sm" disabled={smsBusy} onClick={() => runBulkSms(true)}>
                    Preview count
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={smsBusy || smsMessage.length < 3}
                    onClick={() => runBulkSms(false)}
                  >
                    Send SMS
                  </button>
                </div>
                {smsResult ? <div className="alert alert-success small mt-3 mb-0">{smsResult}</div> : null}
              </div>
            </div>
          </div>
          <div className="col-lg-5">
            {smsCost ? (
              <div className="card border-0 shadow-sm mb-3">
                <div className="card-body">
                  <h6 className="mb-2">SMS cost (period)</h6>
                  <div className="d-flex justify-content-between small">
                    <span>Sent</span>
                    <strong>{smsCost.totalSent}</strong>
                  </div>
                  <div className="d-flex justify-content-between small">
                    <span>Est. cost</span>
                    <strong>{fmtBdt(smsCost.estimatedCostBdt)}</strong>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Recent delivery log</h6>
                <button
                  type="button"
                  className="btn btn-outline-warning btn-sm"
                  onClick={async () => {
                    await campaignAdminRecoverStuckSms(campaignId)
                    loadSmsLogs()
                  }}
                >
                  Recover stuck
                </button>
              </div>
              <div className="card-body p-0">
                <DataTable
                  columns={[
                    { key: 'phone', label: 'Phone', render: (r) => r.phone },
                    { key: 'status', label: 'Status', render: (r) => r.status },
                    { key: 'queued', label: 'Queued', render: (r) => new Date(r.queuedAt).toLocaleString() },
                  ]}
                  rows={smsLogs}
                  loading={smsLogLoading}
                  keyField="id"
                />
                <div className="p-2">
                  <PaginationBar
                    page={smsLogPage}
                    pageSize={15}
                    total={smsLogTotal}
                    totalPages={smsLogTotalPages}
                    onPageChange={setSmsLogPage}
                  />
                </div>
              </div>
            </div>
            <p className="small text-muted mt-2">
              Templates: {CAMPAIGN_SMS_TEMPLATES.length} system defaults (ANNOUNCEMENT used for bulk).
            </p>
          </div>
        </div>
      ) : null}

      {tab === 'certificates' ? (
        <div>
          <AdminFiltersBar
            searchPlaceholder="Booking ref or CERT token…"
            searchValue={certSearch}
            onSearchChange={setCertSearch}
            filterValues={{}}
            onFilterChange={() => {}}
            onReset={() => setCertSearch('')}
            filters={[]}
          />
          <button type="button" className="btn btn-sm btn-primary mb-3" disabled={certLoading || !certSearch.trim()} onClick={lookupCert}>
            Lookup certificate
          </button>
          {certPreview ? (
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <h6 className="mb-2">Certificate preview</h6>
                <dl className="row small mb-3">
                  <dt className="col-sm-3">Pet</dt>
                  <dd className="col-sm-9">{String(certPreview.petName ?? '—')}</dd>
                  <dt className="col-sm-3">Token</dt>
                  <dd className="col-sm-9 font-monospace">{String(certPreview.token ?? '—')}</dd>
                </dl>
                <a
                  href={campaignCertificatePdfUrl(String(certPreview.token ?? ''))}
                  className="btn btn-sm btn-outline-primary"
                  target="_blank"
                  rel="noreferrer"
                >
                  Download PDF
                </a>
              </div>
            </div>
          ) : null}
          <DataTable
            columns={[
              { key: 'ref', label: 'Booking', render: (r: CertRow) => r.bookingRef },
              { key: 'pet', label: 'Pet', render: (r: CertRow) => r.petName },
              { key: 'token', label: 'Token', render: (r: CertRow) => <span className="font-monospace small">{r.token}</span> },
              {
                key: 'pdf',
                label: '',
                render: (r: CertRow) => (
                  <a href={campaignCertificatePdfUrl(r.token)} className="btn btn-sm btn-link" target="_blank" rel="noreferrer">
                    PDF
                  </a>
                ),
              },
            ]}
            rows={filteredCerts}
            loading={certLoading}
            keyField="id"
          />
        </div>
      ) : null}
    </div>
  )
}
