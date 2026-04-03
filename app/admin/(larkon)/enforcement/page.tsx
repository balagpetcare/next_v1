'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import AdminFiltersBar from '@/src/bpa/admin/components/AdminFiltersBar'
import DataTable from '@/src/bpa/admin/components/DataTable'
import EmptyState from '@/src/bpa/admin/components/EmptyState'
import ErrorState from '@/src/bpa/admin/components/ErrorState'
import LoadingSkeleton from '@/src/bpa/admin/components/LoadingSkeleton'
import { getGovernance, postGovernance } from '@/src/bpa/admin/lib/governanceApi'
import { PaginationBar } from '@/src/components/common/PaginationBar'

type IncidentRow = {
  id: number
  entityType: string
  entityId: number
  producerOrgId: number
  incidentType: string
  severity: string
  actionTaken: string
  reason: string
  ticketId?: string | null
  createdByUserId: number
  resolvedAt?: string | null
  resolvedByUserId?: number | null
  resolutionNote?: string | null
  createdAt: string
  producerOrg?: { id: number; name: string } | null
}

type ListPayload = {
  data: IncidentRow[]
  total: number
  page: number
  limit: number
  totalPages: number
}

type IncidentsStats = { total: number; unresolved: number; resolved: number }

const ENTITY_TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'PRODUCT', label: 'Product' },
  { value: 'BATCH', label: 'Batch' },
  { value: 'PRODUCER_ORG', label: 'Producer' },
]

const INCIDENT_TYPE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'POLICY_VIOLATION', label: 'Policy violation' },
  { value: 'HIDDEN', label: 'Hidden' },
  { value: 'RESTORATION', label: 'Restoration' },
  { value: 'FROZEN', label: 'Frozen' },
  { value: 'SUSPENDED', label: 'Suspended' },
]

const SEVERITY_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
]

const RESOLVED_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'true', label: 'Resolved' },
  { value: 'false', label: 'Unresolved' },
]

const PAGE_SIZES = [10, 20, 50, 100]

function entityLink(row: IncidentRow): { href: string; label: string } {
  if (row.entityType === 'PRODUCT') {
    return { href: `/admin/approvals?productId=${row.entityId}`, label: `Product #${row.entityId}` }
  }
  if (row.entityType === 'BATCH') {
    return { href: `/admin/batch-control/${row.entityId}`, label: `Batch #${row.entityId}` }
  }
  if (row.entityType === 'PRODUCER_ORG') {
    return { href: `/admin/producer-governance/${row.entityId}`, label: `Producer #${row.entityId}` }
  }
  return { href: '#', label: `${row.entityType} #${row.entityId}` }
}

export default function EnforcementPage() {
  const searchParams = useSearchParams()
  const urlProducerOrgId = searchParams?.get('producerOrgId') ?? ''

  const [items, setItems] = useState<IncidentRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState<IncidentsStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  const [filterProducerOrgId, setFilterProducerOrgId] = useState(urlProducerOrgId)
  const [filterEntityType, setFilterEntityType] = useState('')
  const [filterEntityId, setFilterEntityId] = useState('')
  const [filterIncidentType, setFilterIncidentType] = useState('')
  const [filterSeverity, setFilterSeverity] = useState('')
  const [filterActionTaken, setFilterActionTaken] = useState('')
  const [filterResolved, setFilterResolved] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [searchQ, setSearchQ] = useState('')

  const [detailId, setDetailId] = useState<number | null>(null)
  const [detail, setDetail] = useState<IncidentRow | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [resolveModalOpen, setResolveModalOpen] = useState(false)
  const [resolveNote, setResolveNote] = useState('')
  const [resolveSubmitting, setResolveSubmitting] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (filterProducerOrgId.trim()) params.set('producerOrgId', filterProducerOrgId.trim())
      if (filterEntityType) params.set('entityType', filterEntityType)
      if (filterEntityId.trim()) params.set('entityId', filterEntityId.trim())
      if (filterIncidentType) params.set('incidentType', filterIncidentType)
      if (filterSeverity) params.set('severity', filterSeverity)
      if (filterActionTaken.trim()) params.set('actionTaken', filterActionTaken.trim())
      if (filterResolved === 'true' || filterResolved === 'false') params.set('resolved', filterResolved)
      if (filterDateFrom) params.set('dateFrom', filterDateFrom)
      if (filterDateTo) params.set('dateTo', filterDateTo)
      if (searchQ.trim()) params.set('q', searchQ.trim())
      params.set('page', String(page))
      params.set('limit', String(limit))

      const res = await getGovernance<ListPayload>(`/admin/incidents?${params}`)
      const payload = res?.data as ListPayload | undefined

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
      const msg = (e as Error).message ?? 'Failed to load incidents'
      setError(typeof msg === 'string' && (msg.includes('403') || msg.toLowerCase().includes('permission')) ? 'No access. You need admin.governance.incidents.manage.' : msg)
      setItems([])
      setTotal(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [filterProducerOrgId, filterEntityType, filterEntityId, filterIncidentType, filterSeverity, filterActionTaken, filterResolved, filterDateFrom, filterDateTo, searchQ, page, limit])

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await getGovernance<IncidentsStats>('/admin/incidents/stats')
      const data = res?.data
      if (data && typeof data === 'object' && typeof (data as IncidentsStats).total === 'number') {
        setStats(data as IncidentsStats)
      } else {
        setStats(null)
      }
    } catch {
      setStats(null)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const loadDetail = useCallback(async (id: number) => {
    setDetailLoading(true)
    try {
      const res = await getGovernance<IncidentRow>(`/admin/incidents/${id}`)
      setDetail(res.data ?? null)
    } catch {
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    setFilterProducerOrgId(urlProducerOrgId)
  }, [urlProducerOrgId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    if (detailId != null) loadDetail(detailId)
    else setDetail(null)
  }, [detailId, loadDetail])

  const handleResolve = async () => {
    if (detailId == null) return
    setResolveSubmitting(true)
    try {
      await postGovernance(`/admin/incidents/${detailId}/resolve`, { resolutionNote: resolveNote.trim() || undefined })
      setResolveModalOpen(false)
      setResolveNote('')
      setDetail(null)
      setDetailId(null)
      load()
      loadStats()
    } catch (e) {
      console.error(e)
    } finally {
      setResolveSubmitting(false)
    }
  }

  const resetFilters = () => {
    setFilterProducerOrgId(urlProducerOrgId)
    setFilterEntityType('')
    setFilterEntityId('')
    setFilterIncidentType('')
    setFilterSeverity('')
    setFilterActionTaken('')
    setFilterResolved('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setSearchQ('')
    setPage(1)
  }

  const link = detail ? entityLink(detail) : null

  return (
    <AdminPageShell
      title="Enforcement & incidents"
      breadcrumbs={[{ href: '/admin', label: 'Admin' }, { label: 'Producer Governance' }, { label: 'Enforcement' }]}
      actions={
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <Link href="/admin/approvals" className="btn btn-outline-secondary btn-sm">Approvals</Link>
          <Link href="/admin/batch-control" className="btn btn-outline-secondary btn-sm">Batch control</Link>
          <Link href="/admin/producer-governance" className="btn btn-outline-secondary btn-sm">Producers</Link>
          <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setCreateModalOpen(true)}>Create incident</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      }
    >
      <p className="text-secondary small mb-3">
        Governance incidents from hide/unhide, freeze/unfreeze, suspend/unsuspend. Filter and resolve.
      </p>

      {/* Summary KPI cards */}
      <div className="row g-2 mb-4">
        <div className="col-6 col-md-4">
          <button
            type="button"
            className="card border-0 shadow-sm w-100 text-start text-decoration-none text-dark h-100"
            onClick={() => { setFilterResolved(''); setPage(1); load(); }}
          >
            <div className="card-body py-3">
              <div className="small text-muted">Total incidents</div>
              <div className="h4 mb-0">{statsLoading ? '—' : (stats?.total ?? 0)}</div>
            </div>
          </button>
        </div>
        <div className="col-6 col-md-4">
          <button
            type="button"
            className="card border-0 shadow-sm w-100 text-start text-decoration-none text-dark h-100"
            onClick={() => { setFilterResolved('false'); setPage(1); load(); }}
          >
            <div className="card-body py-3">
              <div className="small text-muted">Unresolved</div>
              <div className="h4 mb-0 text-warning">{statsLoading ? '—' : (stats?.unresolved ?? 0)}</div>
            </div>
          </button>
        </div>
        <div className="col-6 col-md-4">
          <button
            type="button"
            className="card border-0 shadow-sm w-100 text-start text-decoration-none text-dark h-100"
            onClick={() => { setFilterResolved('true'); setPage(1); load(); }}
          >
            <div className="card-body py-3">
              <div className="small text-muted">Resolved</div>
              <div className="h4 mb-0 text-success">{statsLoading ? '—' : (stats?.resolved ?? 0)}</div>
            </div>
          </button>
        </div>
      </div>

      <AdminFiltersBar
        searchPlaceholder="Search reason or ticket ID…"
        searchValue={searchQ}
        onSearchChange={setSearchQ}
        filterValues={{
          producerOrgId: filterProducerOrgId,
          entityType: filterEntityType,
          entityId: filterEntityId,
          incidentType: filterIncidentType,
          severity: filterSeverity,
          actionTaken: filterActionTaken,
          resolved: filterResolved,
          dateFrom: filterDateFrom,
          dateTo: filterDateTo,
        }}
        onFilterChange={(key, value) => {
          if (key === 'producerOrgId') setFilterProducerOrgId(value)
          if (key === 'entityType') setFilterEntityType(value)
          if (key === 'entityId') setFilterEntityId(value)
          if (key === 'incidentType') setFilterIncidentType(value)
          if (key === 'severity') setFilterSeverity(value)
          if (key === 'actionTaken') setFilterActionTaken(value)
          if (key === 'resolved') setFilterResolved(value)
          if (key === 'dateFrom') setFilterDateFrom(value)
          if (key === 'dateTo') setFilterDateTo(value)
          setPage(1)
        }}
        onReset={resetFilters}
        filters={[
          { key: 'producerOrgId', label: 'Producer org ID', render: (v, onChange) => <input id="admin-filter-producerOrgId" type="text" className="form-control form-control-sm" style={{ width: 100 }} placeholder="Org ID" value={v} onChange={(e) => onChange(e.target.value)} /> },
          {
            key: 'entityType',
            label: 'Entity',
            render: (v, onChange) => (
              <select id="admin-filter-entityType" className="form-select form-select-sm" style={{ width: 120 }} value={v} onChange={(e) => onChange(e.target.value)}>
                {ENTITY_TYPE_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                ))}
              </select>
            ),
          },
          { key: 'entityId', label: 'Entity ID', render: (v, onChange) => <input id="admin-filter-entityId" type="text" className="form-control form-control-sm" style={{ width: 90 }} placeholder="ID" value={v} onChange={(e) => onChange(e.target.value)} /> },
          {
            key: 'incidentType',
            label: 'Type',
            render: (v, onChange) => (
              <select id="admin-filter-incidentType" className="form-select form-select-sm" style={{ width: 140 }} value={v} onChange={(e) => onChange(e.target.value)}>
                {INCIDENT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                ))}
              </select>
            ),
          },
          {
            key: 'severity',
            label: 'Severity',
            render: (v, onChange) => (
              <select id="admin-filter-severity" className="form-select form-select-sm" style={{ width: 100 }} value={v} onChange={(e) => onChange(e.target.value)}>
                {SEVERITY_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                ))}
              </select>
            ),
          },
          { key: 'actionTaken', label: 'Action', render: (v, onChange) => <input id="admin-filter-actionTaken" type="text" className="form-control form-control-sm" style={{ width: 100 }} placeholder="e.g. HIDDEN" value={v} onChange={(e) => onChange(e.target.value)} /> },
          {
            key: 'resolved',
            label: 'Resolved',
            render: (v, onChange) => (
              <select id="admin-filter-resolved" className="form-select form-select-sm" style={{ width: 100 }} value={v} onChange={(e) => onChange(e.target.value)}>
                {RESOLVED_OPTIONS.map((o) => (
                  <option key={o.value || 'any'} value={o.value}>{o.label}</option>
                ))}
              </select>
            ),
          },
          { key: 'dateFrom', label: 'From', render: (v, onChange) => <input id="admin-filter-dateFrom" type="date" className="form-control form-control-sm" style={{ width: 130 }} value={v} onChange={(e) => onChange(e.target.value)} /> },
          { key: 'dateTo', label: 'To', render: (v, onChange) => <input id="admin-filter-dateTo" type="date" className="form-control form-control-sm" style={{ width: 130 }} value={v} onChange={(e) => onChange(e.target.value)} /> },
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
              <DataTable<IncidentRow>
                keyField="id"
                loading={loading}
                rows={items}
                columns={[
                  { key: 'id', label: 'ID', render: (r) => <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none" onClick={() => setDetailId(r.id)}>{r.id}</button> },
                  { key: 'entity', label: 'Entity', render: (r) => { const l = entityLink(r); return <Link href={l.href}>{l.label}</Link> } },
                  { key: 'entityType', label: 'Type', render: (r) => r.entityType },
                  { key: 'incidentType', label: 'Incident type', render: (r) => r.incidentType },
                  { key: 'severity', label: 'Severity', render: (r) => <span className={`badge ${r.severity === 'CRITICAL' ? 'bg-danger' : r.severity === 'HIGH' ? 'bg-warning text-dark' : 'bg-secondary'}`}>{r.severity}</span> },
                  { key: 'actionTaken', label: 'Action', render: (r) => r.actionTaken },
                  { key: 'reason', label: 'Reason', render: (r) => (r.reason?.slice(0, 50) ?? '') + (r.reason && r.reason.length > 50 ? '…' : '') },
                  { key: 'ticketId', label: 'Ticket', render: (r) => r.ticketId ?? '—' },
                  { key: 'producerOrg', label: 'Producer', render: (r) => r.producerOrg ? <Link href={`/admin/producer-governance/${r.producerOrg.id}`}>{r.producerOrg.name}</Link> : '—' },
                  { key: 'resolved', label: 'Resolved', render: (r) => r.resolvedAt ? <span className="badge bg-success">Yes</span> : <span className="badge bg-secondary">No</span> },
                  { key: 'createdAt', label: 'Created', render: (r) => r.createdAt ? new Date(r.createdAt).toLocaleString() : '—' },
                ]}
                emptyState={
                  <EmptyState
                    title="No incidents yet"
                    description={
                      <>
                        <p className="mb-2">Incidents are created when you:</p>
                        <ul className="text-start small mb-2">
                          <li>Hide or unhide a product (Approvals)</li>
                          <li>Freeze or unfreeze a batch (Batch control)</li>
                          <li>Suspend or unsuspend a producer (Producers)</li>
                        </ul>
                        <p className="mb-0">You can also create an incident manually below.</p>
                      </>
                    }
                    action={
                      <div className="d-flex flex-wrap gap-2 justify-content-center">
                        <Link href="/admin/approvals" className="btn btn-outline-primary btn-sm">Go to Approvals</Link>
                        <Link href="/admin/batch-control" className="btn btn-outline-primary btn-sm">Batch control</Link>
                        <Link href="/admin/producer-governance" className="btn btn-outline-primary btn-sm">Producers</Link>
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreateModalOpen(true)}>Create incident</button>
                      </div>
                    }
                  />
                }
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
                ariaLabel="Governance incidents pages"
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

      {/* Incident detail drawer (offcanvas) */}
      {detailId != null && (
        <div className="offcanvas offcanvas-end show" tabIndex={-1} style={{ visibility: 'visible', width: 400 }} aria-modal="true">
          <div className="offcanvas-header">
            <h5 className="offcanvas-title">Incident #{detailId}</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={() => { setDetailId(null); setDetail(null); setResolveModalOpen(false); }} />
          </div>
          <div className="offcanvas-body">
            {detailLoading ? (
              <LoadingSkeleton rows={4} />
            ) : detail ? (
              <dl className="small mb-0">
                <dt>Entity</dt>
                <dd>{link ? <Link href={link.href}>{link.label}</Link> : `${detail.entityType} #${detail.entityId}`}</dd>
                <dt>Reason</dt>
                <dd className="text-break">{detail.reason ?? '—'}</dd>
                <dt>Severity</dt>
                <dd><span className={`badge ${detail.severity === 'CRITICAL' ? 'bg-danger' : detail.severity === 'HIGH' ? 'bg-warning text-dark' : 'bg-secondary'}`}>{detail.severity}</span></dd>
                <dt>Action taken</dt>
                <dd>{detail.actionTaken}</dd>
                <dt>Ticket ID</dt>
                <dd>{detail.ticketId ?? '—'}</dd>
                <dt>Created</dt>
                <dd>{detail.createdAt ? new Date(detail.createdAt).toLocaleString() : '—'}</dd>
                <dt>Created by (user ID)</dt>
                <dd>{detail.createdByUserId}</dd>
                <dt>Resolved at</dt>
                <dd>{detail.resolvedAt ? new Date(detail.resolvedAt).toLocaleString() : '—'}</dd>
                <dt>Resolution note</dt>
                <dd className="text-break">{detail.resolutionNote ?? '—'}</dd>
              </dl>
            ) : (
              <p className="text-secondary">Failed to load incident.</p>
            )}
            {detail && !detail.resolvedAt && (
              <div className="mt-3">
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setResolveModalOpen(true)}>Resolve</button>
              </div>
            )}
          </div>
        </div>
      )}
      {detailId != null && <div className="offcanvas-backdrop show" onClick={() => { setDetailId(null); setDetail(null); setResolveModalOpen(false); }} />}

      {/* Resolve modal */}
      {resolveModalOpen && detailId != null && (
        <div className="modal show d-block" tabIndex={-1} aria-modal="true">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Resolve incident #{detailId}</h5>
                <button type="button" className="btn-close" onClick={() => setResolveModalOpen(false)} aria-label="Close" />
              </div>
              <div className="modal-body">
                <label className="form-label">Resolution note (optional)</label>
                <textarea className="form-control" rows={3} value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} placeholder="e.g. Issue addressed with producer." />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setResolveModalOpen(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleResolve} disabled={resolveSubmitting}>{resolveSubmitting ? 'Saving…' : 'Resolve'}</button>
              </div>
            </div>
          </div>
          <div className="modal-backdrop show" onClick={() => setResolveModalOpen(false)} />
        </div>
      )}

      {/* Create incident modal (optional) */}
      {createModalOpen && (
        <CreateIncidentModal
          onClose={() => setCreateModalOpen(false)}
          onCreated={() => { setCreateModalOpen(false); load(); loadStats(); }}
        />
      )}
    </AdminPageShell>
  )
}

function CreateIncidentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [entityType, setEntityType] = useState('PRODUCT')
  const [entityId, setEntityId] = useState('')
  const [producerOrgId, setProducerOrgId] = useState('')
  const [incidentType, setIncidentType] = useState('POLICY_VIOLATION')
  const [severity, setSeverity] = useState('MEDIUM')
  const [actionTaken, setActionTaken] = useState('WARNING')
  const [reason, setReason] = useState('')
  const [ticketId, setTicketId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const eId = Number(entityId)
    const pId = Number(producerOrgId)
    if (!entityType || !Number.isFinite(eId) || !Number.isFinite(pId)) {
      setErr('Entity type, entity ID, and producer org ID are required.')
      return
    }
    if (reason.trim().length < 5) {
      setErr('Reason is required (min 5 characters).')
      return
    }
    setErr('')
    setSubmitting(true)
    try {
      await postGovernance('/admin/incidents', {
        entityType,
        entityId: eId,
        producerOrgId: pId,
        incidentType,
        severity,
        actionTaken,
        reason: reason.trim(),
        ticketId: ticketId.trim() || undefined,
      })
      onCreated()
    } catch (e) {
      setErr((e as Error).message ?? 'Failed to create incident')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal show d-block" tabIndex={-1} aria-modal="true">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Create incident</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {err ? <div className="alert alert-danger small">{err}</div> : null}
              <div className="mb-2">
                <label className="form-label small">Entity type</label>
                <select className="form-select form-select-sm" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
                  <option value="PRODUCT">Product</option>
                  <option value="BATCH">Batch</option>
                  <option value="PRODUCER_ORG">Producer</option>
                </select>
              </div>
              <div className="mb-2">
                <label className="form-label small">Entity ID *</label>
                <input type="number" className="form-control form-control-sm" value={entityId} onChange={(e) => setEntityId(e.target.value)} required />
              </div>
              <div className="mb-2">
                <label className="form-label small">Producer org ID *</label>
                <input type="number" className="form-control form-control-sm" value={producerOrgId} onChange={(e) => setProducerOrgId(e.target.value)} required />
              </div>
              <div className="mb-2">
                <label className="form-label small">Incident type</label>
                <select className="form-select form-select-sm" value={incidentType} onChange={(e) => setIncidentType(e.target.value)}>
                  <option value="POLICY_VIOLATION">Policy violation</option>
                  <option value="HIDDEN">Hidden</option>
                  <option value="RESTORATION">Restoration</option>
                  <option value="FROZEN">Frozen</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
              <div className="mb-2">
                <label className="form-label small">Severity</label>
                <select className="form-select form-select-sm" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div className="mb-2">
                <label className="form-label small">Action taken</label>
                <input type="text" className="form-control form-control-sm" value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} placeholder="e.g. WARNING" />
              </div>
              <div className="mb-2">
                <label className="form-label small">Reason * (min 5 chars)</label>
                <textarea className="form-control form-control-sm" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} required minLength={5} />
              </div>
              <div className="mb-2">
                <label className="form-label small">Ticket ID (optional)</label>
                <input type="text" className="form-control form-control-sm" value={ticketId} onChange={(e) => setTicketId(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating…' : 'Create'}</button>
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop show" onClick={onClose} />
    </div>
  )
}
