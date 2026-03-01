'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import ErrorState from '@/src/bpa/admin/components/ErrorState'
import LoadingSkeleton from '@/src/bpa/admin/components/LoadingSkeleton'
import StatusChip from '@/src/bpa/admin/components/StatusChip'
import {
  getEnforcementCase,
  updateEnforcementCase,
  addEnforcementCaseEvidence,
  applyEnforcementAction,
  revertEnforcementAction,
  type EnforcementCaseDetail,
} from '@/src/bpa/admin/lib/governanceApi'

const ACTION_BUTTONS: { actionType: string; targetType: string; label: string }[] = [
  { actionType: 'CODE_BLOCKED', targetType: 'CODE', label: 'Block code' },
  { actionType: 'BATCH_QUARANTINED', targetType: 'BATCH', label: 'Quarantine batch' },
  { actionType: 'BATCH_FROZEN', targetType: 'BATCH', label: 'Freeze batch' },
  { actionType: 'PRODUCT_DEACTIVATED', targetType: 'PRODUCT', label: 'Deactivate product' },
  { actionType: 'PRODUCT_RESET_UNAPPROVED', targetType: 'PRODUCT', label: 'Reset product to unapproved' },
  { actionType: 'ORG_SUSPENDED', targetType: 'ORG', label: 'Suspend org' },
  { actionType: 'ORG_KYC_REVERIFY', targetType: 'ORG', label: 'Require KYC re-verify' },
]

function statusVariant(s: string): 'success' | 'warning' | 'danger' | 'secondary' {
  if (s === 'RESOLVED') return 'success'
  if (s === 'OPEN' || s === 'INVESTIGATING') return 'warning'
  if (s === 'REJECTED') return 'secondary'
  if (s === 'ACTIONED') return 'danger'
  return 'secondary'
}

export default function EnforcementCaseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params?.id === 'string' ? parseInt(params.id, 10) : NaN
  const [caseDetail, setCaseDetail] = useState<EnforcementCaseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionModal, setActionModal] = useState<{ actionType: string; targetType: string; targetId: string; label: string } | null>(null)
  const [actionReason, setActionReason] = useState('')
  const [actionSubmitting, setActionSubmitting] = useState(false)
  const [revertActionId, setRevertActionId] = useState<number | null>(null)
  const [revertNote, setRevertNote] = useState('')
  const [revertSubmitting, setRevertSubmitting] = useState(false)
  const [statusSelect, setStatusSelect] = useState('')
  const [resolutionNote, setResolutionNote] = useState('')
  const [updateSubmitting, setUpdateSubmitting] = useState(false)

  const load = useCallback(async () => {
    if (!Number.isFinite(id)) return
    setLoading(true)
    setError('')
    try {
      const res = await getEnforcementCase(id)
      const data = res?.data
      if (data) {
        setCaseDetail(data as EnforcementCaseDetail)
        setStatusSelect((data as EnforcementCaseDetail).status ?? '')
        setResolutionNote((data as EnforcementCaseDetail).resolutionNote ?? '')
      } else {
        setCaseDetail(null)
      }
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load case')
      setCaseDetail(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const trace = caseDetail?.trace
  const producerOrgId = caseDetail?.producerOrgId
  const entityType = caseDetail?.entityType
  const entityId = caseDetail?.entityId

  const resolveTargetId = (targetType: string): string => {
    if (targetType === 'ORG' && producerOrgId != null) return String(producerOrgId)
    if (targetType === 'BATCH' && trace?.batch?.id != null) return String(trace.batch.id)
    if (targetType === 'PRODUCT' && trace?.product?.id != null) return String(trace.product.id)
    if (targetType === 'CODE' && entityType === 'CODE' && entityId) return entityId
    return ''
  }

  const handleApplyAction = async () => {
    if (!actionModal || !caseDetail) return
    const targetId = resolveTargetId(actionModal.targetType)
    if (!targetId) {
      alert('Cannot resolve target for this action. Ensure trace is loaded.')
      return
    }
    if (actionReason.trim().length < 5) {
      alert('Reason is required (min 5 characters).')
      return
    }
    setActionSubmitting(true)
    try {
      await applyEnforcementAction(caseDetail.id, {
        actionType: actionModal.actionType,
        targetType: actionModal.targetType,
        targetId,
        reason: actionReason.trim(),
      })
      setActionModal(null)
      setActionReason('')
      load()
    } catch (e) {
      console.error(e)
      alert((e as Error).message)
    } finally {
      setActionSubmitting(false)
    }
  }

  const handleRevert = async () => {
    if (revertActionId == null || revertNote.trim().length < 5) {
      alert('Revert note is required (min 5 characters).')
      return
    }
    setRevertSubmitting(true)
    try {
      await revertEnforcementAction(revertActionId, { revertNote: revertNote.trim() })
      setRevertActionId(null)
      setRevertNote('')
      load()
    } catch (e) {
      console.error(e)
      alert((e as Error).message)
    } finally {
      setRevertSubmitting(false)
    }
  }

  const handleUpdateStatus = async () => {
    if (!caseDetail) return
    setUpdateSubmitting(true)
    try {
      await updateEnforcementCase(caseDetail.id, {
        status: statusSelect,
        resolutionNote: resolutionNote.trim() || undefined,
      })
      load()
    } catch (e) {
      console.error(e)
      alert((e as Error).message)
    } finally {
      setUpdateSubmitting(false)
    }
  }

  if (!Number.isFinite(id)) {
    return (
      <AdminPageShell title="Invalid case" breadcrumbs={[{ href: '/admin', label: 'Admin' }, { label: 'Enforcement' }, { label: 'Cases' }]}>
        <ErrorState message="Invalid case ID" onRetry={() => router.push('/admin/enforcement/cases')} />
      </AdminPageShell>
    )
  }

  if (loading && !caseDetail) {
    return (
      <AdminPageShell
        title="Case detail"
        breadcrumbs={[{ href: '/admin', label: 'Admin' }, { href: '/admin/enforcement/cases', label: 'Cases' }, { label: '…' }]}
      >
        <LoadingSkeleton />
      </AdminPageShell>
    )
  }

  if (error && !caseDetail) {
    return (
      <AdminPageShell
        title="Case detail"
        breadcrumbs={[{ href: '/admin', label: 'Admin' }, { href: '/admin/enforcement/cases', label: 'Cases' }, { label: String(id) }]}
      >
        <ErrorState message={error} onRetry={load} />
      </AdminPageShell>
    )
  }

  const c = caseDetail!

  return (
    <AdminPageShell
      title={`Case ${c.caseNo}`}
      breadcrumbs={[
        { href: '/admin', label: 'Admin' },
        { href: '/admin/enforcement', label: 'Enforcement' },
        { href: '/admin/enforcement/cases', label: 'Cases' },
        { label: c.caseNo },
      ]}
      actions={
        <div className="d-flex gap-2">
          <Link href="/admin/enforcement/cases" className="btn btn-outline-secondary btn-sm">
            Back to list
          </Link>
          <button type="button" className="btn btn-primary btn-sm" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>
      }
    >
      <div className="row">
        <div className="col-lg-8">
          <div className="card mb-3">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span>{c.caseNo}</span>
              <StatusChip status={c.status} variant={statusVariant(c.status)} />
            </div>
            <div className="card-body">
              <p className="mb-1">
                <strong>Summary:</strong> {c.summary}
              </p>
              {c.details ? (
                <p className="text-secondary small mb-0">{c.details}</p>
              ) : null}
              <p className="mb-0 mt-2 small text-muted">
                Entity: {c.entityType} / {c.entityId} · Severity: {c.severity} · Source: {c.source} · Created: {c.createdAt ? new Date(c.createdAt).toLocaleString() : '—'}
              </p>
              {c.producerOrg ? (
                <p className="mb-0 small">
                  Producer: <Link href={`/admin/producer-governance/${c.producerOrg.id}`}>{c.producerOrg.name}</Link> (ID: {c.producerOrgId})
                </p>
              ) : null}
            </div>
          </div>

          {/* Trace panel */}
          {trace && (
            <div className="card mb-3">
              <div className="card-header">Trace (Code → Batch → Product → Org)</div>
              <div className="card-body d-flex flex-wrap gap-2 align-items-center">
                {trace.code ? (
                  <span className="badge bg-secondary">Code #{trace.code.id} ({trace.code.status})</span>
                ) : null}
                {trace.batch ? (
                  <Link href={`/admin/batch-control/${trace.batch.id}`} className="badge bg-primary text-decoration-none">
                    Batch {trace.batch.batchNo} (#{trace.batch.id})
                  </Link>
                ) : null}
                {trace.product ? (
                  <Link href={`/admin/producer-governance/products/${trace.product.id}`} className="badge bg-info text-dark text-decoration-none">
                    {trace.product.productName} (#{trace.product.id})
                  </Link>
                ) : null}
                {trace.producerOrg ? (
                  <Link href={`/admin/producer-governance/${trace.producerOrg.id}`} className="badge bg-dark text-decoration-none">
                    {trace.producerOrg.name} (#{trace.producerOrg.id})
                  </Link>
                ) : null}
                {!trace.code && !trace.batch && !trace.product && !trace.producerOrg ? (
                  <span className="text-muted">No trace (entity may not resolve to chain)</span>
                ) : null}
              </div>
            </div>
          )}

          {/* Evidence */}
          <div className="card mb-3">
            <div className="card-header">Evidence</div>
            <div className="card-body">
              {c.evidence?.length ? (
                <ul className="list-unstyled mb-0">
                  {c.evidence.map((e) => (
                    <li key={e.id} className="mb-2">
                      <span className="badge bg-light text-dark me-2">{e.type}</span>
                      {e.url ? (
                        <a href={e.url} target="_blank" rel="noopener noreferrer">
                          {e.url.slice(0, 60)}…
                        </a>
                      ) : null}
                      {e.note ? <span className="text-secondary small ms-2">{e.note}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted small mb-0">No evidence yet. Add via API or future upload.</p>
              )}
            </div>
          </div>

          {/* Timeline (actions) */}
          <div className="card mb-3">
            <div className="card-header">Actions timeline</div>
            <div className="card-body">
              {c.actions?.length ? (
                <div className="d-flex flex-column gap-2">
                  {c.actions.map((a) => (
                    <div key={a.id} className="border rounded p-2">
                      <div className="d-flex justify-content-between flex-wrap">
                        <span className="fw-semibold">{a.actionType}</span>
                        <span className="text-muted small">{new Date(a.appliedAt).toLocaleString()}</span>
                      </div>
                      <p className="mb-1 small">Target: {a.targetType} #{a.targetId} · {a.reason}</p>
                      <span className={`badge bg-${a.status === 'APPLIED' ? 'danger' : 'secondary'}`}>{a.status}</span>
                      {a.status === 'APPLIED' ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-warning ms-2"
                          onClick={() => {
                            setRevertActionId(a.id)
                            setRevertNote('')
                          }}
                        >
                          Revert
                        </button>
                      ) : null}
                      {a.revertedAt ? (
                        <span className="small text-muted ms-2">Reverted: {new Date(a.revertedAt).toLocaleString()} — {a.revertNote}</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted small mb-0">No actions yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card mb-3">
            <div className="card-header">Update case</div>
            <div className="card-body">
              <label className="form-label small">Status</label>
              <select
                className="form-select form-select-sm mb-2"
                value={statusSelect}
                onChange={(e) => setStatusSelect(e.target.value)}
              >
                <option value="OPEN">Open</option>
                <option value="INVESTIGATING">Investigating</option>
                <option value="ACTIONED">Actioned</option>
                <option value="RESOLVED">Resolved</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <label className="form-label small">Resolution note</label>
              <textarea
                className="form-control form-control-sm mb-2"
                rows={2}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Optional"
              />
              <button type="button" className="btn btn-sm btn-primary" onClick={handleUpdateStatus} disabled={updateSubmitting}>
                {updateSubmitting ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-header">Apply action</div>
            <div className="card-body">
              <p className="small text-muted mb-2">Apply an enforcement action for this case. Target is derived from trace.</p>
              <div className="d-flex flex-wrap gap-1">
                {ACTION_BUTTONS.map((btn) => (
                  <button
                    key={`${btn.actionType}-${btn.targetType}`}
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => {
                      const targetId = resolveTargetId(btn.targetType)
                      if (!targetId) {
                        alert(`No target for ${btn.targetType}. Trace may be missing.`)
                        return
                      }
                      setActionModal({ ...btn, targetId })
                      setActionReason('')
                    }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Apply action modal */}
      {actionModal ? (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Apply: {actionModal.label}</h5>
                <button type="button" className="btn-close" onClick={() => setActionModal(null)} aria-label="Close" />
              </div>
              <div className="modal-body">
                <p className="small">Target: {actionModal.targetType} #{actionModal.targetId}</p>
                <label className="form-label">Reason (required, min 5 chars)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Reason for this action…"
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setActionModal(null)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger" onClick={handleApplyAction} disabled={actionSubmitting || actionReason.trim().length < 5}>
                  {actionSubmitting ? 'Applying…' : 'Apply'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Revert modal */}
      {revertActionId != null ? (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Revert action</h5>
                <button type="button" className="btn-close" onClick={() => setRevertActionId(null)} aria-label="Close" />
              </div>
              <div className="modal-body">
                <label className="form-label">Revert note (required, min 5 chars)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={revertNote}
                  onChange={(e) => setRevertNote(e.target.value)}
                  placeholder="Reason for reverting…"
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setRevertActionId(null)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-warning" onClick={handleRevert} disabled={revertSubmitting || revertNote.trim().length < 5}>
                  {revertSubmitting ? 'Reverting…' : 'Revert'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AdminPageShell>
  )
}
