'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import ErrorState from '@/src/bpa/admin/components/ErrorState'
import LoadingSkeleton from '@/src/bpa/admin/components/LoadingSkeleton'
import { getGovernance, postGovernance } from '@/src/bpa/admin/lib/governanceApi'
import { adminToast } from '@/src/bpa/admin/lib/adminToast'
import { formatValueForDisplay, humanizeFieldLabel } from '@/src/lib/displayFormatters'

type RevisionItem = { id: number; revisionNumber: number; submittedByUserId: number; approvalId: number | null; createdAt: string }

type DetailPayload = {
  approval: {
    id: number
    producerOrgId: number
    entityType: string
    entityId: number
    status: string
    stage?: string | null
    submittedByUserId?: number | null
    reviewedByUserId?: number | null
    assignedToUserId?: number | null
    assignedAt?: string | null
    slaDeadline?: string | null
    note?: string | null
    createdAt?: string
    reviewedAt?: string | null
  }
  producerOrg: { id: number; name: string } | null
  submittedBy: { id: number; displayName: string | null } | null
  product: {
    id: number
    productName: string
    brandName: string
    productType?: string | null
    sku: string
    packSize?: string | null
    description?: string | null
    specJson?: unknown
    status: string
    proofs: { id: number; proofType: string; media: { id: number; url: string } }[]
    revisionHistory?: RevisionItem[]
  } | null
  batch: {
    id: number
    batchNo: string
    status: string
    authProduct: {
      id: number
      productName: string
      proofs: { id: number; proofType: string; media: { id: number; url: string } }[]
    } | null
  } | null
}

const MIN_REASON_LENGTH = 5

export default function AdminApprovalDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params?.id === 'string' ? params.id : null
  const [data, setData] = useState<DetailPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionBusy, setActionBusy] = useState(false)
  const [rejectModal, setRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectError, setRejectError] = useState('')
  const [requestChangesModal, setRequestChangesModal] = useState(false)
  const [requestChangesNotes, setRequestChangesNotes] = useState('')
  const [requestChangesError, setRequestChangesError] = useState('')
  const [revisionDiff, setRevisionDiff] = useState<Record<string, { from: unknown; to: unknown }> | null>(null)
  const [revisionDiffRevA, setRevisionDiffRevA] = useState<number | ''>('')
  const [revisionDiffRevB, setRevisionDiffRevB] = useState<number | ''>('')
  const [complianceResult, setComplianceResult] = useState<{ passed: boolean; checks: { key: string; name: string; status: 'PASS' | 'FAIL' | 'INFO'; message?: string }[] } | null>(null)
  const [approveModal, setApproveModal] = useState(false)
  const [overrideCompliance, setOverrideCompliance] = useState(false)
  const [overrideNote, setOverrideNote] = useState('')
  const [approveError, setApproveError] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const res = await getGovernance<DetailPayload>(`/admin/approvals/${id}`)
      const payload = res.data
      if (payload && typeof payload === 'object') setData(payload as DetailPayload)
      else setData(null)
    } catch (e: unknown) {
      const err = e as Error
      const msg = err?.message ?? 'Failed to load approval'
      if (typeof msg === 'string' && (msg.includes('403') || msg.toLowerCase().includes('permission'))) {
        setError('No access. You do not have permission to view this approval.')
      } else if (typeof msg === 'string' && msg.includes('404')) {
        setError('Approval not found.')
      } else {
        setError(msg)
      }
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!data?.product?.id) {
      setComplianceResult(null)
      return
    }
    let cancelled = false
    getGovernance<{ passed: boolean; checks: { key: string; name: string; status: 'PASS' | 'FAIL' | 'INFO'; message?: string }[] }>(`/admin/governance/compliance/product/${data.product.id}`)
      .then((res) => {
        if (!cancelled && res.data) setComplianceResult(res.data)
      })
      .catch(() => {
        if (!cancelled) setComplianceResult(null)
      })
    return () => { cancelled = true }
  }, [data?.product?.id])

  const needsOverrideToApprove = complianceResult && !complianceResult.passed && data?.product != null

  const handleApproveClick = () => {
    if (needsOverrideToApprove) {
      setApproveError('')
      setOverrideCompliance(false)
      setOverrideNote('')
      setApproveModal(true)
    } else {
      handleApproveDirect({ note: 'Approved from admin' })
    }
  }

  const handleApproveDirect = async (body: { note?: string; overrideCompliance?: boolean; overrideNote?: string }) => {
    if (!id || actionBusy) return
    setActionBusy(true)
    setApproveError('')
    try {
      await postGovernance(`/admin/approvals/${id}/approve`, body)
      adminToast.success('Approval approved. Producer has been notified.')
      setApproveModal(false)
      router.push('/admin/approvals')
    } catch (e: unknown) {
      const msg = (e as Error)?.message ?? 'Failed to approve'
      setApproveError(msg)
      adminToast.error(msg)
    } finally {
      setActionBusy(false)
    }
  }

  const handleApproveModalSubmit = () => {
    if (needsOverrideToApprove && !overrideCompliance) {
      setApproveError('You must check "Override compliance" to approve when compliance checks have failed.')
      return
    }
    handleApproveDirect({
      note: 'Approved from admin',
      ...(overrideCompliance ? { overrideCompliance: true, overrideNote: overrideNote.trim() || undefined } : {}),
    })
  }

  const openRejectModal = () => {
    setRejectReason('')
    setRejectError('')
    setRejectModal(true)
  }

  const handleRejectSubmit = async () => {
    const reason = rejectReason.trim()
    if (reason.length < MIN_REASON_LENGTH) {
      setRejectError(`Please provide a reason (at least ${MIN_REASON_LENGTH} characters).`)
      return
    }
    if (!id || actionBusy) return
    setActionBusy(true)
    setRejectError('')
    try {
      await postGovernance(`/admin/approvals/${id}/reject`, { reason })
      adminToast.success('Approval rejected. Producer has been notified with your reason.')
      setRejectModal(false)
      router.push('/admin/approvals')
    } catch (e: unknown) {
      adminToast.error((e as Error)?.message ?? 'Failed to reject')
    } finally {
      setActionBusy(false)
    }
  }

  const openRequestChangesModal = () => {
    setRequestChangesNotes('')
    setRequestChangesError('')
    setRequestChangesModal(true)
  }

  const handleRequestChangesSubmit = async () => {
    if (!id || actionBusy) return
    setActionBusy(true)
    setRequestChangesError('')
    try {
      await postGovernance(`/admin/approvals/${id}/request-changes`, { notes: requestChangesNotes.trim() || undefined })
      adminToast.success('Changes requested. Producer has been notified.')
      setRequestChangesModal(false)
      router.push('/admin/approvals')
    } catch (e: unknown) {
      adminToast.error((e as Error)?.message ?? 'Failed to request changes')
    } finally {
      setActionBusy(false)
    }
  }

  const handleTake = async () => {
    if (!id || actionBusy) return
    setActionBusy(true)
    try {
      await postGovernance(`/admin/approvals/${id}/take`, {})
      adminToast.success('Assigned to you.')
      await load()
    } catch (e: unknown) {
      adminToast.error((e as Error)?.message ?? 'Failed to take')
    } finally {
      setActionBusy(false)
    }
  }

  const handleRelease = async () => {
    if (!id || actionBusy) return
    setActionBusy(true)
    try {
      await postGovernance(`/admin/approvals/${id}/release`, {})
      adminToast.success('Released.')
      await load()
    } catch (e: unknown) {
      adminToast.error((e as Error)?.message ?? 'Failed to release')
    } finally {
      setActionBusy(false)
    }
  }

  const loadRevisionDiff = useCallback(async () => {
    if (!data?.product?.id || revisionDiffRevA === '' || revisionDiffRevB === '') return
    try {
      const res = await getGovernance<Record<string, { from: unknown; to: unknown }>>(
        `/admin/approvals/products/${data.product.id}/revisions/diff?revA=${revisionDiffRevA}&revB=${revisionDiffRevB}`
      )
      const payload = res.data
      setRevisionDiff(payload && typeof payload === 'object' ? payload : null)
    } catch {
      setRevisionDiff(null)
    }
  }, [data?.product?.id, revisionDiffRevA, revisionDiffRevB])

  const product = data?.product ?? null
  const batch = data?.batch ?? null
  const proofs = product?.proofs ?? batch?.authProduct?.proofs ?? []
  const mediaUrls = proofs.map((p) => p.media?.url).filter(Boolean) as string[]

  if (!id) {
    return (
      <AdminPageShell title="Approval" breadcrumbs={[{ href: '/admin', label: 'Admin' }, { href: '/admin/approvals', label: 'Approvals' }, { label: 'Detail' }]}>
        <ErrorState message="Invalid approval ID" onRetry={() => router.push('/admin/approvals')} />
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell
      title="Approval detail"
      breadcrumbs={[
        { href: '/admin', label: 'Admin' },
        { href: '/admin/approvals', label: 'Approvals' },
        { label: `#${id}` },
      ]}
      actions={
        <div className="d-flex gap-2 flex-wrap">
          <Link href="/admin/approvals" className="btn btn-outline-secondary btn-sm">Back to list</Link>
          {!loading && !error && data && (data.approval.status === 'SUBMITTED' || (data.approval.status === 'APPROVED' && data.approval.entityType === 'PRODUCT')) ? (
            <>
              {data.approval.assignedToUserId != null ? (
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleRelease} disabled={actionBusy}>
                  {actionBusy ? '…' : 'Release'}
                </button>
              ) : (
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleTake} disabled={actionBusy}>
                  {actionBusy ? '…' : 'Take'}
                </button>
              )}
              {data.approval.entityType === 'PRODUCT' ? (
                <button type="button" className="btn btn-warning btn-sm" onClick={openRequestChangesModal} disabled={actionBusy}>
                  Request changes
                </button>
              ) : null}
              <button type="button" className="btn btn-success btn-sm" onClick={handleApproveClick} disabled={actionBusy}>
                {actionBusy ? '…' : 'Approve'}
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={openRejectModal} disabled={actionBusy}>
                Reject
              </button>
            </>
          ) : null}
        </div>
      }
    >
      {loading && !data ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4"><LoadingSkeleton rows={8} /></div>
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : data ? (
        <>
          <div className="row g-3">
            <div className="col-12 col-lg-8">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-transparent border-0 py-3">
                  <h5 className="mb-0">Product / entity</h5>
                </div>
                <div className="card-body">
                  {product ? (
                    <>
                      <dl className="row mb-0">
                        <dt className="col-sm-3 text-muted">Product name</dt>
                        <dd className="col-sm-9">{product.productName}</dd>
                        <dt className="col-sm-3 text-muted">Brand</dt>
                        <dd className="col-sm-9">{product.brandName}</dd>
                        <dt className="col-sm-3 text-muted">Category / type</dt>
                        <dd className="col-sm-9">{product.productType ?? '—'}</dd>
                        <dt className="col-sm-3 text-muted">SKU</dt>
                        <dd className="col-sm-9">{product.sku}</dd>
                        <dt className="col-sm-3 text-muted">Pack size</dt>
                        <dd className="col-sm-9">{product.packSize ?? '—'}</dd>
                        <dt className="col-sm-3 text-muted">Status</dt>
                        <dd className="col-sm-9"><span className="badge bg-secondary">{product.status}</span></dd>
                        {product.description ? (
                          <>
                            <dt className="col-sm-3 text-muted">Description</dt>
                            <dd className="col-sm-9">{product.description}</dd>
                          </>
                        ) : null}
                      </dl>
                      {product.specJson && typeof product.specJson === 'object' ? (
                        <div className="mt-3">
                          <h6 className="text-muted">Specs</h6>
                          <div className="bg-light p-2 rounded small mb-0" style={{ maxHeight: 200, overflow: 'auto' }}>
                            {formatValueForDisplay(product.specJson)}
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : batch ? (
                    <dl className="row mb-0">
                      <dt className="col-sm-3 text-muted">Batch no</dt>
                      <dd className="col-sm-9">{batch.batchNo}</dd>
                      <dt className="col-sm-3 text-muted">Product</dt>
                      <dd className="col-sm-9">{batch.authProduct?.productName ?? '—'}</dd>
                      <dt className="col-sm-3 text-muted">Status</dt>
                      <dd className="col-sm-9"><span className="badge bg-secondary">{batch.status}</span></dd>
                    </dl>
                  ) : (
                    <p className="text-muted mb-0">No product or batch data.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="col-12 col-lg-4">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-transparent border-0 py-3">
                  <h5 className="mb-0">Producer & submission</h5>
                </div>
                <div className="card-body">
                  <dl className="row mb-0">
                    <dt className="col-sm-4 text-muted">Producer</dt>
                    <dd className="col-sm-8">
                      {data.producerOrg ? (
                        <Link href={`/admin/producer-governance/${data.producerOrg.id}`}>{data.producerOrg.name}</Link>
                      ) : (
                        '—'
                      )}
                    </dd>
                    <dt className="col-sm-4 text-muted">Submitted by</dt>
                    <dd className="col-sm-8">{data.submittedBy?.displayName ?? '—'}</dd>
                    <dt className="col-sm-4 text-muted">Submitted at</dt>
                    <dd className="col-sm-8">{data.approval.createdAt ? new Date(data.approval.createdAt).toLocaleString() : '—'}</dd>
                    <dt className="col-sm-4 text-muted">Approval status</dt>
                    <dd className="col-sm-8"><span className="badge bg-secondary">{data.approval.status}</span></dd>
                    {data.approval.assignedToUserId != null ? (
                      <>
                        <dt className="col-sm-4 text-muted">Assigned to</dt>
                        <dd className="col-sm-8">User #{data.approval.assignedToUserId}</dd>
                        {data.approval.assignedAt ? (
                          <>
                            <dt className="col-sm-4 text-muted">Assigned at</dt>
                            <dd className="col-sm-8">{new Date(data.approval.assignedAt).toLocaleString()}</dd>
                          </>
                        ) : null}
                      </>
                    ) : null}
                    {data.approval.slaDeadline ? (
                      <>
                        <dt className="col-sm-4 text-muted">SLA deadline</dt>
                        <dd className="col-sm-8">{new Date(data.approval.slaDeadline).toLocaleString()}</dd>
                      </>
                    ) : null}
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {complianceResult && product ? (
            <div className="card border-0 shadow-sm mt-3">
              <div className="card-header bg-transparent border-0 py-3 d-flex align-items-center gap-2">
                <h5 className="mb-0">Compliance</h5>
                <span className={`badge ${complianceResult.passed ? 'bg-success' : 'bg-warning text-dark'}`}>
                  {complianceResult.passed ? 'Passed' : 'Issues'}
                </span>
              </div>
              <div className="card-body">
                <ul className="list-unstyled mb-0 small">
                  {complianceResult.checks.map((c) => (
                    <li key={c.key || c.name} className="d-flex align-items-center gap-2 py-1">
                      <span className={`badge ${c.status === 'PASS' ? 'bg-success' : c.status === 'INFO' ? 'bg-info' : 'bg-danger'}`} style={{ minWidth: 48 }}>
                        {c.status}
                      </span>
                      <span>{c.name.replace(/_/g, ' ')}</span>
                      {c.message ? <span className="text-muted">— {c.message}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          {product && (product.revisionHistory?.length ?? 0) > 0 ? (
            <div className="card border-0 shadow-sm mt-3">
              <div className="card-header bg-transparent border-0 py-3">
                <h5 className="mb-0">Revision history</h5>
              </div>
              <div className="card-body">
                <ul className="list-unstyled mb-0">
                  {(product.revisionHistory ?? []).map((rev) => (
                    <li key={rev.id} className="py-1">
                      Rev #{rev.revisionNumber} — {new Date(rev.createdAt).toLocaleString()}
                    </li>
                  ))}
                </ul>
                {(product.revisionHistory?.length ?? 0) > 1 ? (
                  <div className="mt-3">
                    <p className="small text-muted mb-2">Compare revisions (rev A → rev B):</p>
                    <div className="d-flex gap-2 align-items-center flex-wrap">
                      <select
                        className="form-select form-select-sm"
                        style={{ width: 80 }}
                        value={revisionDiffRevA}
                        onChange={(e) => setRevisionDiffRevA(e.target.value === '' ? '' : Number(e.target.value))}
                      >
                        <option value="">—</option>
                        {(product.revisionHistory ?? []).map((rev) => (
                          <option key={rev.id} value={rev.revisionNumber}>#{rev.revisionNumber}</option>
                        ))}
                      </select>
                      <span className="text-muted">→</span>
                      <select
                        className="form-select form-select-sm"
                        style={{ width: 80 }}
                        value={revisionDiffRevB}
                        onChange={(e) => setRevisionDiffRevB(e.target.value === '' ? '' : Number(e.target.value))}
                      >
                        <option value="">—</option>
                        {(product.revisionHistory ?? []).map((rev) => (
                          <option key={rev.id} value={rev.revisionNumber}>#{rev.revisionNumber}</option>
                        ))}
                      </select>
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={loadRevisionDiff}>
                        Show diff
                      </button>
                    </div>
                    {revisionDiff && Object.keys(revisionDiff).length > 0 ? (
                      <div className="mt-2 p-2 bg-light rounded small">
                        {Object.entries(revisionDiff).map(([field, { from, to }]) => (
                          <div key={field} className="mb-2">
                            <strong>{humanizeFieldLabel(field)}</strong>: <span className="text-decoration-line-through">{formatValueForDisplay(from)}</span> → <span>{formatValueForDisplay(to)}</span>
                          </div>
                        ))}
                      </div>
                    ) : revisionDiff && Object.keys(revisionDiff).length === 0 ? (
                      <p className="small text-muted mt-2 mb-0">No differences.</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {mediaUrls.length > 0 ? (
            <div className="card border-0 shadow-sm mt-3">
              <div className="card-header bg-transparent border-0 py-3">
                <h5 className="mb-0">Image gallery (proofs)</h5>
              </div>
              <div className="card-body">
                <div className="d-flex flex-wrap gap-2">
                  {mediaUrls.map((url, i) => (
                    <div key={i} className="border rounded overflow-hidden" style={{ width: 140, height: 140 }}>
                      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {rejectModal ? (
        <div className="modal d-block bg-dark bg-opacity-50" tabIndex={-1} style={{ zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Reject approval</h5>
                <button type="button" className="btn-close" onClick={() => setRejectModal(false)} aria-label="Close" />
              </div>
              <div className="modal-body">
                <p className="text-muted small">Rejection reason is required (min 5 characters). The producer will see this message.</p>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Enter reason for rejection…"
                  value={rejectReason}
                  onChange={(e) => { setRejectReason(e.target.value); setRejectError(''); }}
                />
                {rejectError ? <p className="text-danger small mt-1 mb-0">{rejectError}</p> : null}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setRejectModal(false)}>Cancel</button>
                <button type="button" className="btn btn-danger" onClick={handleRejectSubmit} disabled={actionBusy}>
                  {actionBusy ? '…' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {requestChangesModal ? (
        <div className="modal d-block bg-dark bg-opacity-50" tabIndex={-1} style={{ zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Request changes</h5>
                <button type="button" className="btn-close" onClick={() => setRequestChangesModal(false)} aria-label="Close" />
              </div>
              <div className="modal-body">
                <p className="text-muted small">Describe what the producer should change. They will be notified and can resubmit after editing.</p>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="What should be changed…"
                  value={requestChangesNotes}
                  onChange={(e) => { setRequestChangesNotes(e.target.value); setRequestChangesError(''); }}
                />
                {requestChangesError ? <p className="text-danger small mt-1 mb-0">{requestChangesError}</p> : null}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setRequestChangesModal(false)}>Cancel</button>
                <button type="button" className="btn btn-warning" onClick={handleRequestChangesSubmit} disabled={actionBusy}>
                  {actionBusy ? '…' : 'Request changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {approveModal ? (
        <div className="modal d-block bg-dark bg-opacity-50" tabIndex={-1} style={{ zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Approve</h5>
                <button type="button" className="btn-close" onClick={() => { setApproveModal(false); setApproveError(''); }} aria-label="Close" />
              </div>
              <div className="modal-body">
                {approveError ? <div className="alert alert-danger py-2 mb-2 small">{approveError}</div> : null}
                {needsOverrideToApprove ? (
                  <>
                    <p className="text-muted small mb-2">Compliance checks have failed. To approve anyway, check the box below and optionally add a note.</p>
                    <div className="form-check mb-2">
                      <input
                        id="override-compliance"
                        type="checkbox"
                        className="form-check-input"
                        checked={overrideCompliance}
                        onChange={(e) => { setOverrideCompliance(e.target.checked); setApproveError(''); }}
                      />
                      <label className="form-check-label" htmlFor="override-compliance">Override compliance</label>
                    </div>
                    <textarea
                      className="form-control form-control-sm"
                      rows={2}
                      placeholder="Optional note for audit…"
                      value={overrideNote}
                      onChange={(e) => setOverrideNote(e.target.value)}
                    />
                  </>
                ) : (
                  <p className="text-muted small mb-0">Confirm approval. Producer will be notified.</p>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => { setApproveModal(false); setApproveError(''); }}>Cancel</button>
                <button type="button" className="btn btn-success" onClick={handleApproveModalSubmit} disabled={actionBusy}>
                  {actionBusy ? '…' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AdminPageShell>
  )
}
