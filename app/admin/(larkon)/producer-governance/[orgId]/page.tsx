'use client'

import { useCallback, useEffect, useState } from 'react'

/** Escape CSV cell to prevent formula injection: prefix leading = + - @ with apostrophe. */
function safeCsvCell (v: unknown): string {
  const s = String(v ?? '')
  if (/^[=+\-@]/.test(s)) return `'${s}`
  return s
}
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import SectionCard from '@/src/bpa/admin/components/SectionCard'
import StatusChip from '@/src/bpa/admin/components/StatusChip'
import StatCard from '@/src/bpa/admin/components/StatCard'
import ErrorState from '@/src/bpa/admin/components/ErrorState'
import LoadingSkeleton from '@/src/bpa/admin/components/LoadingSkeleton'
import TimelineView from '@/src/bpa/admin/components/TimelineView'
import DataTable from '@/src/bpa/admin/components/DataTable'
import EmptyState from '@/src/bpa/admin/components/EmptyState'
import { getGovernance, postGovernance, putGovernance } from '@/src/bpa/admin/lib/governanceApi'

type TabKey = 'overview' | 'staff' | 'approvals' | 'limits' | 'audit' | 'incidents' | 'printjobs'

type DetailData = {
  orgId: number
  name: string
  status: string
  kycStatus?: string
  ownerUserId?: number
  createdAt?: string
  lastActivityAt?: string
  metrics?: { pendingApprovals?: number; printsToday?: number; batchCreatesToday?: number }
  owner?: { id?: number; profile?: { displayName?: string }; auth?: { email?: string; phone?: string } }
  flags?: { key: string; enabled: boolean }[]
  quotas?: { key: string; limit: number; used: number; resetPeriod: string }[]
}

type StaffRow = {
  id?: number
  userId?: number
  user?: { id?: number; profile?: { displayName?: string }; auth?: { email?: string } }
  role?: { key?: string; label?: string }
  status?: string
}
type AuditRow = { id: number; actionKey: string; entityType?: string; entityId?: string; createdAt: string; metadata?: unknown }
type MetricsData = {
  orgId: number
  name: string
  status: string
  lastActivityAt?: string
  counts?: {
    pendingApprovals: number
    printsToday: number
    batchCreatesToday: number
    staffCount: number
    auditEventsLast24h: number
  }
  usage?: { key: string; limit: number; used: number }[]
}
type PrintJobRow = { id: number; action: string; entityType: string; entityId?: string; actorType: string; actorId: number; createdAt: string }
type IncidentRow = { id: number; entityType: string; entityId: number; incidentType: string; severity: string; actionTaken: string; reason: string; ticketId?: string | null; resolvedAt?: string | null; createdAt: string }

export default function ProducerGovernanceDetailPage() {
  const params = useParams<{ orgId: string }>()
  const router = useRouter()
  const orgId = params?.orgId ? Number(params.orgId) : NaN
  const [tab, setTab] = useState<TabKey>('overview')
  const [detail, setDetail] = useState<DetailData | null>(null)
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [audit, setAudit] = useState<AuditRow[]>([])
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [printJobs, setPrintJobs] = useState<PrintJobRow[]>([])
  const [incidents, setIncidents] = useState<IncidentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const [flagsEdit, setFlagsEdit] = useState<{ key: string; enabled: boolean }[]>([])
  const [quotasEdit, setQuotasEdit] = useState<{ key: string; limit: number; used: number; resetPeriod: string }[]>([])
  const [auditFilters, setAuditFilters] = useState({ fromDate: '', toDate: '', entityType: '', actionKey: '' })
  const [hasIncidentsPermission, setHasIncidentsPermission] = useState(false)
  const showPrintJobsTab = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_PRODUCER_GOVERNANCE_PRINT_JOBS_TAB !== 'false'

  useEffect(() => {
    let cancelled = false
    fetch('/api/v1/admin/auth/me', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } })
      .then((r) => r.ok ? r.json() : null)
      .then((body) => {
        if (cancelled || !body?.permissions) return
        const perms = Array.isArray(body.permissions) ? body.permissions : []
        setHasIncidentsPermission(perms.includes('admin.governance.incidents.manage'))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // If user lacks incidents permission and had that tab selected, switch to overview
  useEffect(() => {
    if (!hasIncidentsPermission && tab === 'incidents') setTab('overview')
  }, [hasIncidentsPermission, tab])

  const loadDetail = useCallback(async () => {
    if (!Number.isFinite(orgId) || orgId <= 0) {
      setError('Invalid producer ID')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await getGovernance<DetailData>(`/admin/producers/${orgId}`)
      const d = res.data
      if (!d) {
        setError('Producer not found')
        setDetail(null)
        return
      }
      setDetail(d)
      setFlagsEdit(d.flags ?? [])
      setQuotasEdit(d.quotas ?? [])
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load')
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  const loadStaff = useCallback(async () => {
    if (!Number.isFinite(orgId) || orgId <= 0) return
    try {
      const res = await getGovernance<StaffRow[]>(`/admin/producers/${orgId}/staff`)
      setStaff(Array.isArray(res.data) ? res.data : [])
    } catch {
      setStaff([])
    }
  }, [orgId])

  const loadAudit = useCallback(async () => {
    if (!Number.isFinite(orgId) || orgId <= 0) return
    try {
      const params = new URLSearchParams()
      params.set('limit', '100')
      if (auditFilters.fromDate) params.set('fromDate', auditFilters.fromDate)
      if (auditFilters.toDate) params.set('toDate', auditFilters.toDate)
      if (auditFilters.entityType) params.set('entityType', auditFilters.entityType)
      if (auditFilters.actionKey) params.set('actionKey', auditFilters.actionKey)
      const res = await getGovernance<{ items: AuditRow[] }>(`/admin/producers/${orgId}/audit?${params}`)
      setAudit(res.data?.items ?? [])
    } catch {
      setAudit([])
    }
  }, [orgId, auditFilters.fromDate, auditFilters.toDate, auditFilters.entityType, auditFilters.actionKey])

  const loadMetrics = useCallback(async () => {
    if (!Number.isFinite(orgId) || orgId <= 0) return
    try {
      const res = await getGovernance<MetricsData>(`/admin/producers/${orgId}/metrics`)
      setMetrics(res.data ?? null)
    } catch {
      setMetrics(null)
    }
  }, [orgId])

  const loadPrintJobs = useCallback(async () => {
    if (!Number.isFinite(orgId) || orgId <= 0) return
    try {
      const res = await getGovernance<{ items: PrintJobRow[]; total: number }>(`/admin/producers/${orgId}/print-jobs?limit=50`)
      setPrintJobs(res.data?.items ?? [])
    } catch {
      setPrintJobs([])
    }
  }, [orgId])

  const loadIncidents = useCallback(async () => {
    if (!Number.isFinite(orgId) || orgId <= 0) return
    try {
      const res = await getGovernance<{ data: IncidentRow[]; total: number }>(`/admin/incidents?producerOrgId=${orgId}&limit=50`)
      setIncidents(Array.isArray(res.data?.data) ? res.data.data : [])
    } catch {
      setIncidents([])
    }
  }, [orgId])

  useEffect(() => {
    loadDetail()
  }, [loadDetail])

  useEffect(() => {
    if (tab === 'staff') loadStaff()
    if (tab === 'audit') loadAudit()
    if (tab === 'overview') loadMetrics()
    if (tab === 'incidents') loadIncidents()
    if (tab === 'printjobs' && showPrintJobsTab) loadPrintJobs()
  }, [tab, loadStaff, loadAudit, loadMetrics, loadIncidents, loadPrintJobs, showPrintJobsTab])

  const handleSuspend = async () => {
    if (!detail || !confirm('Suspend this producer organization? They will not be able to perform producer actions.')) return
    setActionError('')
    setBusy(true)
    try {
      await postGovernance(`/admin/producers/${orgId}/suspend`, { reason: 'Suspended from admin' })
      await loadDetail()
    } catch (e) {
      setActionError((e as Error).message ?? 'Failed to suspend')
    } finally {
      setBusy(false)
    }
  }

  const handleUnsuspend = async () => {
    if (!detail || !confirm('Unsuspend this producer organization?')) return
    setActionError('')
    setBusy(true)
    try {
      await postGovernance(`/admin/producers/${orgId}/unsuspend`, { reason: 'Unsuspended from admin' })
      await loadDetail()
    } catch (e) {
      setActionError((e as Error).message ?? 'Failed to unsuspend')
    } finally {
      setBusy(false)
    }
  }

  const handleSaveFlags = async () => {
    setActionError('')
    setBusy(true)
    try {
      await putGovernance(`/admin/producers/${orgId}/flags`, {
        flags: flagsEdit.map((f) => ({ key: f.key, enabled: f.enabled })),
        reason: 'Updated from admin',
      })
      await loadDetail()
    } catch (e) {
      setActionError((e as Error).message ?? 'Failed to save flags')
    } finally {
      setBusy(false)
    }
  }

  const handleSaveQuotas = async () => {
    setActionError('')
    setBusy(true)
    try {
      await putGovernance(`/admin/producers/${orgId}/quotas`, {
        quotas: quotasEdit.map((q) => ({ key: q.key, limit: q.limit, resetPeriod: q.resetPeriod || 'DAILY' })),
        reason: 'Updated from admin',
      })
      await loadDetail()
    } catch (e) {
      setActionError((e as Error).message ?? 'Failed to save quotas')
    } finally {
      setBusy(false)
    }
  }

  if (!Number.isFinite(orgId) || orgId <= 0) {
    return (
      <AdminPageShell title="Producer" breadcrumbs={[{ label: 'Producer Governance' }, { label: 'Invalid' }]}>
        <ErrorState message="Invalid producer ID" onRetry={() => router.push('/admin/producer-governance')} />
      </AdminPageShell>
    )
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'staff', label: 'Staff' },
    { key: 'approvals', label: 'Approvals' },
    { key: 'limits', label: 'Limits & Policies' },
    { key: 'audit', label: 'Audit Timeline' },
    ...(hasIncidentsPermission ? [{ key: 'incidents' as TabKey, label: 'Incident History' }] : []),
    ...(showPrintJobsTab ? [{ key: 'printjobs' as TabKey, label: 'Print jobs' }] : []),
  ]

  if (loading && !detail) {
    return (
      <AdminPageShell
        title="Producer"
        breadcrumbs={[{ label: 'Producer Governance', href: '/admin/producer-governance' }, { label: `#${orgId}` }]}
      >
        <LoadingSkeleton rows={10} />
      </AdminPageShell>
    )
  }

  if (error && !detail) {
    return (
      <AdminPageShell
        title="Producer"
        breadcrumbs={[{ label: 'Producer Governance', href: '/admin/producer-governance' }, { label: `#${orgId}` }]}
      >
        <ErrorState message={error} onRetry={loadDetail} />
        <Link href="/admin/producer-governance" className="btn btn-outline-secondary btn-sm mt-2">← Back to list</Link>
      </AdminPageShell>
    )
  }

  const owner = detail?.owner
  const ownerName = owner?.profile?.displayName ?? owner?.auth?.email ?? `User #${detail?.ownerUserId ?? '—'}`

  return (
    <AdminPageShell
      title={detail?.name ?? `Producer #${orgId}`}
      breadcrumbs={[
        { label: 'Producer Governance', href: '/admin/producer-governance' },
        { label: detail?.name ?? `#${orgId}` },
      ]}
      actions={
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <Link href="/admin/producer-governance" className="btn btn-outline-secondary btn-sm">← Back</Link>
          <Link href={`/admin/approvals?producerOrgId=${orgId}`} className="btn btn-outline-primary btn-sm">Approvals</Link>
          {detail?.status === 'SUSPENDED' ? (
            <button type="button" className="btn btn-success btn-sm" onClick={handleUnsuspend} disabled={busy}>
              {busy ? '…' : 'Unsuspend'}
            </button>
          ) : (
            <button type="button" className="btn btn-warning btn-sm" onClick={handleSuspend} disabled={busy}>
              {busy ? '…' : 'Suspend'}
            </button>
          )}
        </div>
      }
    >
      {error ? <ErrorState message={error} onRetry={loadDetail} /> : null}
      {actionError ? <ErrorState message={actionError} className="mt-2" /> : null}

      <div className="d-flex flex-wrap gap-2 mb-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && detail && (
        <div className="row g-3">
          <div className="col-12">
            <SectionCard title="Details">
              <div className="row g-2 small">
                <div className="col-6 col-md-3"><span className="text-secondary">Status</span><br /><StatusChip status={detail.status} /></div>
                <div className="col-6 col-md-3"><span className="text-secondary">KYC</span><br /><StatusChip status={detail.kycStatus ?? detail.status} /></div>
                <div className="col-6 col-md-3"><span className="text-secondary">Owner</span><br />{ownerName}</div>
                <div className="col-6 col-md-3"><span className="text-secondary">Created</span><br />{detail.createdAt ? new Date(detail.createdAt).toLocaleString() : '—'}</div>
              </div>
            </SectionCard>
          </div>
          {detail.metrics && (
            <div className="col-12 col-md-4">
              <StatCard title="Pending approvals" value={detail.metrics.pendingApprovals} tone="warning" />
            </div>
          )}
          {detail.metrics && (
            <div className="col-12 col-md-4">
              <StatCard title="Prints today" value={detail.metrics.printsToday} tone="info" />
            </div>
          )}
          {detail.metrics && (
            <div className="col-12 col-md-4">
              <StatCard title="Batch creates today" value={detail.metrics.batchCreatesToday} tone="primary" />
            </div>
          )}
          {(metrics?.counts ?? detail?.metrics) && (
            <div className="col-12">
              <SectionCard title="Metrics">
                <div className="row g-2 small">
                  {(metrics?.counts ?? detail?.metrics) && (
                    <>
                      <div className="col-6 col-md-2"><span className="text-secondary">Staff count</span><br />{(metrics?.counts?.staffCount ?? 0)}</div>
                      <div className="col-6 col-md-2"><span className="text-secondary">Audit events (24h)</span><br />{(metrics?.counts?.auditEventsLast24h ?? 0)}</div>
                      <div className="col-6 col-md-2"><span className="text-secondary">Last activity</span><br />{metrics?.lastActivityAt ? new Date(metrics.lastActivityAt).toLocaleString() : '—'}</div>
                    </>
                  )}
                </div>
                {metrics?.usage && metrics.usage.length > 0 && (
                  <div className="mt-2 pt-2 border-top">
                    <span className="text-secondary small d-block mb-1">Usage vs limits</span>
                    <div className="d-flex flex-column gap-1">
                      {metrics.usage.map((u) => (
                        <div key={u.key} className="d-flex align-items-center gap-2">
                          <span className="small text-nowrap" style={{ minWidth: 120 }}>{u.key}</span>
                          <div className="flex-grow-1 bg-light rounded" style={{ height: 8, minWidth: 80 }}>
                            <div className="bg-primary rounded" style={{ width: `${u.limit ? Math.min(100, (u.used / u.limit) * 100) : 0}%`, height: 8 }} />
                          </div>
                          <span className="small text-secondary">{u.used} / {u.limit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </SectionCard>
            </div>
          )}
        </div>
      )}

      {tab === 'staff' && (
        <SectionCard title="Staff">
          <DataTable<StaffRow>
            columns={[
              { key: 'userId', label: 'User ID', render: (r) => r.userId ?? r.user?.id ?? '—' },
              { key: 'name', label: 'Name', render: (r) => r.user?.profile?.displayName ?? '—' },
              { key: 'email', label: 'Email', render: (r) => r.user?.auth?.email ?? '—' },
              { key: 'role', label: 'Role', render: (r) => r.role?.label ?? r.role?.key ?? '—' },
              { key: 'status', label: 'Status', render: (r) => <StatusChip status={r.status ?? '—'} /> },
            ]}
            rows={staff}
            keyField="id"
            emptyState={<EmptyState title="No staff" />}
          />
        </SectionCard>
      )}

      {tab === 'approvals' && (
        <SectionCard
          title="Pending approvals"
          right={<Link href={`/admin/approvals?producerOrgId=${orgId}`} className="btn btn-sm btn-primary">Open queue</Link>}
        >
          <p className="text-secondary small mb-0">
            Use the Approvals queue to approve or reject pending product/batch approvals for this producer.
          </p>
        </SectionCard>
      )}

      {tab === 'limits' && detail && (
        <div className="row g-3">
          <div className="col-12 col-lg-6">
            <SectionCard title="Feature flags" right={<button type="button" className="btn btn-sm btn-primary" onClick={handleSaveFlags} disabled={busy}>Save</button>}>
              <div className="d-flex flex-column gap-2">
                {flagsEdit.map((f) => (
                  <div key={f.key} className="d-flex align-items-center justify-content-between">
                    <span className="small">{f.key}</span>
                    <input
                      type="checkbox"
                      checked={f.enabled}
                      onChange={(e) => setFlagsEdit((prev) => prev.map((x) => (x.key === f.key ? { ...x, enabled: e.target.checked } : x)))}
                    />
                  </div>
                ))}
                {flagsEdit.length === 0 ? <EmptyState title="No flags" /> : null}
              </div>
            </SectionCard>
          </div>
          <div className="col-12 col-lg-6">
            <SectionCard title="Quotas" right={<button type="button" className="btn btn-sm btn-primary" onClick={handleSaveQuotas} disabled={busy}>Save</button>}>
              <div className="d-flex flex-column gap-2">
                {quotasEdit.map((q) => (
                  <div key={q.key} className="d-flex align-items-center gap-2 flex-wrap">
                    <span className="small flex-grow-1">{q.key}</span>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      style={{ width: 80 }}
                      value={q.limit}
                      onChange={(e) => setQuotasEdit((prev) => prev.map((x) => (x.key === q.key ? { ...x, limit: Number(e.target.value) || 0 } : x)))}
                    />
                    <span className="text-secondary small">used: {q.used}</span>
                  </div>
                ))}
                {quotasEdit.length === 0 ? <EmptyState title="No quotas" /> : null}
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {tab === 'incidents' && (
        <SectionCard
          title="Incident History"
          right={<Link href={`/admin/enforcement?producerOrgId=${orgId}`} className="btn btn-sm btn-primary">View all in Enforcement</Link>}
        >
          <p className="text-secondary small mb-2">
            Incidents for this producer (hide/unhide, freeze/unfreeze, suspend/unsuspend). Open Enforcement to filter and resolve.
          </p>
          <DataTable<IncidentRow>
            keyField="id"
            rows={incidents}
            columns={[
              { key: 'id', label: 'ID', render: (r) => <Link href={`/admin/enforcement?producerOrgId=${orgId}`}>{r.id}</Link> },
              { key: 'entityType', label: 'Entity', render: (r) => `${r.entityType} #${r.entityId}` },
              { key: 'incidentType', label: 'Type', render: (r) => r.incidentType },
              { key: 'severity', label: 'Severity', render: (r) => <span className={`badge ${r.severity === 'CRITICAL' ? 'bg-danger' : r.severity === 'HIGH' ? 'bg-warning text-dark' : 'bg-secondary'}`}>{r.severity}</span> },
              { key: 'actionTaken', label: 'Action', render: (r) => r.actionTaken },
              { key: 'reason', label: 'Reason', render: (r) => (r.reason?.slice(0, 40) ?? '') + (r.reason && r.reason.length > 40 ? '…' : '') },
              { key: 'resolved', label: 'Resolved', render: (r) => r.resolvedAt ? 'Yes' : 'No' },
              { key: 'createdAt', label: 'Created', render: (r) => r.createdAt ? new Date(r.createdAt).toLocaleString() : '—' },
            ]}
            emptyState={<EmptyState title="No incidents" description="Incidents from enforcement actions will appear here." />}
          />
        </SectionCard>
      )}

      {tab === 'audit' && (
        <SectionCard
          title="Audit timeline"
          right={
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                const head = 'id,action,entityType,entityId,createdAt\n'
                const rows = audit.map((a) => [a.id, a.actionKey, a.entityType, a.entityId, a.createdAt].map((c) => safeCsvCell(c).replace(/,/g, ';')).join(',')).join('\n')
                const blob = new Blob([head + rows], { type: 'text/csv;charset=utf-8' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `producer-${orgId}-audit-${new Date().toISOString().slice(0, 10)}.csv`
                a.click()
                URL.revokeObjectURL(url)
              }}
            >
              Export CSV
            </button>
          }
        >
          <div className="row g-2 mb-3">
            <div className="col-6 col-md-3">
              <label className="form-label small mb-0">From date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={auditFilters.fromDate}
                onChange={(e) => setAuditFilters((f) => ({ ...f, fromDate: e.target.value }))}
              />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label small mb-0">To date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={auditFilters.toDate}
                onChange={(e) => setAuditFilters((f) => ({ ...f, toDate: e.target.value }))}
              />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label small mb-0">Action</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="e.g. BATCH_CREATED"
                value={auditFilters.actionKey}
                onChange={(e) => setAuditFilters((f) => ({ ...f, actionKey: e.target.value }))}
              />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label small mb-0">Entity type</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="e.g. AuthBatch"
                value={auditFilters.entityType}
                onChange={(e) => setAuditFilters((f) => ({ ...f, entityType: e.target.value }))}
              />
            </div>
            <div className="col-12 col-md-2 d-flex align-items-end">
              <button type="button" className="btn btn-sm btn-primary w-100" onClick={() => loadAudit()}>Apply</button>
            </div>
          </div>
          <TimelineView
            logs={audit.map((a) => ({
              id: a.id,
              action: a.actionKey,
              createdAt: a.createdAt,
              fromStatus: (a.metadata as { fromStatus?: string })?.fromStatus,
              toStatus: (a.metadata as { toStatus?: string })?.toStatus,
              note: (a.metadata as { reason?: string })?.reason,
            }))}
            emptyMessage="No audit events yet."
          />
        </SectionCard>
      )}

      {tab === 'printjobs' && showPrintJobsTab && (
        <SectionCard
          title="Print jobs"
          right={
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                const head = 'id,action,entityType,entityId,actorType,actorId,createdAt\n'
                const rows = printJobs.map((p) => [p.id, p.action, p.entityType, p.entityId, p.actorType, p.actorId, p.createdAt].map((c) => safeCsvCell(c).replace(/,/g, ';')).join(',')).join('\n')
                const blob = new Blob([head + rows], { type: 'text/csv;charset=utf-8' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `producer-${orgId}-print-jobs-${new Date().toISOString().slice(0, 10)}.csv`
                a.click()
                URL.revokeObjectURL(url)
              }}
            >
              Export CSV
            </button>
          }
        >
          <DataTable<PrintJobRow>
            columns={[
              { key: 'id', label: 'ID', render: (r) => r.id },
              { key: 'action', label: 'Action', render: (r) => r.action },
              { key: 'entityType', label: 'Entity', render: (r) => `${r.entityType} ${r.entityId ?? ''}`.trim() },
              { key: 'actorType', label: 'Actor', render: (r) => `${r.actorType} #${r.actorId}` },
              { key: 'createdAt', label: 'Date', render: (r) => r.createdAt ? new Date(r.createdAt).toLocaleString() : '—' },
            ]}
            rows={printJobs}
            keyField="id"
            emptyState={<EmptyState title="No print jobs in range." />}
          />
        </SectionCard>
      )}
    </AdminPageShell>
  )
}
