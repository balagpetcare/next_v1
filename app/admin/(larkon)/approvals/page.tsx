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
import { getGovernance, postGovernance } from '@/src/bpa/admin/lib/governanceApi'
import { PaginationBar } from '@/src/components/common/PaginationBar'

type ApprovalRow = {
  id: number
  producerOrgId: number
  entityType: string
  entityId: number
  status: string
  stage?: 'submitted' | 'under_review'
  submittedByUserId?: number
  assignedToUserId?: number | null
  assignedAt?: string | null
  slaDeadline?: string | null
  createdAt?: string
  producerOrg?: { id: number; name: string } | null
  entity?: { id: number; productName?: string; sku?: string; authProduct?: { productName: string } } | null
}

type ListPayload = {
  data: ApprovalRow[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const ENTITY_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'PRODUCT', label: 'Product' },
  { value: 'BATCH', label: 'Batch' },
]

const STAGE_OPTIONS = [
  { value: 'all', label: 'All stages' },
  { value: 'submitted', label: 'Submitted (staff)' },
  { value: 'under_review', label: 'Platform review' },
]

const PAGE_SIZES = [10, 20, 50, 100]

export default function AdminApprovalsQueuePage() {
  const searchParams = useSearchParams()
  const urlProducerOrgId = searchParams?.get('producerOrgId') ?? ''

  const [items, setItems] = useState<ApprovalRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  const [filterProducerOrgId, setFilterProducerOrgId] = useState(urlProducerOrgId)
  const [filterEntityType, setFilterEntityType] = useState('')
  const [filterStage, setFilterStage] = useState('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (filterProducerOrgId.trim()) params.set('producerOrgId', filterProducerOrgId.trim())
      if (filterEntityType) params.set('entityType', filterEntityType)
      if (filterStage && filterStage !== 'all') params.set('stage', filterStage)
      if (search.trim()) params.set('search', search.trim())
      params.set('page', String(page))
      params.set('limit', String(limit))

      const res = await getGovernance<ListPayload>(`/admin/approvals?${params}`)
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
        setItems(fallback as ApprovalRow[])
        setTotal(fallback.length)
        setTotalPages(1)
      }
    } catch (e) {
      const msg = (e as Error).message ?? 'Failed to load approvals'
      setError(typeof msg === 'string' && (msg.includes('403') || msg.toLowerCase().includes('permission')) ? 'No access. You do not have permission to view approvals.' : msg)
      setItems([])
      setTotal(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [filterProducerOrgId, filterEntityType, filterStage, search, page, limit])

  useEffect(() => {
    setFilterProducerOrgId(urlProducerOrgId)
  }, [urlProducerOrgId])

  useEffect(() => {
    load()
  }, [load])

  const handleApprove = async (row: ApprovalRow) => {
    setBusyId(row.id)
    try {
      await postGovernance(`/admin/approvals/${row.id}/approve`, { note: row.stage === 'under_review' ? 'Activated from admin' : 'Approved from admin' })
      await load()
    } catch (e) {
      alert((e as Error).message ?? 'Failed to approve')
    } finally {
      setBusyId(null)
    }
  }

  const handleActivate = async (row: ApprovalRow) => {
    setBusyId(row.id)
    try {
      await postGovernance(`/admin/approvals/${row.id}/activate`, { note: 'Activated from admin' })
      await load()
    } catch (e) {
      alert((e as Error).message ?? 'Failed to activate')
    } finally {
      setBusyId(null)
    }
  }

  const handleRequestChanges = async (row: ApprovalRow) => {
    const raw = window.prompt('Notes for the producer (what to change):')
    if (raw === null) return
    const notes = (raw || '').trim()
    setBusyId(row.id)
    try {
      await postGovernance(`/admin/approvals/${row.id}/request-changes`, { notes: notes || undefined })
      await load()
    } catch (e) {
      alert((e as Error).message ?? 'Failed to request changes')
    } finally {
      setBusyId(null)
    }
  }

  const handleTake = async (row: ApprovalRow) => {
    setBusyId(row.id)
    try {
      await postGovernance(`/admin/approvals/${row.id}/take`, {})
      await load()
    } catch (e) {
      alert((e as Error).message ?? 'Failed to take')
    } finally {
      setBusyId(null)
    }
  }

  const handleReject = async (row: ApprovalRow) => {
    const raw = window.prompt('Rejection reason (required, min 5 characters):')
    if (raw === null) return
    const reason = (raw || '').trim()
    if (reason.length < 5) {
      alert('Please enter at least 5 characters. The producer will see this reason.')
      return
    }
    setBusyId(row.id)
    try {
      await postGovernance(`/admin/approvals/${row.id}/reject`, { reason })
      await load()
    } catch (e) {
      const msg = (e as Error).message ?? 'Failed to reject'
      if (msg.includes('NOT_PENDING') || msg.includes('not in a pending')) {
        alert('This item was already processed. Refresh the list.')
        await load()
      } else {
        alert(msg)
      }
    } finally {
      setBusyId(null)
    }
  }

  const entityName = (row: ApprovalRow) => {
    if (row.entityType === 'PRODUCT' && row.entity) {
      const e = row.entity as { productName?: string; sku?: string }
      return e.productName ?? e.sku ?? `Product #${row.entityId}`
    }
    if (row.entityType === 'BATCH' && row.entity) {
      const e = row.entity as { authProduct?: { productName: string } }
      return e?.authProduct?.productName ?? `Batch #${row.entityId}`
    }
    return `${row.entityType} #${row.entityId}`
  }

  const stageLabel = (stage?: string) => {
    if (stage === 'under_review') return 'Platform review'
    if (stage === 'submitted') return 'Submitted'
    return '—'
  }

  const resetFilters = () => {
    setFilterProducerOrgId(urlProducerOrgId)
    setFilterEntityType('')
    setFilterStage('all')
    setSearch('')
    setPage(1)
  }

  return (
    <AdminPageShell
      title="Approvals queue"
      breadcrumbs={[{ href: '/admin', label: 'Admin' }, { label: 'Producer Governance' }, { label: 'Approvals' }]}
      actions={
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <Link href="/admin/producer-governance" className="btn btn-outline-secondary btn-sm">Producers</Link>
          <button type="button" className="btn btn-primary btn-sm" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      }
    >
      <p className="text-secondary small mb-3">
        Review and approve, activate, or reject product and batch submissions. Includes staff-submitted (Submitted) and owner-submitted (Platform review) items.
      </p>

      <AdminFiltersBar
        searchPlaceholder="Product name or SKU…"
        searchValue={search}
        onSearchChange={setSearch}
        filterValues={{
          producerOrgId: filterProducerOrgId,
          entityType: filterEntityType,
          stage: filterStage,
        }}
        onFilterChange={(key, value) => {
          if (key === 'producerOrgId') setFilterProducerOrgId(value)
          if (key === 'entityType') setFilterEntityType(value)
          if (key === 'stage') setFilterStage(value)
          setPage(1)
        }}
        onReset={resetFilters}
        filters={[
          {
            key: 'producerOrgId',
            label: 'Producer ID',
            render: (value, onChange) => (
              <input
                id="admin-filter-producerOrgId"
                type="text"
                className="form-control form-control-sm"
                style={{ width: 120 }}
                placeholder="Org ID"
                value={value}
                onChange={(e) => onChange(e.target.value)}
              />
            ),
          },
          {
            key: 'entityType',
            label: 'Type',
            render: (value, onChange) => (
              <select
                id="admin-filter-entityType"
                className="form-select form-select-sm"
                style={{ width: 140 }}
                value={value}
                onChange={(e) => onChange(e.target.value)}
              >
                {ENTITY_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                ))}
              </select>
            ),
          },
          {
            key: 'stage',
            label: 'Stage',
            render: (value, onChange) => (
              <select
                id="admin-filter-stage"
                className="form-select form-select-sm"
                style={{ width: 160 }}
                value={value}
                onChange={(e) => onChange(e.target.value)}
              >
                {STAGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ),
          },
        ]}
      />

      {filterProducerOrgId ? (
        <div className="alert alert-light border mb-3 py-2">
          Filtering by producer: <Link href={`/admin/producer-governance/${filterProducerOrgId}`} className="fw-medium">{filterProducerOrgId}</Link>
        </div>
      ) : null}

      {error ? <ErrorState message={error} onRetry={load} className="mb-3" /> : null}

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-transparent border-0 py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h5 className="mb-0 fw-semibold">Pending approvals</h5>
          {!error && total > 0 ? (
            <span className="badge bg-warning text-dark fw-normal">{total} item{total !== 1 ? 's' : ''}</span>
          ) : null}
        </div>
        <div className="card-body p-0">
          {loading && items.length === 0 ? (
            <div className="p-4"><LoadingSkeleton rows={6} /></div>
          ) : (
            <>
              <DataTable<ApprovalRow>
                columns={[
                  { key: 'id', label: 'ID', render: (r) => `#${r.id}` },
                  { key: 'producerOrg', label: 'Producer', render: (r) => r.producerOrg?.name ?? `Org #${r.producerOrgId}` },
                  { key: 'entityType', label: 'Type', render: (r) => r.entityType },
                  { key: 'entity', label: 'Entity', render: entityName },
                  { key: 'stage', label: 'Stage', render: (r) => <StatusChip status={stageLabel(r.stage)} /> },
                  { key: 'assignedTo', label: 'Assigned to', render: (r) => r.assignedToUserId != null ? `User #${r.assignedToUserId}` : '—' },
                  {
                    key: 'sla',
                    label: 'SLA',
                    render: (r) => {
                      if (!r.slaDeadline) return '—'
                      const d = new Date(r.slaDeadline)
                      const now = new Date()
                      const overdue = d.getTime() < now.getTime()
                      return <span className={overdue ? 'text-danger' : ''}>{d.toLocaleDateString()} {overdue ? '(overdue)' : ''}</span>
                    },
                  },
                  { key: 'status', label: 'Status', render: (r) => <StatusChip status={r.status} /> },
                  { key: 'createdAt', label: 'Submitted', render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : '—') },
                  {
                    key: 'actions',
                    label: 'Actions',
                    render: (r) => (
                      <div className="d-flex gap-1 flex-wrap align-items-center">
                        <Link href={`/admin/approvals/${r.id}`} className="btn btn-sm btn-outline-primary">View</Link>
                        {(r.assignedToUserId == null || r.assignedToUserId === 0) && (r.stage === 'submitted' || r.stage === 'under_review') ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            disabled={busyId !== null}
                            onClick={() => handleTake(r)}
                            title="Take (assign to me)"
                          >
                            {busyId === r.id ? '…' : 'Take'}
                          </button>
                        ) : null}
                        {r.entityType === 'PRODUCT' && (r.stage === 'submitted' || r.stage === 'under_review') ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-warning"
                            disabled={busyId !== null}
                            onClick={() => handleRequestChanges(r)}
                            title="Request changes from producer"
                          >
                            {busyId === r.id ? '…' : 'Request changes'}
                          </button>
                        ) : null}
                        {r.stage === 'under_review' ? (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm btn-success"
                              disabled={busyId !== null}
                              onClick={() => handleActivate(r)}
                            >
                              {busyId === r.id ? '…' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              disabled={busyId !== null}
                              onClick={() => handleReject(r)}
                            >
                              {busyId === r.id ? '…' : 'Reject'}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm btn-success"
                              disabled={busyId !== null}
                              onClick={() => handleApprove(r)}
                            >
                              {busyId === r.id ? '…' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              disabled={busyId !== null}
                              onClick={() => handleReject(r)}
                            >
                              {busyId === r.id ? '…' : 'Reject'}
                            </button>
                          </>
                        )}
                      </div>
                    ),
                  },
                ]}
                rows={items}
                keyField="id"
                emptyState={
                  <EmptyState
                    title="No pending approvals"
                    description="When producers submit products or batches for approval, or when owner-submitted items wait for platform review, they will appear here. Try adjusting filters or refresh."
                    action={<button type="button" className="btn btn-sm btn-outline-primary" onClick={load}>Refresh</button>}
                  />
                }
              />
              {total > 0 && (
                <div className="border-top p-3">
                  <PaginationBar
                    page={page}
                    pageSize={limit}
                    total={total}
                    totalPages={totalPages}
                    disabled={loading}
                    onPageChange={setPage}
                    className="mt-0 pt-0 border-0"
                    ariaLabel="Approvals pages"
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
            </>
          )}
        </div>
      </div>
    </AdminPageShell>
  )
}
