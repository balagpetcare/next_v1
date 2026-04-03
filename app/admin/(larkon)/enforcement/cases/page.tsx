'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import AdminFiltersBar from '@/src/bpa/admin/components/AdminFiltersBar'
import DataTable from '@/src/bpa/admin/components/DataTable'
import EmptyState from '@/src/bpa/admin/components/EmptyState'
import ErrorState from '@/src/bpa/admin/components/ErrorState'
import LoadingSkeleton from '@/src/bpa/admin/components/LoadingSkeleton'
import StatusChip from '@/src/bpa/admin/components/StatusChip'
import { PaginationBar } from '@/src/components/common/PaginationBar'
import {
  getEnforcementCasesStats,
  listEnforcementCases,
  type EnforcementCaseRow,
  type EnforcementCaseStats,
  type EnforcementCasesListPayload,
} from '@/src/bpa/admin/lib/governanceApi'

const ENTITY_TYPE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'CODE', label: 'Code' },
  { value: 'BATCH', label: 'Batch' },
  { value: 'PRODUCT', label: 'Product' },
  { value: 'ORG', label: 'Org' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'INVESTIGATING', label: 'Investigating' },
  { value: 'ACTIONED', label: 'Actioned' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'REJECTED', label: 'Rejected' },
]

const SEVERITY_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
]

const PAGE_SIZES = [10, 20, 50, 100]

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'secondary' {
  if (status === 'RESOLVED') return 'success'
  if (status === 'OPEN' || status === 'INVESTIGATING') return 'warning'
  if (status === 'REJECTED') return 'secondary'
  if (status === 'ACTIONED') return 'danger'
  return 'secondary'
}

export default function EnforcementCasesPage() {
  const [items, setItems] = useState<EnforcementCaseRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState<EnforcementCaseStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  const [filterEntityType, setFilterEntityType] = useState('')
  const [filterOrgId, setFilterOrgId] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSeverity, setFilterSeverity] = useState('')
  const [searchQ, setSearchQ] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listEnforcementCases({
        entityType: filterEntityType || undefined,
        orgId: filterOrgId.trim() || undefined,
        status: filterStatus || undefined,
        severity: filterSeverity || undefined,
        q: searchQ.trim() || undefined,
        page,
        limit,
      })
      const payload = res?.data as EnforcementCasesListPayload | undefined
      if (payload && typeof payload === 'object') {
        const list = Array.isArray(payload.data) ? payload.data : []
        setItems(list)
        setTotal(Number(payload.total) ?? 0)
        setPage(Number(payload.page) ?? 1)
        setLimit(Number(payload.limit) ?? limit)
        setTotalPages(Math.max(1, Number(payload.totalPages) ?? 1))
      } else {
        setItems([])
        setTotal(0)
        setTotalPages(1)
      }
    } catch (e) {
      const msg = (e as Error).message ?? 'Failed to load cases'
      setError(msg)
      setItems([])
      setTotal(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [filterEntityType, filterOrgId, filterStatus, filterSeverity, searchQ, page, limit])

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await getEnforcementCasesStats()
      const data = res?.data
      if (data && typeof data === 'object' && typeof (data as EnforcementCaseStats).total === 'number') {
        setStats(data as EnforcementCaseStats)
      } else {
        setStats(null)
      }
    } catch {
      setStats(null)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const resetFilters = () => {
    setFilterEntityType('')
    setFilterOrgId('')
    setFilterStatus('')
    setFilterSeverity('')
    setSearchQ('')
    setPage(1)
  }

  return (
    <AdminPageShell
      title="Trust & Safety cases"
      breadcrumbs={[
        { href: '/admin', label: 'Admin' },
        { label: 'Producer Governance' },
        { href: '/admin/enforcement', label: 'Enforcement' },
        { label: 'Cases' },
      ]}
      actions={
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <Link href="/admin/enforcement" className="btn btn-outline-secondary btn-sm">
            Incidents
          </Link>
          <Link href="/admin/approvals" className="btn btn-outline-secondary btn-sm">
            Approvals
          </Link>
          <Link href="/admin/batch-control" className="btn btn-outline-secondary btn-sm">
            Batch control
          </Link>
          <button type="button" className="btn btn-primary btn-sm" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      }
    >
      <p className="text-secondary small mb-3">
        Complaint cases: trace code → batch → product → org, add evidence, and apply enforcement actions (freeze, quarantine, suspend).
      </p>

      <div className="row g-2 mb-4">
        <div className="col-auto">
          <div className="card border-0 bg-light rounded-3 p-2 px-3">
            <span className="text-muted small">Total</span>
            <div className="fw-semibold">{statsLoading ? '—' : (stats?.total ?? 0)}</div>
          </div>
        </div>
        <div className="col-auto">
          <div className="card border-0 bg-light rounded-3 p-2 px-3">
            <span className="text-muted small">Open</span>
            <div className="fw-semibold text-warning">{statsLoading ? '—' : (stats?.open ?? 0)}</div>
          </div>
        </div>
        <div className="col-auto">
          <div className="card border-0 bg-light rounded-3 p-2 px-3">
            <span className="text-muted small">Investigating</span>
            <div className="fw-semibold">{statsLoading ? '—' : (stats?.investigating ?? 0)}</div>
          </div>
        </div>
        <div className="col-auto">
          <div className="card border-0 bg-light rounded-3 p-2 px-3">
            <span className="text-muted small">Critical</span>
            <div className="fw-semibold text-danger">{statsLoading ? '—' : (stats?.critical ?? 0)}</div>
          </div>
        </div>
      </div>

      <AdminFiltersBar
        searchPlaceholder="Case no, summary…"
        searchValue={searchQ}
        onSearchChange={setSearchQ}
        filterValues={{
          entityType: filterEntityType,
          orgId: filterOrgId,
          status: filterStatus,
          severity: filterSeverity,
        }}
        onFilterChange={(key, value) => {
          if (key === 'entityType') setFilterEntityType(value)
          else if (key === 'orgId') setFilterOrgId(value)
          else if (key === 'status') setFilterStatus(value)
          else if (key === 'severity') setFilterSeverity(value)
          setPage(1)
        }}
        onReset={resetFilters}
        filters={[
          {
            key: 'entityType',
            label: 'Entity',
            render: (val, onChange) => (
              <select
                id="admin-filter-entityType"
                className="form-select form-select-sm"
                style={{ minWidth: 100 }}
                value={val}
                onChange={(e) => onChange(e.target.value)}
              >
                {ENTITY_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ),
          },
          {
            key: 'status',
            label: 'Status',
            render: (val, onChange) => (
              <select
                id="admin-filter-status"
                className="form-select form-select-sm"
                style={{ minWidth: 120 }}
                value={val}
                onChange={(e) => onChange(e.target.value)}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ),
          },
          {
            key: 'severity',
            label: 'Severity',
            render: (val, onChange) => (
              <select
                id="admin-filter-severity"
                className="form-select form-select-sm"
                style={{ minWidth: 100 }}
                value={val}
                onChange={(e) => onChange(e.target.value)}
              >
                {SEVERITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ),
          },
          {
            key: 'orgId',
            label: 'Org ID',
            render: (val, onChange) => (
              <input
                type="text"
                className="form-control form-control-sm"
                style={{ width: 90 }}
                placeholder="Org ID"
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
          <DataTable<EnforcementCaseRow>
            columns={[
              { key: 'caseNo', label: 'Case', render: (r) => <Link href={`/admin/enforcement/cases/${r.id}`}>{r.caseNo}</Link> },
              { key: 'entityType', label: 'Entity' },
              { key: 'entityId', label: 'Entity ID' },
              {
                key: 'producerOrg',
                label: 'Producer',
                render: (r) =>
                  r.producerOrg ? (
                    <Link href={`/admin/producer-governance/${r.producerOrg.id}`}>{r.producerOrg.name}</Link>
                  ) : (
                    r.producerOrgId
                  ),
              },
              { key: 'status', label: 'Status', render: (r) => <StatusChip status={r.status} variant={statusVariant(r.status)} /> },
              { key: 'severity', label: 'Severity' },
              { key: 'summary', label: 'Summary', render: (r) => (r.summary?.length > 50 ? `${r.summary.slice(0, 50)}…` : r.summary ?? '—') },
              { key: 'createdAt', label: 'Created', render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—') },
            ]}
            rows={items}
            keyField="id"
            loading={loading}
            emptyState={<EmptyState title="No cases" description="No complaint cases match the filters." />}
          />
          <PaginationBar
            page={page}
            pageSize={limit}
            total={total}
            totalPages={totalPages}
            disabled={loading}
            onPageChange={setPage}
            className="mt-2 border-0 pt-2"
            ariaLabel="Enforcement cases pages"
            endBeforeNav={
              <label className="d-flex align-items-center gap-1 small text-muted mb-0">
                <span className="text-nowrap">Per page</span>
                <select
                  className="form-select form-select-sm"
                  style={{ width: 70 }}
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value))
                    setPage(1)
                  }}
                >
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            }
          />
        </>
      )}
    </AdminPageShell>
  )
}
