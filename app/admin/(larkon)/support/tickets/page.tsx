'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import AdminFiltersBar from '@/src/bpa/admin/components/AdminFiltersBar'
import DataTable from '@/src/bpa/admin/components/DataTable'
import EmptyState from '@/src/bpa/admin/components/EmptyState'
import ErrorState from '@/src/bpa/admin/components/ErrorState'
import StatusChip from '@/src/bpa/admin/components/StatusChip'
import {
  adminTicketStats,
  adminTicketsList,
  type TicketRow,
  type TicketListPayload,
  type TicketStats,
} from '@/src/bpa/admin/lib/adminSupportApi'
import { PaginationBar } from '@/src/components/common/PaginationBar'

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'WAITING_ON_PRODUCER', label: 'Waiting on producer' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'ESCALATED', label: 'Escalated' },
]

const PRIORITY_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]

const CATEGORY_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'BATCH_CODE', label: 'Batch / Code' },
  { value: 'PRODUCT_GOVERNANCE', label: 'Product / Governance' },
  { value: 'ACCOUNT_KYC', label: 'Account / KYC' },
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'TECHNICAL', label: 'Technical' },
  { value: 'FRAUD_ABUSE', label: 'Fraud / Abuse' },
  { value: 'OTHER', label: 'Other' },
]

function formatDate(d: string | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminSupportTicketsPage() {
  const [items, setItems] = useState<TicketRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState<TicketStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    status: '',
    priority: '',
    category: '',
  })

  const loadList = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const payload = await adminTicketsList({
        status: filterValues.status || undefined,
        priority: filterValues.priority || undefined,
        category: filterValues.category || undefined,
        search: search.trim() || undefined,
        page,
        pageSize,
      })
      setItems((payload as TicketListPayload).items ?? [])
      setTotal((payload as TicketListPayload).total ?? 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tickets')
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [filterValues.status, filterValues.priority, filterValues.category, search, page, pageSize])

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const data = await adminTicketStats()
      setStats(data)
    } catch {
      setStats(null)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const handleReset = () => {
    setSearch('')
    setFilterValues({ status: '', priority: '', category: '' })
    setPage(1)
  }

  type Row = TicketRow & { org: string; assigned: string; updated: string }
  const rows: Row[] = items.map((row) => ({
    ...row,
    org: row.producerOrg?.name ?? `#${row.producerOrgId}`,
    assigned: row.assignedTo?.profile?.displayName ?? '—',
    updated: formatDate(row.updatedAt),
  }))

  const columns = [
    { key: 'ticketNo', label: 'Ticket', render: (r: Row) => <code>{r.ticketNo}</code> },
    { key: 'subject', label: 'Subject', render: (r: Row) => <span title={r.subject}>{(r.subject ?? '').slice(0, 50)}{(r.subject?.length ?? 0) > 50 ? '…' : ''}</span> },
    { key: 'status', label: 'Status', render: (r: Row) => <StatusChip status={r.status} /> },
    { key: 'priority', label: 'Priority', render: (r: Row) => <span className="badge bg-secondary">{r.priority}</span> },
    { key: 'org', label: 'Org', render: (r: Row) => <Link href={`/admin/producer-governance/${r.producerOrgId}`}>{r.org}</Link> },
    { key: 'assigned', label: 'Assigned', render: (r: Row) => r.assigned },
    { key: 'updated', label: 'Updated', render: (r: Row) => r.updated },
    { key: 'action', label: '', render: (r: Row) => <Link href={`/admin/support/tickets/${r.id}`} className="btn btn-outline-primary btn-sm">View</Link> },
  ]

  return (
    <AdminPageShell
      title="Support tickets"
      breadcrumbs={[{ label: 'Support', href: '/admin/support' }, { label: 'Tickets' }]}
    >
      <div className="row g-3 mb-3">
        <div className="col-6 col-md-3">
          <div className="card h-100">
            <div className="card-body py-2">
              {statsLoading ? (
                <span className="placeholder col-6" />
              ) : (
                <>
                  <div className="small text-muted">Open</div>
                  <div className="h4 mb-0">{stats?.openCount ?? 0}</div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card h-100">
            <div className="card-body py-2">
              {statsLoading ? (
                <span className="placeholder col-6" />
              ) : (
                <>
                  <div className="small text-muted">Urgent</div>
                  <div className="h4 mb-0 text-warning">{stats?.urgentCount ?? 0}</div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card h-100">
            <div className="card-body py-2">
              {statsLoading ? (
                <span className="placeholder col-6" />
              ) : (
                <>
                  <div className="small text-muted">Avg first response (hrs)</div>
                  <div className="h4 mb-0">{stats?.avgFirstResponseHours ?? '—'}</div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card h-100">
            <div className="card-body py-2">
              {statsLoading ? (
                <span className="placeholder col-6" />
              ) : (
                <>
                  <div className="small text-muted">SLA breached</div>
                  <div className="h4 mb-0 text-danger">{stats?.slaBreachedCount ?? 0}</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <AdminFiltersBar
        searchPlaceholder="Search subject, ticket no, org…"
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
        filters={[
          {
            key: 'status',
            label: 'Status',
            render: (val, onChange) => (
              <select
                id="admin-filter-status"
                className="form-select form-select-sm"
                style={{ width: 'auto', minWidth: 120 }}
                value={val}
                onChange={(e) => onChange(e.target.value)}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ),
          },
          {
            key: 'priority',
            label: 'Priority',
            render: (val, onChange) => (
              <select
                id="admin-filter-priority"
                className="form-select form-select-sm"
                style={{ width: 'auto', minWidth: 100 }}
                value={val}
                onChange={(e) => onChange(e.target.value)}
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ),
          },
          {
            key: 'category',
            label: 'Category',
            render: (val, onChange) => (
              <select
                id="admin-filter-category"
                className="form-select form-select-sm"
                style={{ width: 'auto', minWidth: 140 }}
                value={val}
                onChange={(e) => onChange(e.target.value)}
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ),
          },
        ]}
      />

      {error && <ErrorState message={error} onRetry={loadList} />}

      {!error && (
        <DataTable
          columns={columns}
          rows={rows}
          keyField="id"
          loading={loading}
          emptyState={<EmptyState title="No tickets" description="No tickets match the current filters." />}
          className="mb-0"
        />
      )}

      {total > 0 && (
        <PaginationBar
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={Math.max(1, Math.ceil(total / pageSize))}
          disabled={loading}
          onPageChange={setPage}
          className="mt-3 pt-3 border-top"
          ariaLabel="Support tickets pages"
        />
      )}
    </AdminPageShell>
  )
}
