'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import AdminFiltersBar from '@/src/bpa/admin/components/AdminFiltersBar'
import DataTable from '@/src/bpa/admin/components/DataTable'
import EmptyState from '@/src/bpa/admin/components/EmptyState'
import ErrorState from '@/src/bpa/admin/components/ErrorState'
import LoadingSkeleton from '@/src/bpa/admin/components/LoadingSkeleton'
import { getGovernance } from '@/src/bpa/admin/lib/governanceApi'

type ReviewerStatRow = {
  reviewerId: number
  reviewerName: string
  assignedCount: number
  completedCount: number
  avgReviewTimeHours: number
  slaBreachedCount: number
  rejectionReasonsTop: string[]
}

const ENTITY_OPTIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'PRODUCT', label: 'Product' },
  { value: 'BATCH', label: 'Batch' },
]

export default function GovernanceAnalyticsPage() {
  const [items, setItems] = useState<ReviewerStatRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterEntityType, setFilterEntityType] = useState('ALL')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (filterDateFrom) params.set('dateFrom', filterDateFrom)
      if (filterDateTo) params.set('dateTo', filterDateTo)
      if (filterEntityType && filterEntityType !== 'ALL') params.set('entityType', filterEntityType)

      const res = await getGovernance<ReviewerStatRow[]>(`/admin/governance/reviewer-stats?${params}`)
      const data = res.data
      setItems(Array.isArray(data) ? data : [])
    } catch (e: unknown) {
      const msg = (e as Error)?.message ?? 'Failed to load reviewer stats'
      setError(typeof msg === 'string' && (msg.includes('403') || msg.toLowerCase().includes('permission')) ? 'No access.' : msg)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [filterDateFrom, filterDateTo, filterEntityType])

  useEffect(() => {
    load()
  }, [load])

  const resetFilters = () => {
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterEntityType('ALL')
  }

  return (
    <AdminPageShell
      title="Governance analytics"
      breadcrumbs={[{ href: '/admin', label: 'Admin' }, { label: 'Producer Governance' }, { label: 'Analytics' }]}
      actions={
        <div className="d-flex flex-wrap gap-2">
          <Link href="/admin/approvals" className="btn btn-outline-secondary btn-sm">Approvals</Link>
          <Link href="/admin/batch-control" className="btn btn-outline-secondary btn-sm">Batch control</Link>
          <button type="button" className="btn btn-primary btn-sm" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      }
    >
      <p className="text-secondary small mb-3">
        Reviewer stats: assigned count, completed count, average review time, SLA breached count, and top rejection reasons.
      </p>

      <AdminFiltersBar
        searchPlaceholder=""
        searchValue=""
        onSearchChange={() => {}}
        filterValues={{
          dateFrom: filterDateFrom,
          dateTo: filterDateTo,
          entityType: filterEntityType,
        }}
        onFilterChange={(key, value) => {
          if (key === 'dateFrom') setFilterDateFrom(value)
          if (key === 'dateTo') setFilterDateTo(value)
          if (key === 'entityType') setFilterEntityType(value)
        }}
        onReset={resetFilters}
        filters={[
          {
            key: 'dateFrom',
            label: 'From',
            render: (value, onChange) => (
              <input
                id="admin-filter-dateFrom"
                type="date"
                className="form-control form-control-sm"
                style={{ width: 130 }}
                value={value}
                onChange={(e) => onChange(e.target.value)}
              />
            ),
          },
          {
            key: 'dateTo',
            label: 'To',
            render: (value, onChange) => (
              <input
                id="admin-filter-dateTo"
                type="date"
                className="form-control form-control-sm"
                style={{ width: 130 }}
                value={value}
                onChange={(e) => onChange(e.target.value)}
              />
            ),
          },
          {
            key: 'entityType',
            label: 'Entity type',
            render: (value, onChange) => (
              <select
                id="admin-filter-entityType"
                className="form-select form-select-sm"
                style={{ width: 120 }}
                value={value}
                onChange={(e) => onChange(e.target.value)}
              >
                {ENTITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ),
          },
        ]}
      />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            {loading && !items.length ? (
              <div className="p-4"><LoadingSkeleton rows={5} /></div>
            ) : (
              <DataTable<ReviewerStatRow>
                keyField="reviewerId"
                loading={loading}
                rows={items}
                columns={[
                  { key: 'reviewerId', label: 'Reviewer ID', render: (r) => r.reviewerId },
                  { key: 'reviewerName', label: 'Name', render: (r) => r.reviewerName ?? `User ${r.reviewerId}` },
                  { key: 'assignedCount', label: 'Assigned', render: (r) => r.assignedCount },
                  { key: 'completedCount', label: 'Completed', render: (r) => r.completedCount },
                  { key: 'avgReviewTimeHours', label: 'Avg review (h)', render: (r) => r.avgReviewTimeHours },
                  { key: 'slaBreachedCount', label: 'SLA breached', render: (r) => r.slaBreachedCount },
                  {
                    key: 'rejectionReasonsTop',
                    label: 'Top rejection reasons',
                    render: (r) => (r.rejectionReasonsTop?.length ? r.rejectionReasonsTop.slice(0, 5).join('; ') : '—'),
                  },
                ]}
                emptyState={<EmptyState title="No reviewer stats" description="Adjust date range or entity type, or wait for approval activity." />}
              />
            )}
          </div>
        </div>
      )}
    </AdminPageShell>
  )
}
