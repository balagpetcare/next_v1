'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from "date-fns/format";
import { subDays } from "date-fns/subDays";
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import AdminFiltersBar from '@/src/bpa/admin/components/AdminFiltersBar'
import DataTable from '@/src/bpa/admin/components/DataTable'
import EmptyState from '@/src/bpa/admin/components/EmptyState'
import ErrorState from '@/src/bpa/admin/components/ErrorState'
import LoadingSkeleton from '@/src/bpa/admin/components/LoadingSkeleton'
import StatCard from '@/src/bpa/admin/components/StatCard'
import { getGovernance } from '@/src/bpa/admin/lib/governanceApi'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
} from 'recharts'

type Summary = {
  totalProducers: number
  activeProducers: number
  suspendedProducers: number
  pendingKYC: number
  approvedKYC: number
  rejectedKYC: number
  pendingApprovals: number
  totalProducts: number
  approvedProducts: number
  unapprovedProducts: number
  totalBatches: number
  printedBatches: number
  unprintedBatches: number
  printedCodesToday: number
  printedCodes7d: number
  printedCodes30d: number
  verifiedCodesToday: number
  verifiedCodes7d: number
  verifiedCodes30d: number
  verificationSuccessRate: number | null
  openIncidents: number
  resolvedIncidents: number
  lastUpdatedAt: string
}

type Trends = {
  verificationTrend: Array<{ date: string; verified: number }>
  approvalsTrend: Array<{ date: string; submitted: number; approved: number; rejected: number }>
  riskTrend: Array<{ date: string; suspensions: number; incidents: number }>
}

type TopProducer = {
  producerOrgId: number
  producerOrgName: string
  verified: number
  printed: number
}

type AlertsData = {
  pendingApprovals: Array<{ id: number; entityType: string; entityId: number; producerOrgId: number; producerOrgName?: string }>
  pendingKYC: Array<{ userId: number; producerOrgId?: number; producerOrgName?: string }>
  openIncidents: Array<{ id: number; caseNo: string; producerOrgId: number; producerOrgName?: string; severity: string }>
  lowVerificationRatioProducts: Array<{ productId: number; name: string; sku: string; printed: number; verified: number; producerOrgName?: string }>
  recentlyDeclined: Array<{ id: number; entityType: string; entityId: number; producerOrgId: number; producerOrgName?: string; reviewedAt: string }>
}

const PRESETS = [
  { key: '7', label: '7 days' },
  { key: '30', label: '30 days' },
  { key: '90', label: '90 days' },
]

function toYYYYMMDD(d: Date) {
  return format(d, 'yyyy-MM-dd')
}

export default function ProducerOverviewPage() {
  const router = useRouter()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [trends, setTrends] = useState<Trends | null>(null)
  const [topProducers, setTopProducers] = useState<TopProducer[]>([])
  const [alertsData, setAlertsData] = useState<AlertsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [datePreset, setDatePreset] = useState('30')
  const [dateFrom, setDateFrom] = useState(() => toYYYYMMDD(subDays(new Date(), 30)))
  const [dateTo, setDateTo] = useState(() => toYYYYMMDD(new Date()))

  const [codeSearch, setCodeSearch] = useState('')
  const goToCodeLookup = useCallback(() => {
    const code = codeSearch.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (code) router.push(`/admin/code-lookup?code=${encodeURIComponent(code)}`)
  }, [codeSearch, router])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('dateFrom', dateFrom)
      params.set('dateTo', dateTo)

      const [summaryRes, trendsRes, topRes, alertsRes] = await Promise.all([
        getGovernance<Summary>(`/admin/producer-overview/summary?${params}`),
        getGovernance<Trends>(`/admin/producer-overview/trends?${params}`),
        getGovernance<{ data: TopProducer[] }>(`/admin/producer-overview/top-producers?${params}&limit=10`),
        getGovernance<AlertsData>('/admin/producer-overview/alerts'),
      ])

      setSummary(summaryRes.data ?? null)
      setTrends(trendsRes.data ?? null)
      setTopProducers(Array.isArray(topRes.data) ? topRes.data : [])
      setAlertsData(alertsRes.data ?? null)
    } catch (e: unknown) {
      const msg = (e as Error)?.message ?? 'Failed to load producer overview'
      setError(typeof msg === 'string' && (msg.includes('403') || msg.toLowerCase().includes('permission')) ? 'No access.' : msg)
      setSummary(null)
      setTrends(null)
      setTopProducers([])
      setAlertsData(null)
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo])

  useEffect(() => {
    load()
  }, [load])

  const setPreset = (key: string) => {
    setDatePreset(key)
    const end = new Date()
    const start = subDays(end, parseInt(key, 10) || 30)
    setDateFrom(toYYYYMMDD(start))
    setDateTo(toYYYYMMDD(end))
  }

  const resetFilters = () => {
    setDatePreset('30')
    const end = new Date()
    setDateFrom(toYYYYMMDD(subDays(end, 30)))
    setDateTo(toYYYYMMDD(end))
  }

  return (
    <AdminPageShell
      title="Producer system overview"
      breadcrumbs={[{ href: '/admin', label: 'Admin' }, { label: 'Producer Governance' }, { label: 'Producer Overview' }]}
      actions={
        <div className="d-flex flex-wrap gap-2">
          <Link href="/admin/approvals" className="btn btn-outline-secondary btn-sm">Approvals</Link>
          <Link href="/admin/producer-governance" className="btn btn-outline-secondary btn-sm">Producers</Link>
          <Link href="/admin/enforcement/cases" className="btn btn-outline-secondary btn-sm">Enforcement</Link>
          <button type="button" className="btn btn-primary btn-sm" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      }
    >
      <p className="text-secondary small mb-3">
        System-wide health, risk, verification traffic, and compliance at a glance. Use date range for trends and top producers.
      </p>

      <div className="card mb-4 border-0 shadow-sm border-start border-4 border-primary bg-body-tertiary">
  <div className="card-body py-4 px-4">
    <div className="row align-items-center g-4">
      {/* Left: Title */}
      <div className="col-12 col-lg-4">
        <div className="d-flex align-items-start gap-3">
          <span className="d-inline-flex align-items-center justify-content-center rounded-3 bg-primary-subtle text-primary p-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
            </svg>
          </span>

          <div>
            <h6 className="mb-1 fw-semibold text-body">Code Lookup</h6>
            <p className="mb-0 small text-body-secondary">
              Trace code to producer, product, batch &amp; verification history.
            </p>
          </div>
        </div>
      </div>

      {/* Right: Search */}
      <div className="col-12 col-lg-8">
        <div className="d-flex flex-column gap-2">
          <div className="d-flex flex-column flex-md-row align-items-stretch gap-2">
            {/* Search Box */}
            <div className="flex-grow-1">
              <div className="input-group input-group-lg bg-white rounded-3 shadow-sm">
                <span className="input-group-text border-0 bg-transparent text-body-secondary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
                  </svg>
                </span>

                <input
                  type="text"
                  className="form-control border-0 bg-transparent"
                  placeholder="Enter code or serial (e.g. A1B2C3D4)"
                  value={codeSearch}
                  onChange={(e) =>
                    setCodeSearch(
                      e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
                    )
                  }
                  onKeyDown={(e) => e.key === "Enter" && goToCodeLookup()}
                  aria-label="Code or serial"
                />

                <button
                  type="button"
                  className="btn btn-primary px-4 fw-semibold rounded-2"
                  onClick={goToCodeLookup}
                  disabled={!codeSearch.trim()}
                >
                  Look up
                </button>
              </div>
            </div>

            {/* Secondary CTA */}
            <Link
              href="/admin/code-lookup"
              className="btn btn-outline-secondary btn-lg d-inline-flex align-items-center justify-content-center gap-2"
            >
              Open full page
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
                <path fillRule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z" />
                <path fillRule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z" />
              </svg>
            </Link>
          </div>

          {/* Helper */}
          <div className="small text-body-secondary">
            <kbd className="px-1 border rounded bg-body">Enter</kbd> to search · Alphanumeric only (A–Z, 0–9)
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
      <AdminFiltersBar
        showSearch={false}
        filterValues={{
          dateFrom,
          dateTo,
          preset: datePreset,
        }}
        onFilterChange={(key, value) => {
          if (key === 'dateFrom') setDateFrom(value)
          if (key === 'dateTo') setDateTo(value)
          if (key === 'preset') setPreset(value)
        }}
        onReset={resetFilters}
        filters={[
          {
            key: 'preset',
            label: 'Range',
            render: (value, onChange) => (
              <div className="d-flex gap-1">
                {PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    className={`btn btn-sm ${value === p.key ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => onChange(p.key)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            ),
          },
          {
            key: 'dateFrom',
            label: 'From',
            render: (val, onChange) => (
              <input
                id="admin-filter-dateFrom"
                type="date"
                className="form-control form-control-sm"
                style={{ width: 130 }}
                value={val}
                onChange={(e) => onChange(e.target.value)}
              />
            ),
          },
          {
            key: 'dateTo',
            label: 'To',
            render: (val, onChange) => (
              <input
                id="admin-filter-dateTo"
                type="date"
                className="form-control form-control-sm"
                style={{ width: 130 }}
                value={val}
                onChange={(e) => onChange(e.target.value)}
              />
            ),
          },
        ]}
      />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <>
          {loading && !summary ? (
            <div className="mb-4"><LoadingSkeleton rows={3} /></div>
          ) : summary ? (
            <>
              <div className="row g-3 mb-4">
                <div className="col-6 col-md-4 col-lg-2">
                  <StatCard title="Total producers" value={summary.totalProducers} href="/admin/producer-governance" />
                </div>
                <div className="col-6 col-md-4 col-lg-2">
                  <StatCard title="Active" value={summary.activeProducers} subtitle="Verified" />
                </div>
                <div className="col-6 col-md-4 col-lg-2">
                  <StatCard title="Suspended" value={summary.suspendedProducers} tone="danger" />
                </div>
                <div className="col-6 col-md-4 col-lg-2">
                  <StatCard title="KYC pending" value={summary.pendingKYC} tone="warning" href="/admin/verifications" />
                </div>
                <div className="col-6 col-md-4 col-lg-2">
                  <StatCard title="KYC approved" value={summary.approvedKYC} tone="primary" />
                </div>
                <div className="col-6 col-md-4 col-lg-2">
                  <StatCard title="KYC rejected" value={summary.rejectedKYC} tone="danger" />
                </div>
              </div>
              <div className="row g-3 mb-4">
                <div className="col-6 col-md-4 col-lg-2">
                  <StatCard title="Pending approvals" value={summary.pendingApprovals} href="/admin/approvals" tone="warning" />
                </div>
                <div className="col-6 col-md-4 col-lg-2">
                  <StatCard title="Products" value={summary.totalProducts} subtitle={`${summary.approvedProducts} approved`} />
                </div>
                <div className="col-6 col-md-4 col-lg-2">
                  <StatCard title="Batches" value={summary.totalBatches} subtitle={`${summary.printedBatches} printed`} />
                </div>
                <div className="col-6 col-md-4 col-lg-2">
                  <StatCard title="Printed (30d)" value={summary.printedCodes30d} subtitle="Codes" />
                </div>
                <div className="col-6 col-md-4 col-lg-2">
                  <StatCard title="Verified (30d)" value={summary.verifiedCodes30d} subtitle="Codes" />
                </div>
                <div className="col-6 col-md-4 col-lg-2">
                  <StatCard
                    title="Verify rate"
                    value={summary.verificationSuccessRate != null ? `${summary.verificationSuccessRate.toFixed(1)}%` : '—'}
                    subtitle="30d"
                  />
                </div>
              </div>
              <div className="row g-3 mb-4">
                <div className="col-6 col-md-4 col-lg-2">
                  <StatCard title="Incidents open" value={summary.openIncidents} href="/admin/enforcement/cases" tone="warning" />
                </div>
                <div className="col-6 col-md-4 col-lg-2">
                  <StatCard title="Incidents resolved" value={summary.resolvedIncidents} />
                </div>
              </div>
            </>
          ) : null}

          {!error && summary && (
            <>
              <div className="row g-3 mb-4">
                <div className="col-lg-8">
                  <div className="card h-100">
                    <div className="card-body">
                      <h6 className="mb-3">Verification trend</h6>
                      {!trends?.verificationTrend?.length ? (
                        <p className="text-muted small mb-0">No verification data in this range.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={280}>
                          <LineChart data={trends.verificationTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="verified" name="Verified" stroke="var(--bs-primary)" strokeWidth={2} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-lg-4">
                  <div className="card h-100">
                    <div className="card-body">
                      <h6 className="mb-3">Top producers by verification</h6>
                      {!topProducers.length ? (
                        <p className="text-muted small mb-0">No data in this range.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart
                            data={topProducers.map((p) => ({
                              name: p.producerOrgName?.slice(0, 14) || `Org ${p.producerOrgId}`,
                              verified: p.verified,
                              printed: p.printed,
                            }))}
                            layout="vertical"
                            margin={{ top: 5, right: 20, left: 60, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tick={{ fontSize: 10 }} />
                            <YAxis type="category" dataKey="name" width={58} tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="verified" name="Verified" fill="var(--bs-primary)" radius={[0, 2, 2, 0]} />
                            <Bar dataKey="printed" name="Printed" fill="var(--bs-secondary)" radius={[0, 2, 2, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-lg-6">
                  <div className="card h-100">
                    <div className="card-body">
                      <h6 className="mb-3">Approvals trend</h6>
                      {!trends?.approvalsTrend?.length ? (
                        <p className="text-muted small mb-0">No approval data in this range.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart data={trends.approvalsTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="submitted" name="Submitted" stackId="a" fill="var(--bs-warning)" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="approved" name="Approved" stackId="a" fill="var(--bs-success)" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="rejected" name="Rejected" stackId="a" fill="var(--bs-danger)" radius={[0, 2, 2, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="card h-100">
                    <div className="card-body">
                      <h6 className="mb-3">Risk / alerts trend</h6>
                      {!trends?.riskTrend?.length ? (
                        <p className="text-muted small mb-0">No risk data in this range.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={260}>
                          <ComposedChart data={trends.riskTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Legend />
                            <Area type="monotone" dataKey="incidents" name="Incidents" fill="var(--bs-danger)" fillOpacity={0.4} stroke="var(--bs-danger)" />
                            <Line type="monotone" dataKey="suspensions" name="Suspensions" stroke="var(--bs-warning)" strokeWidth={2} dot={{ r: 3 }} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-md-6 col-lg-3">
                  <div className="card h-100">
                    <div className="card-body">
                      <h6 className="mb-2 d-flex justify-content-between align-items-center">
                        <span>Pending approvals</span>
                        <Link href="/admin/approvals" className="btn btn-sm btn-outline-primary">View all</Link>
                      </h6>
                      {alertsData?.pendingApprovals?.length ? (
                        <ul className="list-unstyled small mb-0">
                          {alertsData.pendingApprovals.slice(0, 5).map((a) => (
                            <li key={a.id} className="py-1 border-bottom border-light">
                              <Link href={`/admin/approvals?entityType=${a.entityType}&entityId=${a.entityId}`}>
                                {a.entityType} #{a.entityId}
                              </Link>
                              {a.producerOrgName && <span className="text-muted"> · {a.producerOrgName}</span>}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted small mb-0">None</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-md-6 col-lg-3">
                  <div className="card h-100">
                    <div className="card-body">
                      <h6 className="mb-2 d-flex justify-content-between align-items-center">
                        <span>KYC pending</span>
                        <Link href="/admin/verifications" className="btn btn-sm btn-outline-primary">View all</Link>
                      </h6>
                      {alertsData?.pendingKYC?.length ? (
                        <ul className="list-unstyled small mb-0">
                          {alertsData.pendingKYC.slice(0, 5).map((k, i) => (
                            <li key={k.userId + (k.producerOrgId ?? 0) || i} className="py-1 border-bottom border-light">
                              {k.producerOrgName ?? `User ${k.userId}`}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted small mb-0">None</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-md-6 col-lg-3">
                  <div className="card h-100">
                    <div className="card-body">
                      <h6 className="mb-2 d-flex justify-content-between align-items-center">
                        <span>Open incidents</span>
                        <Link href="/admin/enforcement/cases" className="btn btn-sm btn-outline-primary">View all</Link>
                      </h6>
                      {alertsData?.openIncidents?.length ? (
                        <ul className="list-unstyled small mb-0">
                          {alertsData.openIncidents.slice(0, 5).map((c) => (
                            <li key={c.id} className="py-1 border-bottom border-light">
                              <Link href={`/admin/enforcement/cases/${c.id}`}>{c.caseNo}</Link>
                              {c.producerOrgName && <span className="text-muted"> · {c.producerOrgName}</span>}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted small mb-0">None</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-md-6 col-lg-3">
                  <div className="card h-100">
                    <div className="card-body">
                      <h6 className="mb-2">Low verification ratio</h6>
                      {alertsData?.lowVerificationRatioProducts?.length ? (
                        <ul className="list-unstyled small mb-0">
                          {alertsData.lowVerificationRatioProducts.slice(0, 5).map((p) => (
                            <li key={p.productId} className="py-1 border-bottom border-light">
                              <Link href={`/admin/producer-governance/products/${p.productId}`}>{p.sku || p.name}</Link>
                              <span className="text-muted"> {p.verified}/{p.printed}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted small mb-0">None</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {alertsData?.lowVerificationRatioProducts?.length ? (
                <div className="card border-0 shadow-sm">
                  <div className="card-body p-0">
                    <h6 className="card-title px-3 pt-3 mb-0">Products needing review (low verification ratio)</h6>
                    <DataTable
                      keyField="productId"
                      loading={false}
                      rows={alertsData.lowVerificationRatioProducts}
                      columns={[
                        { key: 'productId', label: 'ID', render: (r) => r.productId },
                        { key: 'name', label: 'Product', render: (r) => r.name },
                        { key: 'sku', label: 'SKU', render: (r) => r.sku },
                        { key: 'printed', label: 'Printed', render: (r) => r.printed },
                        { key: 'verified', label: 'Verified', render: (r) => r.verified },
                        {
                          key: 'link',
                          label: '',
                          render: (r) => (
                            <Link href={`/admin/producer-governance/products/${r.productId}`} className="btn btn-sm btn-outline-primary">
                              View
                            </Link>
                          ),
                        },
                      ]}
                      emptyState={<EmptyState title="No low-ratio products" />}
                    />
                  </div>
                </div>
              ) : null}
            </>
          )}
        </>
      )}
    </AdminPageShell>
  )
}
