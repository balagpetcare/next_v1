'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import AdminFiltersBar from '@/src/bpa/admin/components/AdminFiltersBar'
import StatusChip from '@/src/bpa/admin/components/StatusChip'
import DataTable from '@/src/bpa/admin/components/DataTable'
import EmptyState from '@/src/bpa/admin/components/EmptyState'
import ErrorState from '@/src/bpa/admin/components/ErrorState'
import LoadingSkeleton from '@/src/bpa/admin/components/LoadingSkeleton'
import { getGovernance } from '@/src/bpa/admin/lib/governanceApi'
import { PaginationBar } from '@/src/components/common/PaginationBar'

type BatchRow = {
  id: number
  batchNo: string
  status: string
  frozenAt?: string | null
  qtyPlanned: number
  qtyGenerated: number
  createdAt: string
  authProduct?: { id: number; productName: string; sku: string; producerOrgId: number } | null
  producerOrg?: { id: number; name: string } | null
  approval?: { slaDeadline?: string | null; assignedToUserId?: number | null; status: string } | null
}

type ListPayload = {
  data: BatchRow[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'GENERATED', label: 'Generated' },
  { value: 'CODES_ALLOCATED', label: 'Codes allocated' },
  { value: 'PRINTED', label: 'Printed' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'VOIDED', label: 'Voided' },
  { value: 'ARCHIVED', label: 'Archived' },
]

const FROZEN_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'true', label: 'Frozen' },
  { value: 'false', label: 'Not frozen' },
]

const PAGE_SIZES = [10, 20, 50, 100]

export default function AdminBatchControlListPage() {
  const searchParams = useSearchParams()
  const urlProducerOrgId = searchParams?.get('producerOrgId') ?? ''

  const [items, setItems] = useState<BatchRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [filterProducerOrgId, setFilterProducerOrgId] = useState(urlProducerOrgId)
  const [filterProductId, setFilterProductId] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterFrozen, setFilterFrozen] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (filterProducerOrgId.trim()) params.set('producerOrgId', filterProducerOrgId.trim())
      if (filterProductId.trim()) params.set('productId', filterProductId.trim())
      if (filterStatus) params.set('status', filterStatus)
      if (filterFrozen === 'true' || filterFrozen === 'false') params.set('frozen', filterFrozen)
      if (filterDateFrom) params.set('dateFrom', filterDateFrom)
      if (filterDateTo) params.set('dateTo', filterDateTo)
      if (search.trim()) params.set('search', search.trim())
      params.set('page', String(page))
      params.set('limit', String(limit))

      const res = await getGovernance<ListPayload>(`/admin/batches?${params}`)
      const payload = res.data

      if (payload && typeof payload === 'object' && 'data' in payload) {
        const list = Array.isArray((payload as ListPayload).data) ? (payload as ListPayload).data : []
        setItems(list)
        setTotal(Number((payload as ListPayload).total) ?? 0)
        setPage(Number((payload as ListPayload).page) ?? 1)
        setLimit(Number((payload as ListPayload).limit) ?? limit)
        setTotalPages(Math.max(1, Number((payload as ListPayload).totalPages) ?? 1))
      } else {
        const fallback = Array.isArray(payload) ? payload : []
        setItems(fallback as BatchRow[])
        setTotal(fallback.length)
        setTotalPages(1)
      }
    } catch (e) {
      const msg = (e as Error).message ?? 'Failed to load batches'
      setError(typeof msg === 'string' && (msg.includes('403') || msg.toLowerCase().includes('permission')) ? 'No access. You do not have permission to view batches.' : msg)
      setItems([])
      setTotal(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [filterProducerOrgId, filterProductId, filterStatus, filterFrozen, filterDateFrom, filterDateTo, search, page, limit])

  useEffect(() => {
    setFilterProducerOrgId(urlProducerOrgId)
  }, [urlProducerOrgId])

  useEffect(() => {
    load()
  }, [load])

  const resetFilters = () => {
    setFilterProducerOrgId(urlProducerOrgId)
    setFilterProductId('')
    setFilterStatus('')
    setFilterFrozen('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setSearch('')
    setPage(1)
  }

  return (
    <AdminPageShell
      title="Batch control"
      breadcrumbs={[{ href: '/admin', label: 'Admin' }, { label: 'Producer Governance' }, { label: 'Batch Control' }]}
      actions={
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <Link href="/admin/approvals" className="btn btn-outline-secondary btn-sm">Approvals</Link>
          <Link href="/admin/producer-governance" className="btn btn-outline-secondary btn-sm">Producers</Link>
          <button type="button" className="btn btn-primary btn-sm" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      }
    >
      <p className="text-secondary small mb-3">
        List and manage batches. Filter by status, frozen state, producer, product, and date range.
      </p>

      <AdminFiltersBar
        searchPlaceholder="Batch ID, batch no, product name or SKU…"
        searchValue={search}
        onSearchChange={setSearch}
        filterValues={{
          producerOrgId: filterProducerOrgId,
          productId: filterProductId,
          status: filterStatus,
          frozen: filterFrozen,
          dateFrom: filterDateFrom,
          dateTo: filterDateTo,
        }}
        onFilterChange={(key, value) => {
          if (key === 'producerOrgId') setFilterProducerOrgId(value)
          if (key === 'productId') setFilterProductId(value)
          if (key === 'status') setFilterStatus(value)
          if (key === 'frozen') setFilterFrozen(value)
          if (key === 'dateFrom') setFilterDateFrom(value)
          if (key === 'dateTo') setFilterDateTo(value)
          setPage(1)
        }}
        onReset={resetFilters}
        filters={[
          {
            key: 'producerOrgId',
            label: 'Producer org ID',
            render: (value, onChange) => (
              <input
                id="admin-filter-producerOrgId"
                type="text"
                className="form-control form-control-sm"
                style={{ width: 100 }}
                placeholder="Org ID"
                value={value}
                onChange={(e) => onChange(e.target.value)}
              />
            ),
          },
          {
            key: 'productId',
            label: 'Product ID',
            render: (value, onChange) => (
              <input
                id="admin-filter-productId"
                type="text"
                className="form-control form-control-sm"
                style={{ width: 90 }}
                placeholder="Product ID"
                value={value}
                onChange={(e) => onChange(e.target.value)}
              />
            ),
          },
          {
            key: 'status',
            label: 'Status',
            render: (value, onChange) => (
              <select
                id="admin-filter-status"
                className="form-select form-select-sm"
                style={{ width: 140 }}
                value={value}
                onChange={(e) => onChange(e.target.value)}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                ))}
              </select>
            ),
          },
          {
            key: 'frozen',
            label: 'Frozen',
            render: (value, onChange) => (
              <select
                id="admin-filter-frozen"
                className="form-select form-select-sm"
                style={{ width: 110 }}
                value={value}
                onChange={(e) => onChange(e.target.value)}
              >
                {FROZEN_OPTIONS.map((o) => (
                  <option key={o.value || 'any'} value={o.value}>{o.label}</option>
                ))}
              </select>
            ),
          },
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
        ]}
      />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            {loading && !items.length ? (
              <div className="p-4"><LoadingSkeleton rows={6} /></div>
            ) : (
              <DataTable<BatchRow>
                keyField="id"
                loading={loading}
                rows={items}
                columns={[
                  { key: 'id', label: 'ID', render: (r) => <Link href={`/admin/batch-control/${r.id}`} className="text-decoration-none">{r.id}</Link> },
                  { key: 'batchNo', label: 'Batch no', render: (r) => r.batchNo ?? '—' },
                  {
                    key: 'status',
                    label: 'Status',
                    render: (r) => <StatusChip status={r.status} />,
                  },
                  {
                    key: 'frozen',
                    label: 'Frozen',
                    render: (r) => (r.frozenAt ? <span className="badge bg-warning text-dark">Frozen</span> : <span className="text-muted">—</span>),
                  },
                  {
                    key: 'slaDeadline',
                    label: 'SLA deadline',
                    render: (r) => (r.approval?.slaDeadline ? new Date(r.approval.slaDeadline).toLocaleDateString() : '—'),
                  },
                  {
                    key: 'assignedTo',
                    label: 'Assigned reviewer',
                    render: (r) => (r.approval?.assignedToUserId != null ? `User #${r.approval.assignedToUserId}` : '—'),
                  },
                  {
                    key: 'product',
                    label: 'Product',
                    render: (r) =>
                      r.authProduct ? (
                        <Link href={`/admin/approvals`}>{r.authProduct.productName ?? r.authProduct.sku ?? `#${r.authProduct.id}`}</Link>
                      ) : (
                        '—'
                      ),
                  },
                  {
                    key: 'producerOrg',
                    label: 'Producer',
                    render: (r) =>
                      r.producerOrg ? (
                        <Link href={`/admin/producer-governance/${r.producerOrg.id}`}>{r.producerOrg.name}</Link>
                      ) : (
                        '—'
                      ),
                  },
                  { key: 'qtyGenerated', label: 'Qty', render: (r) => `${r.qtyGenerated ?? 0} / ${r.qtyPlanned ?? 0}` },
                  { key: 'createdAt', label: 'Created', render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : '—') },
                ]}
                emptyState={<EmptyState title="No batches" description="Adjust filters or create batches from the producer panel." />}
              />
            )}
          </div>
          {total > 0 && (
            <div className="card-footer bg-transparent border-0">
              <PaginationBar
                page={page}
                pageSize={limit}
                total={total}
                totalPages={totalPages}
                disabled={loading}
                onPageChange={setPage}
                className="mt-0 pt-3 border-top"
                ariaLabel="Batch control pages"
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
            </div>
          )}
        </div>
      )}
    </AdminPageShell>
  )
}
