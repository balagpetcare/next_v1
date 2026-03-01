'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import AdminFiltersBar from '@/src/bpa/admin/components/AdminFiltersBar'
import DataTable from '@/src/bpa/admin/components/DataTable'
import EmptyState from '@/src/bpa/admin/components/EmptyState'
import ErrorState from '@/src/bpa/admin/components/ErrorState'
import LoadingSkeleton from '@/src/bpa/admin/components/LoadingSkeleton'
import {
  listGovernanceProducts,
  actOnGovernanceProduct,
  type GovernanceProductItem,
  type GovernanceProductStatus,
  type ListGovernanceProductsResult,
} from '@/src/bpa/admin/lib/governanceApi'
import { adminToast } from '@/src/bpa/admin/lib/adminToast'

const STATUS_TABS: { value: GovernanceProductStatus; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'UNAPPROVED', label: 'Unapproved' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'DECLINED', label: 'Declined' },
  { value: 'REJECTED', label: 'Rejected' },
]

const PAGE_SIZES = [10, 20, 50, 100]

export default function GovernanceProductsPage() {
  const [result, setResult] = useState<ListGovernanceProductsResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  const [status, setStatus] = useState<GovernanceProductStatus>('ALL')
  const [producerOrgId, setProducerOrgId] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'name'>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listGovernanceProducts({
        status,
        producerOrgId: producerOrgId.trim() || null,
        q: search.trim() || null,
        page,
        limit,
        sortBy,
        sortDir,
      })
      const data = res.data
      if (data && typeof data === 'object' && 'items' in data) {
        setResult(data as ListGovernanceProductsResult)
      } else {
        setResult({ items: [], page: 1, limit, total: 0, facets: { statusCounts: { UNAPPROVED: 0, SUBMITTED: 0, APPROVED: 0, DECLINED: 0, REJECTED: 0 } } })
      }
    } catch (e) {
      const msg = (e as Error).message ?? 'Failed to load products'
      setError(
        typeof msg === 'string' && (msg.includes('403') || msg.toLowerCase().includes('permission'))
          ? 'You do not have permission to view governance products. You need admin.approvals.manage.'
          : msg
      )
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [status, producerOrgId, search, page, limit, sortBy, sortDir])

  useEffect(() => {
    load()
  }, [load])

  const handleAction = async (row: GovernanceProductItem, action: 'APPROVE' | 'DECLINE' | 'REJECT' | 'RESET_TO_UNAPPROVED' | 'PUBLISH' | 'UNPUBLISH', note?: string) => {
    setBusyId(row.productId)
    try {
      await actOnGovernanceProduct(row.productId, { action, note })
      adminToast.success('Action completed.')
      await load()
    } catch (e) {
      const msg = (e as Error).message ?? 'Action failed'
      if (msg.includes('NOT_PENDING') || msg.includes('INVALID_STATE') || msg.includes('does not allow this action')) {
        adminToast.warning('Product status was already updated. List refreshed.')
      } else {
        adminToast.error(msg)
      }
      await load()
    } finally {
      setBusyId(null)
    }
  }

  const handleReject = (row: GovernanceProductItem) => {
    const raw = window.prompt('Rejection reason (required, min 5 characters):')
    if (raw === null) return
    const reason = (raw || '').trim()
    if (reason.length < 5) {
      adminToast.error('Please enter at least 5 characters.')
      return
    }
    handleAction(row, 'REJECT', reason)
  }

  const handleDecline = (row: GovernanceProductItem) => {
    const raw = window.prompt('Notes for the producer (what to change):')
    if (raw === null) return
    handleAction(row, 'DECLINE', (raw || '').trim())
  }

  const resetFilters = () => {
    setProducerOrgId('')
    setSearch('')
    setPage(1)
  }

  const items = result?.items ?? []
  const total = result?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(page * limit, total)
  const facets = result?.facets?.statusCounts

  const canApprove = (r: GovernanceProductItem) => r.currentStatus === 'SUBMITTED' || (r.currentStatus === 'APPROVED' && !r.isActive)
  const canReject = (r: GovernanceProductItem) => r.currentStatus === 'SUBMITTED' || (r.currentStatus === 'APPROVED' && !r.isActive)
  const canDecline = (r: GovernanceProductItem) => r.currentStatus === 'SUBMITTED' || (r.currentStatus === 'APPROVED' && !r.isActive)
  const canPublish = (r: GovernanceProductItem) => r.currentStatus === 'APPROVED' && !r.isActive
  const canUnpublish = (r: GovernanceProductItem) => r.isActive
  const canReset = (r: GovernanceProductItem) => ['SUBMITTED', 'APPROVED', 'DECLINED', 'REJECTED'].includes(r.currentStatus)

  return (
    <AdminPageShell
      title="Governance Products"
      breadcrumbs={[
        { href: '/admin', label: 'Admin' },
        { href: '/admin/producer-governance', label: 'Producer Governance' },
        { label: 'Products' },
      ]}
      actions={
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <Link href="/admin/producer-governance" className="btn btn-outline-secondary btn-sm">
            Producers
          </Link>
          <Link href="/admin/approvals" className="btn btn-outline-secondary btn-sm">
            Approvals
          </Link>
          <button type="button" className="btn btn-primary btn-sm" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      }
    >
      <p className="text-secondary small mb-3">
        View and manage producer products across all producer orgs. Use status tabs to filter; approve, decline, reject, or publish from the list or open detail.
      </p>

      <div className="mb-3">
        <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`btn btn-sm ${status === tab.value ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => { setStatus(tab.value); setPage(1); }}
            >
              {tab.label}
              {facets && tab.value !== 'ALL' && facets[tab.value as keyof typeof facets] != null ? (
                <span className="ms-1 badge bg-light text-dark rounded-pill">{facets[tab.value as keyof typeof facets]}</span>
              ) : null}
            </button>
          ))}
        </div>
        <AdminFiltersBar
          searchPlaceholder="Product name, SKU, or producer…"
          searchValue={search}
          onSearchChange={setSearch}
          filterValues={{ producerOrgId }}
          onFilterChange={(key, value) => {
            if (key === 'producerOrgId') setProducerOrgId(value)
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
          ]}
        />
      </div>

      {error ? <ErrorState message={error} onRetry={load} className="mb-3" /> : null}

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-transparent border-0 py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h5 className="mb-0 fw-semibold">Products</h5>
          {!error && total > 0 ? (
            <span className="badge bg-secondary fw-normal">{total} product{total !== 1 ? 's' : ''}</span>
          ) : null}
        </div>
        <div className="card-body p-0">
          {loading && items.length === 0 ? (
            <div className="p-4">
              <LoadingSkeleton rows={6} />
            </div>
          ) : (
            <>
              <DataTable<GovernanceProductItem>
                columns={[
                  {
                    key: 'product',
                    label: 'Product',
                    render: (r) => (
                      <div>
                        <Link href={`/admin/producer-governance/products/${r.productId}`} className="fw-medium">
                          {r.name || r.sku || `#${r.productId}`}
                        </Link>
                        {r.sku ? <div className="small text-muted">{r.sku}</div> : null}
                      </div>
                    ),
                  },
                  {
                    key: 'producer',
                    label: 'Producer',
                    render: (r) => (
                      <Link href={`/admin/producer-governance/${r.producerOrgId}`}>{r.producerOrgName || `#${r.producerOrgId}`}</Link>
                    ),
                  },
                  {
                    key: 'currentStatus',
                    label: 'Status',
                    render: (r) => {
                      const raw = r as Record<string, unknown>
                      const isActive = raw.isActive === true || raw.is_active === true
                      const currentStatus = raw.currentStatus ?? raw.current_status ?? raw.status ?? 'UNAPPROVED'
                      const displayStatus = isActive ? 'ACTIVE' : (String(currentStatus).trim() || 'UNAPPROVED')
                      const s = displayStatus.toUpperCase()
                      const badgeClass =
                        s === 'ACTIVE' ? 'badge bg-success' :
                        s === 'APPROVED' ? 'badge bg-info' :
                        s === 'REJECTED' || s === 'DECLINED' ? 'badge bg-danger' :
                        s === 'SUBMITTED' || s === 'UNDER_REVIEW' ? 'badge bg-warning text-dark' :
                        s === 'CHANGES_REQUESTED' ? 'badge bg-warning text-dark' :
                        'badge bg-secondary'
                      return <span className={badgeClass}>{s}</span>
                    },
                  },
                  {
                    key: 'submittedAt',
                    label: 'Submitted / Updated',
                    render: (r) => (r.reviewedAt ? new Date(r.reviewedAt).toLocaleString() : r.submittedAt ? new Date(r.submittedAt).toLocaleString() : new Date(r.updatedAt).toLocaleString()),
                  },
                  {
                    key: 'actions',
                    label: 'Actions',
                    render: (r) => (
                      <div className="d-flex gap-1 flex-wrap align-items-center">
                        <Link href={`/admin/producer-governance/products/${r.productId}`} className="btn btn-sm btn-outline-primary">
                          View
                        </Link>
                        {canApprove(r) ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-success"
                            disabled={busyId !== null}
                            onClick={() => handleAction(r, 'APPROVE')}
                          >
                            {busyId === r.productId ? '…' : 'Approve'}
                          </button>
                        ) : null}
                        {canDecline(r) ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-warning"
                            disabled={busyId !== null}
                            onClick={() => handleDecline(r)}
                          >
                            {busyId === r.productId ? '…' : 'Decline'}
                          </button>
                        ) : null}
                        {canReject(r) ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            disabled={busyId !== null}
                            onClick={() => handleReject(r)}
                          >
                            {busyId === r.productId ? '…' : 'Reject'}
                          </button>
                        ) : null}
                        {canPublish(r) ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-success"
                            disabled={busyId !== null}
                            onClick={() => handleAction(r, 'PUBLISH')}
                          >
                            {busyId === r.productId ? '…' : 'Activate'}
                          </button>
                        ) : null}
                        {canUnpublish(r) ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            disabled={busyId !== null}
                            onClick={() => handleAction(r, 'UNPUBLISH')}
                          >
                            {busyId === r.productId ? '…' : 'Deactivate'}
                          </button>
                        ) : null}
                        {canReset(r) ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            disabled={busyId !== null}
                            onClick={() => handleAction(r, 'RESET_TO_UNAPPROVED')}
                            title="Reset to unapproved"
                          >
                            {busyId === r.productId ? '…' : 'Reset'}
                          </button>
                        ) : null}
                      </div>
                    ),
                  },
                ]}
                rows={items}
                keyField="productId"
                emptyState={
                  <EmptyState
                    title="No products"
                    description="No producer products match the current filters. Try changing status or search."
                    action={<button type="button" className="btn btn-sm btn-outline-primary" onClick={load}>Refresh</button>}
                  />
                }
              />
              {total > 0 ? (
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 border-top p-3">
                  <div className="d-flex align-items-center gap-2">
                    <span className="small text-muted">
                      Showing {from}–{to} of {total}
                    </span>
                    <select
                      className="form-select form-select-sm"
                      style={{ width: 70 }}
                      value={limit}
                      onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                    >
                      {PAGE_SIZES.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    <span className="small text-muted">per page</span>
                  </div>
                  <nav aria-label="Products pagination">
                    <ul className="pagination pagination-sm mb-0">
                      <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                        <button type="button" className="page-link" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                          Previous
                        </button>
                      </li>
                      <li className="page-item disabled">
                        <span className="page-link">Page {page} of {totalPages}</span>
                      </li>
                      <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                        <button type="button" className="page-link" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                          Next
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </AdminPageShell>
  )
}
