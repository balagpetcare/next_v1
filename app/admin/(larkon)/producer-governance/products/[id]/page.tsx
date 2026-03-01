'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import ErrorState from '@/src/bpa/admin/components/ErrorState'
import LoadingSkeleton from '@/src/bpa/admin/components/LoadingSkeleton'
import StatusChip from '@/src/bpa/admin/components/StatusChip'
import { getGovernanceProduct, actOnGovernanceProduct } from '@/src/bpa/admin/lib/governanceApi'
import { adminToast } from '@/src/bpa/admin/lib/adminToast'

type ProductDetail = {
  productId: number
  name: string
  sku: string
  brandName?: string | null
  productType?: string | null
  packSize?: string | null
  description?: string | null
  specJson?: unknown
  status: string
  currentStatus: string
  producerOrgId: number
  producerOrgName: string | null
  producerOrg?: { id: number; name: string } | null
  submittedAt: string | null
  reviewedAt: string | null
  reviewedByAdminId?: number | null
  reviewNotes?: string | null
  proofs?: { id: number; proofType: string; media: { id: number; url: string } }[]
  approvalId?: number | null
  approvalStatus?: string | null
  approvalNote?: string | null
  createdAt: string
  updatedAt: string
}

const ACTIONS = ['APPROVE', 'DECLINE', 'REJECT', 'RESET_TO_UNAPPROVED', 'PUBLISH', 'UNPUBLISH'] as const

export default function GovernanceProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params?.id === 'string' ? params.id : null
  const productId = id ? parseInt(id, 10) : NaN

  const [data, setData] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionBusy, setActionBusy] = useState(false)
  const [actionModal, setActionModal] = useState<typeof ACTIONS[number] | null>(null)
  const [actionNote, setActionNote] = useState('')
  const [actionError, setActionError] = useState('')

  const load = useCallback(async () => {
    if (!id || !Number.isFinite(productId)) return
    setLoading(true)
    setError('')
    try {
      const res = await getGovernanceProduct(productId)
      const payload = res.data
      if (payload && typeof payload === 'object') setData(payload as ProductDetail)
      else setData(null)
    } catch (e: unknown) {
      const err = e as Error
      const msg = err?.message ?? 'Failed to load product'
      if (typeof msg === 'string' && (msg.includes('403') || msg.toLowerCase().includes('permission'))) {
        setError('You do not have permission to view this product. You need admin.approvals.manage.')
      } else if (typeof msg === 'string' && msg.includes('404')) {
        setError('Product not found.')
      } else {
        setError(msg)
      }
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [id, productId])

  useEffect(() => {
    load()
  }, [load])

  const handleActionClick = (action: typeof ACTIONS[number]) => {
    if (action === 'REJECT') {
      setActionNote('')
      setActionError('')
      setActionModal('REJECT')
    } else {
      setActionNote('')
      setActionError('')
      setActionModal(action)
    }
  }

  const handleActionConfirm = async () => {
    if (!data || actionBusy) return
    const action = actionModal
    if (!action) return
    if (action === 'REJECT' && (actionNote.trim().length < 5)) {
      setActionError('Rejection reason must be at least 5 characters.')
      return
    }
    setActionBusy(true)
    setActionError('')
    try {
      await actOnGovernanceProduct(data.productId, { action, note: actionNote.trim() || undefined })
      adminToast.success('Action completed.')
      setActionModal(null)
      setActionNote('')
      setLoading(true)
      await load()
    } catch (e: unknown) {
      setActionError((e as Error).message ?? 'Action failed')
    } finally {
      setActionBusy(false)
    }
  }

  const productStatus = data?.status ? String(data.status).toUpperCase() : ''
  const isActive = productStatus === 'ACTIVE'
  const isInactive = productStatus === 'INACTIVE'

  if (!id) {
    return (
      <AdminPageShell
        title="Product"
        breadcrumbs={[{ href: '/admin', label: 'Admin' }, { href: '/admin/producer-governance', label: 'Producer Governance' }, { href: '/admin/producer-governance/products', label: 'Products' }, { label: 'Detail' }]}
      >
        <ErrorState message="Invalid product ID" onRetry={() => router.push('/admin/producer-governance/products')} />
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell
      title={data?.name ?? `Product #${id}`}
      breadcrumbs={[
        { href: '/admin', label: 'Admin' },
        { href: '/admin/producer-governance', label: 'Producer Governance' },
        { href: '/admin/producer-governance/products', label: 'Products' },
        { label: data?.name ?? `#${id}` },
      ]}
      actions={
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <Link href="/admin/producer-governance/products" className="btn btn-outline-secondary btn-sm">
            ← Back to list
          </Link>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>
      }
    >
      {error ? (
        <ErrorState message={error} onRetry={load} className="mb-3" />
      ) : loading && !data ? (
        <LoadingSkeleton rows={8} />
      ) : data ? (
        <>
          <div className="row">
            <div className="col-lg-8">
              <div className="card border-0 shadow-sm mb-3">
                <div className="card-header bg-transparent border-0 py-3">
                  <h5 className="mb-0 fw-semibold">Product</h5>
                </div>
                <div className="card-body">
                  <dl className="row mb-0">
                    <dt className="col-sm-3 text-muted">Name</dt>
                    <dd className="col-sm-9">{data.name}</dd>
                    <dt className="col-sm-3 text-muted">SKU</dt>
                    <dd className="col-sm-9">{data.sku}</dd>
                    <dt className="col-sm-3 text-muted">Brand</dt>
                    <dd className="col-sm-9">{data.brandName ?? '—'}</dd>
                    <dt className="col-sm-3 text-muted">Type</dt>
                    <dd className="col-sm-9">{data.productType ?? '—'}</dd>
                    <dt className="col-sm-3 text-muted">Pack size</dt>
                    <dd className="col-sm-9">{data.packSize ?? '—'}</dd>
                    <dt className="col-sm-3 text-muted">Governance</dt>
                    <dd className="col-sm-9"><StatusChip status={data.currentStatus} /></dd>
                    <dt className="col-sm-3 text-muted">Live</dt>
                    <dd className="col-sm-9"><StatusChip status={isActive ? 'ACTIVE' : 'INACTIVE'} /></dd>
                    <dt className="col-sm-3 text-muted">Submitted</dt>
                    <dd className="col-sm-9">{data.submittedAt ? new Date(data.submittedAt).toLocaleString() : '—'}</dd>
                    <dt className="col-sm-3 text-muted">Reviewed</dt>
                    <dd className="col-sm-9">{data.reviewedAt ? new Date(data.reviewedAt).toLocaleString() : '—'}</dd>
                    {data.reviewNotes ? (
                      <>
                        <dt className="col-sm-3 text-muted">Review notes</dt>
                        <dd className="col-sm-9">{data.reviewNotes}</dd>
                      </>
                    ) : null}
                    {data.description ? (
                      <>
                        <dt className="col-sm-3 text-muted">Description</dt>
                        <dd className="col-sm-9">{data.description}</dd>
                      </>
                    ) : null}
                  </dl>
                </div>
              </div>

              {data.proofs && data.proofs.length > 0 ? (
                <div className="card border-0 shadow-sm mb-3">
                  <div className="card-header bg-transparent border-0 py-3">
                    <h5 className="mb-0 fw-semibold">Media / proofs</h5>
                  </div>
                  <div className="card-body">
                    <div className="d-flex flex-wrap gap-3">
                      {data.proofs.map((p) => (
                        <div key={p.id}>
                          <div className="small text-muted mb-1">{p.proofType}</div>
                          {p.media?.url ? (
                            <a href={p.media.url} target="_blank" rel="noopener noreferrer">
                              <img src={p.media.url} alt={p.proofType} style={{ maxWidth: 200, maxHeight: 200, objectFit: 'contain' }} className="border rounded" />
                            </a>
                          ) : (
                            <span className="text-muted">No media</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="col-lg-4">
              <div className="card border-0 shadow-sm mb-3">
                <div className="card-header bg-transparent border-0 py-3">
                  <h5 className="mb-0 fw-semibold">Producer</h5>
                </div>
                <div className="card-body">
                  <p className="mb-0">
                    <Link href={`/admin/producer-governance/${data.producerOrgId}`}>{data.producerOrgName ?? `Producer #${data.producerOrgId}`}</Link>
                  </p>
                </div>
              </div>

              <div className="card border-0 shadow-sm mb-3">
                <div className="card-header bg-transparent border-0 py-3">
                  <h5 className="mb-0 fw-semibold">Actions</h5>
                </div>
                <div className="card-body">
                  <p className="small text-muted mb-2">You can move this product to any status. All actions are allowed from the admin panel.</p>
                  <div className="d-flex flex-wrap gap-2">
                    <button type="button" className="btn btn-success btn-sm" disabled={actionBusy} onClick={() => handleActionClick('APPROVE')}>Approve</button>
                    <button type="button" className="btn btn-warning btn-sm" disabled={actionBusy} onClick={() => handleActionClick('DECLINE')}>Decline</button>
                    <button type="button" className="btn btn-danger btn-sm" disabled={actionBusy} onClick={() => handleActionClick('REJECT')}>Reject</button>
                    <button type="button" className="btn btn-success btn-sm" disabled={actionBusy} onClick={() => handleActionClick('PUBLISH')}>Activate</button>
                    <button type="button" className="btn btn-outline-secondary btn-sm" disabled={actionBusy} onClick={() => handleActionClick('UNPUBLISH')}>Deactivate</button>
                    <button type="button" className="btn btn-outline-secondary btn-sm" disabled={actionBusy} onClick={() => handleActionClick('RESET_TO_UNAPPROVED')}>Reset to unapproved</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {actionModal ? (
            <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">{actionModal.replace(/_/g, ' ')}</h5>
                    <button type="button" className="btn-close" onClick={() => { setActionModal(null); setActionError(''); }} aria-label="Close" />
                  </div>
                  <div className="modal-body">
                    {actionModal === 'REJECT' ? (
                      <div>
                        <label className="form-label">Reason (min 5 characters)</label>
                        <textarea className="form-control" rows={3} value={actionNote} onChange={(e) => setActionNote(e.target.value)} placeholder="Rejection reason for the producer" />
                      </div>
                    ) : (
                      <div>
                        <label className="form-label">Note (optional)</label>
                        <textarea className="form-control" rows={2} value={actionNote} onChange={(e) => setActionNote(e.target.value)} placeholder="Optional note" />
                      </div>
                    )}
                    {actionError ? <div className="alert alert-danger mt-2 mb-0">{actionError}</div> : null}
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => { setActionModal(null); setActionError(''); }}>Cancel</button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={actionBusy || (actionModal === 'REJECT' && actionNote.trim().length < 5)}
                      onClick={handleActionConfirm}
                    >
                      {actionBusy ? '…' : 'Confirm'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </AdminPageShell>
  )
}
