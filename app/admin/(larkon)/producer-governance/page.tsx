'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import StatusChip from '@/src/bpa/admin/components/StatusChip'
import DataTable from '@/src/bpa/admin/components/DataTable'
import EmptyState from '@/src/bpa/admin/components/EmptyState'
import ErrorState from '@/src/bpa/admin/components/ErrorState'
import LoadingSkeleton from '@/src/bpa/admin/components/LoadingSkeleton'
import { getGovernance } from '@/src/bpa/admin/lib/governanceApi'
import { PaginationBar } from '@/src/components/common/PaginationBar'

type ProducerRow = {
  orgId: number
  name: string
  status: string
  kycStatus?: string
  owner?: { userId: number; name?: string | null; email?: string | null }
  lastActivityAt?: string | null
  flagsSummary?: string[]
}

type ListData = {
  items: ProducerRow[]
  page: number
  pageSize: number
  total: number
}

const STATUS_OPTIONS = ['', 'PENDING', 'VERIFIED', 'SUSPENDED']
const KYC_OPTIONS = ['', 'PENDING', 'VERIFIED', 'REJECTED']

export default function ProducerGovernanceListPage() {
  const [data, setData] = useState<ListData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [kycStatus, setKycStatus] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (status) params.set('status', status)
      if (kycStatus) params.set('kycStatus', kycStatus)
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))
      const res = await getGovernance<ListData>(`/admin/producers?${params}`)
      setData(res.data ?? { items: [], page: 1, pageSize: 20, total: 0 })
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load producers')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [search, status, kycStatus, page, pageSize])

  useEffect(() => {
    load()
  }, [load])

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <AdminPageShell
      title="Producer Governance"
      breadcrumbs={[{ href: '/admin', label: 'Admin' }, { label: 'Producer Governance' }, { label: 'Producers' }]}
      actions={
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <Link href="/admin/approvals" className="btn btn-primary btn-sm">
            Approvals queue
          </Link>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      }
    >
      <p className="text-secondary small mb-4">
        Manage producer organizations, view status and KYC, and open the approvals queue.
      </p>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <h6 className="card-subtitle text-muted mb-3">Filters</h6>
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <label className="form-label small fw-medium">Search</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Name, email, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (setPage(1), load())}
              />
            </div>
            <div className="col-12 col-md-2">
              <label className="form-label small fw-medium">Status</label>
              <select
                className="form-select form-select-sm"
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s || 'all'} value={s}>{s || 'All'}</option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-2">
              <label className="form-label small fw-medium">KYC</label>
              <select
                className="form-select form-select-sm"
                value={kycStatus}
                onChange={(e) => { setKycStatus(e.target.value); setPage(1); }}
              >
                {KYC_OPTIONS.map((k) => (
                  <option key={k || 'all'} value={k}>{k || 'All'}</option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-2 d-flex align-items-end">
              <button type="button" className="btn btn-primary btn-sm w-100" onClick={() => setPage(1)}>
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>

      {error ? <ErrorState message={error} onRetry={load} className="mb-4" /> : null}

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-transparent border-0 py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h5 className="mb-0 fw-semibold">Producers</h5>
          {data != null && !error ? (
            <span className="badge bg-light text-dark fw-normal">{data.total} total</span>
          ) : null}
        </div>
        <div className="card-body p-0">
        {loading && !data ? (
          <div className="p-4"><LoadingSkeleton rows={8} /></div>
        ) : (
          <>
            <DataTable<ProducerRow>
              columns={[
                { key: 'orgId', label: 'ID', render: (r) => <span className="fw-semibold text-primary">#{r.orgId}</span> },
                { key: 'name', label: 'Name', render: (r) => <span className="text-dark">{r.name || '—'}</span> },
                { key: 'status', label: 'Status', render: (r) => <StatusChip status={r.status} /> },
                { key: 'kycStatus', label: 'KYC', render: (r) => <StatusChip status={r.kycStatus ?? r.status} /> },
                {
                  key: 'owner',
                  label: 'Owner',
                  render: (r) =>
                    <span className="text-secondary">{r.owner?.email ?? r.owner?.name ?? `User #${r.owner?.userId ?? '—'}`}</span>,
                },
                {
                  key: 'lastActivityAt',
                  label: 'Last activity',
                  render: (r) =>
                    r.lastActivityAt ? new Date(r.lastActivityAt).toLocaleDateString() : '—',
                },
                {
                  key: 'action',
                  label: '',
                  render: (r) => (
                    <Link href={`/admin/producer-governance/${r.orgId}`} className="btn btn-sm btn-primary">
                      View
                    </Link>
                  ),
                },
              ]}
              rows={data?.items ?? []}
              keyField="orgId"
              loading={loading && data != null}
              emptyState={
                <div className="p-5 text-center">
                  <EmptyState
                    title="No producers found"
                    description="Try changing filters or search."
                    action={<button type="button" className="btn btn-sm btn-outline-primary" onClick={load}>Refresh</button>}
                  />
                </div>
              }
            />
            {data && !error && total > 0 && (
              <div className="px-4 py-3 border-top bg-light">
                <PaginationBar
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  totalPages={totalPages}
                  disabled={loading}
                  onPageChange={setPage}
                  className="mt-0 pt-0 border-0"
                  ariaLabel="Producer organizations pages"
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
