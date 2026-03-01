'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import ErrorState from '@/src/bpa/admin/components/ErrorState'
import EmptyState from '@/src/bpa/admin/components/EmptyState'
import LoadingSkeleton from '@/src/bpa/admin/components/LoadingSkeleton'
import StatusChip from '@/src/bpa/admin/components/StatusChip'
import { getGovernance, postGovernance } from '@/src/bpa/admin/lib/governanceApi'
import { adminToast } from '@/src/bpa/admin/lib/adminToast'

type BatchDetail = {
  batch: {
    id: number
    batchNo: string
    status: string
    frozenAt?: string | null
    qtyPlanned: number
    qtyGenerated: number
    submittedAt?: string | null
    reviewedAt?: string | null
    reviewNotes?: string | null
    voidedAt?: string | null
    voidReason?: string | null
    printedAt?: string | null
    printedByUserId?: number | null
    printCount: number
    createdAt: string
    authProduct?: {
      id: number
      productName: string
      sku: string
      producerOrg?: { id: number; name: string } | null
    } | null
    allocationLogs?: { id: number; actionType: string; createdAt: string }[]
  }
  codeCounts: Record<string, number>
  serialStats?: { totalGenerated: number; allocated: number; verified: number; blocked: number; unused: number; sold?: number; expired?: number }
  printHistory?: { printedAt: string; printedByUserId?: number | null; printCount: number } | null
  approval: {
    id: number
    status: string
    assignedToUserId?: number | null
    slaDeadline?: string | null
    createdAt?: string
    reviewedAt?: string | null
  } | null
}

export default function AdminBatchDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params?.id === 'string' ? params.id : null
  const [data, setData] = useState<BatchDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionBusy, setActionBusy] = useState(false)
  const [rejectModal, setRejectModal] = useState(false)
  const [voidModal, setVoidModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [voidReason, setVoidReason] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const res = await getGovernance<BatchDetail>(`/admin/batches/${id}`)
      if (res.data && typeof res.data === 'object') setData(res.data as BatchDetail)
      else setData(null)
    } catch (e: unknown) {
      setError((e as Error)?.message ?? 'Failed to load batch')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const handleApprove = async () => {
    if (!id || actionBusy) return
    setActionBusy(true)
    setActionError(null)
    try {
      await postGovernance(`/admin/batches/${id}/approve`, { note: 'Approved from admin' })
      adminToast.success('Batch approved.')
      await load()
    } catch (e: unknown) {
      const msg = (e as Error)?.message ?? 'Failed to approve'
      setActionError(msg)
      adminToast.error(msg)
    } finally {
      setActionBusy(false)
    }
  }

  const handleRejectSubmit = async () => {
    if (rejectReason.trim().length < 5) {
      adminToast.error('Rejection reason must be at least 5 characters')
      return
    }
    if (!id || actionBusy) return
    setActionBusy(true)
    setActionError(null)
    try {
      await postGovernance(`/admin/batches/${id}/reject`, { reason: rejectReason.trim() })
      adminToast.success('Batch rejected.')
      setRejectModal(false)
      setRejectReason('')
      await load()
    } catch (e: unknown) {
      const msg = (e as Error)?.message ?? 'Failed to reject'
      setActionError(msg)
      adminToast.error(msg)
    } finally {
      setActionBusy(false)
    }
  }

  const handleVoidSubmit = async () => {
    if (voidReason.trim().length < 5) {
      adminToast.error('Void reason must be at least 5 characters')
      return
    }
    if (!id || actionBusy) return
    setActionBusy(true)
    setActionError(null)
    try {
      await postGovernance(`/admin/batches/${id}/void`, { reason: voidReason.trim() })
      adminToast.success('Batch voided.')
      setVoidModal(false)
      setVoidReason('')
      await load()
    } catch (e: unknown) {
      const msg = (e as Error)?.message ?? 'Failed to void'
      setActionError(msg)
      adminToast.error(msg)
    } finally {
      setActionBusy(false)
    }
  }

  const handleArchive = async () => {
    if (!id || actionBusy) return
    setActionBusy(true)
    setActionError(null)
    try {
      await postGovernance(`/admin/batches/${id}/archive`, {})
      adminToast.success('Batch archived.')
      await load()
    } catch (e: unknown) {
      const msg = (e as Error)?.message ?? 'Failed to archive'
      setActionError(msg)
      adminToast.error(msg)
    } finally {
      setActionBusy(false)
    }
  }

  const handleFreeze = async () => {
    if (!id || actionBusy) return
    setActionBusy(true)
    setActionError(null)
    try {
      await postGovernance(`/admin/batches/${id}/freeze`, {})
      adminToast.success('Batch frozen.')
      await load()
    } catch (e: unknown) {
      const msg = (e as Error)?.message ?? 'Failed to freeze'
      setActionError(msg)
      adminToast.error(msg)
    } finally {
      setActionBusy(false)
    }
  }

  const handleUnfreeze = async () => {
    if (!id || actionBusy) return
    setActionBusy(true)
    setActionError(null)
    try {
      await postGovernance(`/admin/batches/${id}/unfreeze`, {})
      adminToast.success('Batch unfrozen.')
      await load()
    } catch (e: unknown) {
      const msg = (e as Error)?.message ?? 'Failed to unfreeze'
      setActionError(msg)
      adminToast.error(msg)
    } finally {
      setActionBusy(false)
    }
  }

  const batch = data?.batch
  const approval = data?.approval
  const canApproveReject = batch?.status === 'SUBMITTED' && approval?.status === 'SUBMITTED'
  const canVoid = batch && !batch.frozenAt && ['APPROVED', 'GENERATED', 'CODES_ALLOCATED'].includes(batch.status)
  const canArchive = batch && ['REJECTED', 'VOIDED', 'PRINTED'].includes(batch.status)
  const canFreeze = batch && !batch.frozenAt && ['APPROVED', 'GENERATED', 'CODES_ALLOCATED', 'PRINTED'].includes(batch.status)
  const canUnfreeze = batch && !!batch.frozenAt

  if (!id) {
    return (
      <AdminPageShell title="Batch" breadcrumbs={[{ href: '/admin', label: 'Admin' }, { href: '/admin/batch-control', label: 'Batch Control' }, { label: 'Detail' }]}>
        <ErrorState message="Invalid batch ID" onRetry={() => router.push('/admin/batch-control')} />
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell
      title={`Batch ${batch?.batchNo ?? id}`}
      breadcrumbs={[
        { href: '/admin', label: 'Admin' },
        { href: '/admin/batch-control', label: 'Batch Control' },
        { label: `#${id}` },
      ]}
      actions={
        <div className="d-flex gap-2 flex-wrap">
          <Link href="/admin/batch-control" className="btn btn-outline-secondary btn-sm">Back to list</Link>
          {!loading && canApproveReject && (
            <>
              <button type="button" className="btn btn-success btn-sm" onClick={handleApprove} disabled={actionBusy}>{actionBusy ? '…' : 'Approve'}</button>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => { setRejectModal(true); setActionError(null); }} disabled={actionBusy}>Reject</button>
            </>
          )}
          {!loading && canVoid && (
            <button type="button" className="btn btn-warning btn-sm" onClick={() => { setVoidModal(true); setActionError(null); }} disabled={actionBusy}>{actionBusy ? '…' : 'Void'}</button>
          )}
          {!loading && canFreeze && (
            <button type="button" className="btn btn-outline-warning btn-sm" onClick={handleFreeze} disabled={actionBusy}>{actionBusy ? '…' : 'Freeze'}</button>
          )}
          {!loading && canUnfreeze && (
            <button type="button" className="btn btn-outline-success btn-sm" onClick={handleUnfreeze} disabled={actionBusy}>{actionBusy ? '…' : 'Unfreeze'}</button>
          )}
          {!loading && canArchive && (
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleArchive} disabled={actionBusy}>{actionBusy ? '…' : 'Archive'}</button>
          )}
        </div>
      }
    >
      {loading && !data ? (
        <div className="card border-0 shadow-sm"><div className="card-body p-4"><LoadingSkeleton rows={8} /></div></div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : data && batch ? (
        <>
          {batch.frozenAt && (
            <div className="alert alert-warning d-flex align-items-center mb-3" role="alert">
              <span className="me-2">Batch is frozen by admin. Print, export, and allocate are blocked until unfrozen.</span>
            </div>
          )}
          <div className="row g-3">
            <div className="col-12 col-lg-8">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-transparent border-0 py-3"><h5 className="mb-0">Batch</h5></div>
                <div className="card-body">
                  <dl className="row mb-0">
                    <dt className="col-sm-3 text-muted">Batch no</dt>
                    <dd className="col-sm-9">{batch.batchNo}</dd>
                    <dt className="col-sm-3 text-muted">Status</dt>
                    <dd className="col-sm-9"><StatusChip status={batch.status} /></dd>
                    <dt className="col-sm-3 text-muted">Qty planned / generated</dt>
                    <dd className="col-sm-9">{batch.qtyGenerated ?? 0} / {batch.qtyPlanned ?? 0}</dd>
                    <dt className="col-sm-3 text-muted">Product</dt>
                    <dd className="col-sm-9">
                      {batch.authProduct ? (
                        <Link href={`/admin/approvals`}>{batch.authProduct.productName} ({batch.authProduct.sku})</Link>
                      ) : '—'}
                    </dd>
                    {batch.submittedAt && (
                      <>
                        <dt className="col-sm-3 text-muted">Submitted at</dt>
                        <dd className="col-sm-9">{new Date(batch.submittedAt).toLocaleString()}</dd>
                      </>
                    )}
                    {batch.reviewNotes && (
                      <>
                        <dt className="col-sm-3 text-muted">Review notes</dt>
                        <dd className="col-sm-9">{batch.reviewNotes}</dd>
                      </>
                    )}
                    {batch.voidReason && (
                      <>
                        <dt className="col-sm-3 text-muted">Void reason</dt>
                        <dd className="col-sm-9">{batch.voidReason}</dd>
                      </>
                    )}
                  </dl>
                </div>
              </div>
            </div>
            <div className="col-12 col-lg-4">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-transparent border-0 py-3"><h5 className="mb-0">Producer & codes</h5></div>
                <div className="card-body">
                  <dl className="row mb-0">
                    <dt className="col-sm-4 text-muted">Producer</dt>
                    <dd className="col-sm-8">
                      {batch.authProduct?.producerOrg ? (
                        <Link href={`/admin/producer-governance/${batch.authProduct.producerOrg.id}`}>{batch.authProduct.producerOrg.name}</Link>
                      ) : '—'}
                    </dd>
                    <dt className="col-sm-4 text-muted">Approval status</dt>
                    <dd className="col-sm-8"><StatusChip status={approval?.status ?? '—'} /></dd>
                    {approval?.slaDeadline && (
                      <>
                        <dt className="col-sm-4 text-muted">SLA deadline</dt>
                        <dd className="col-sm-8">{new Date(approval.slaDeadline).toLocaleString()}</dd>
                      </>
                    )}
                    {approval?.assignedToUserId != null && (
                      <>
                        <dt className="col-sm-4 text-muted">Assigned to</dt>
                        <dd className="col-sm-8">User #{approval.assignedToUserId}</dd>
                      </>
                    )}
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {data.serialStats ? (
            <div className="card border-0 shadow-sm mt-3">
              <div className="card-header bg-transparent border-0 py-3"><h5 className="mb-0">Code stats</h5></div>
              <div className="card-body">
                <dl className="row mb-0 small">
                  <dt className="col-sm-2 text-muted">Total generated</dt>
                  <dd className="col-sm-2">{data.serialStats.totalGenerated ?? 0}</dd>
                  <dt className="col-sm-2 text-muted">Allocated</dt>
                  <dd className="col-sm-2">{data.serialStats.allocated ?? 0}</dd>
                  <dt className="col-sm-2 text-muted">Verified</dt>
                  <dd className="col-sm-2">{data.serialStats.verified ?? 0}</dd>
                  <dt className="col-sm-2 text-muted">Blocked</dt>
                  <dd className="col-sm-2">{data.serialStats.blocked ?? 0}</dd>
                  <dt className="col-sm-2 text-muted">Unused</dt>
                  <dd className="col-sm-2">{data.serialStats.unused ?? 0}</dd>
                  {(data.serialStats.sold != null || data.serialStats.expired != null) && (
                    <>
                      <dt className="col-sm-2 text-muted">Sold / Expired</dt>
                      <dd className="col-sm-2">{data.serialStats.sold ?? 0} / {data.serialStats.expired ?? 0}</dd>
                    </>
                  )}
                </dl>
              </div>
            </div>
          ) : (
            <div className="card border-0 shadow-sm mt-3">
              <div className="card-header bg-transparent border-0 py-3"><h5 className="mb-0">Code stats</h5></div>
              <div className="card-body"><EmptyState title="No code stats" description="Generate codes to see allocation stats." /></div>
            </div>
          )}

          {data.printHistory ? (
            <div className="card border-0 shadow-sm mt-3">
              <div className="card-header bg-transparent border-0 py-3"><h5 className="mb-0">Print history</h5></div>
              <div className="card-body">
                <dl className="row mb-0 small">
                  <dt className="col-sm-2 text-muted">Printed at</dt>
                  <dd className="col-sm-4">{new Date(data.printHistory.printedAt).toLocaleString()}</dd>
                  <dt className="col-sm-2 text-muted">Print count</dt>
                  <dd className="col-sm-4">{data.printHistory.printCount}</dd>
                  {data.printHistory.printedByUserId != null && (
                    <>
                      <dt className="col-sm-2 text-muted">Printed by</dt>
                      <dd className="col-sm-4">User #{data.printHistory.printedByUserId}</dd>
                    </>
                  )}
                </dl>
              </div>
            </div>
          ) : (
            <div className="card border-0 shadow-sm mt-3">
              <div className="card-header bg-transparent border-0 py-3"><h5 className="mb-0">Print history</h5></div>
              <div className="card-body"><EmptyState title="No print history" description="Print activity will appear here." /></div>
            </div>
          )}

          {batch.allocationLogs && batch.allocationLogs.length > 0 ? (
            <div className="card border-0 shadow-sm mt-3">
              <div className="card-header bg-transparent border-0 py-3"><h5 className="mb-0">Print / allocation history</h5></div>
              <div className="card-body">
                <ul className="list-unstyled mb-0">
                  {batch.allocationLogs.map((log: any) => (
                    <li key={log.id} className="py-1 small">{log.actionType} — {new Date(log.createdAt).toLocaleString()}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {rejectModal && (
        <div className="modal d-block bg-dark bg-opacity-50" tabIndex={-1} style={{ zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Reject batch</h5>
                <button type="button" className="btn-close" onClick={() => { setRejectModal(false); setActionError(null); }} aria-label="Close" />
              </div>
              <div className="modal-body">
                {actionError && <div className="alert alert-danger py-2 mb-2 small">{actionError}</div>}
                <p className="text-muted small">Rejection reason (min 5 characters):</p>
                <textarea className="form-control" rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason…" />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => { setRejectModal(false); setActionError(null); }}>Cancel</button>
                <button type="button" className="btn btn-danger" onClick={handleRejectSubmit} disabled={actionBusy || rejectReason.trim().length < 5}>{actionBusy ? '…' : 'Reject'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {voidModal && (
        <div className="modal d-block bg-dark bg-opacity-50" tabIndex={-1} style={{ zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Void batch</h5>
                <button type="button" className="btn-close" onClick={() => { setVoidModal(false); setActionError(null); }} aria-label="Close" />
              </div>
              <div className="modal-body">
                {actionError && <div className="alert alert-danger py-2 mb-2 small">{actionError}</div>}
                <p className="text-muted small">Void reason (min 5 characters). Only batches with no verified codes can be voided.</p>
                <textarea className="form-control" rows={3} value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="Reason…" />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => { setVoidModal(false); setActionError(null); }}>Cancel</button>
                <button type="button" className="btn btn-warning" onClick={handleVoidSubmit} disabled={actionBusy || voidReason.trim().length < 5}>{actionBusy ? '…' : 'Void'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  )
}
