'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import ErrorState from '@/src/bpa/admin/components/ErrorState'
import LoadingSkeleton from '@/src/bpa/admin/components/LoadingSkeleton'
import StatusChip from '@/src/bpa/admin/components/StatusChip'
import { getGovernance, postGovernance } from '@/src/bpa/admin/lib/governanceApi'

type CodeLookupData = {
  found: boolean
  code?: {
    id: number
    codeHashMasked: string
    status: string
    verifyCount: number
    firstVerifiedAt: string | null
    issuedAt: string | null
    printedAt: string | null
  }
  batch?: {
    id: number
    batchNo: string
    status: string
    mfgDate: string | null
    expDate: string | null
    frozenAt: string | null
    quarantinedAt: string | null
  }
  product?: {
    id: number
    productName: string
    sku: string
    brandName: string
    status: string
  }
  producerOrg?: {
    id: number
    name: string
    status: string
    countryCode: string | null
  }
  verificationHistory?: Array<{
    id: number
    result: string
    country: string | null
    createdAt: string
  }>
}

export default function CodeLookupPage() {
  const searchParams = useSearchParams()
  const [query, setQuery] = useState('')
  const [data, setData] = useState<CodeLookupData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const search = useCallback(async () => {
    const code = query.trim()
    if (!code) return
    setLoading(true)
    setError('')
    setData(null)
    try {
      const res = await getGovernance<CodeLookupData>(`/admin/code-lookup?code=${encodeURIComponent(code)}`)
      setData(res.data ?? { found: false })
    } catch (e: unknown) {
      const msg = (e as Error)?.message ?? 'Code lookup failed'
      setError(msg)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    const codeFromUrl = searchParams.get('code')?.trim()
    if (!codeFromUrl) return
    setQuery(codeFromUrl)
    setData(null)
    setError('')
    setLoading(true)
    getGovernance<CodeLookupData>(`/admin/code-lookup?code=${encodeURIComponent(codeFromUrl)}`)
      .then((res) => setData(res.data ?? { found: false }))
      .catch((e) => {
        setError((e as Error)?.message ?? 'Code lookup failed')
        setData(null)
      })
      .finally(() => setLoading(false))
  }, [searchParams])

  const handleBlockUnblock = useCallback(
    async (action: 'BLOCK' | 'UNBLOCK') => {
      const code = query.trim()
      if (!code || !data?.found) return
      setActionLoading(true)
      setError('')
      try {
        await postGovernance('/admin/code-lookup/block', {
          code,
          action,
          reason: action === 'BLOCK' ? 'Blocked via admin code lookup' : 'Unblocked via admin code lookup',
        })
        await search()
      } catch (e: unknown) {
        setError((e as Error)?.message ?? 'Action failed')
      } finally {
        setActionLoading(false)
      }
    },
    [query, data?.found, search]
  )

  return (
    <AdminPageShell
      title="Code Lookup"
      breadcrumbs={[
        { href: '/admin', label: 'Admin' },
        { label: 'Producer Governance' },
        { label: 'Code Lookup' },
      ]}
      actions={
        <Link href="/admin/enforcement/cases" className="btn btn-outline-secondary btn-sm">
          Open incident
        </Link>
      }
    >
      <p className="text-secondary small mb-3">
        Enter a code or serial to see producer, product, batch, and verification history. Use Block/Unblock with enforcement permission.
      </p>

      <div className="card mb-4">
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <input
              type="text"
              className="form-control"
              style={{ maxWidth: 320 }}
              placeholder="Enter code (e.g. A1B2C3D4...)"
              value={query}
              onChange={(e) => setQuery(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              aria-label="Code or serial"
            />
            <button type="button" className="btn btn-primary" onClick={search} disabled={loading || !query.trim()}>
              {loading ? 'Searching…' : 'Search'}
            </button>
            <span className="text-muted small">Ctrl+K to focus search</span>
          </div>
        </div>
      </div>

      {error ? <ErrorState message={error} onRetry={search} /> : null}

      {loading && !data ? (
        <div className="card"><div className="card-body"><LoadingSkeleton rows={4} /></div></div>
      ) : data && !data.found && query.trim() ? (
        <div className="alert alert-info">Code not found. Check the value and try again.</div>
      ) : data?.found ? (
        <>
          <div className="row g-3 mb-4">
            <div className="col-md-6 col-lg-3">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="mb-2">Code identity</h6>
                  {data.code && (
                    <>
                      <div className="mb-1"><StatusChip status={data.code.status} /></div>
                      <div className="small text-muted">Hash: {data.code.codeHashMasked}</div>
                      <div className="small">Verify count: {data.code.verifyCount}</div>
                      <div className="small">First verified: {data.code.firstVerifiedAt ? new Date(data.code.firstVerifiedAt).toLocaleString() : '—'}</div>
                      <div className="small">Printed: {data.code.printedAt ? new Date(data.code.printedAt).toLocaleString() : '—'}</div>
                      <div className="small">Issued: {data.code.issuedAt ? new Date(data.code.issuedAt).toLocaleString() : '—'}</div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="col-md-6 col-lg-3">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="mb-2">Batch</h6>
                  {data.batch ? (
                    <>
                      <div className="mb-1"><StatusChip status={data.batch.status} /></div>
                      <div className="small">Batch #: {data.batch.batchNo}</div>
                      <Link href={`/admin/batch-control/${data.batch.id}`} className="btn btn-sm btn-outline-primary mt-2">View batch</Link>
                    </>
                  ) : (
                    <span className="text-muted small">—</span>
                  )}
                </div>
              </div>
            </div>
            <div className="col-md-6 col-lg-3">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="mb-2">Product & producer</h6>
                  {data.producerOrg && (
                    <div className="mb-2">
                      <span className="small text-muted">Producer: </span>
                      <Link href={`/admin/producer-governance/${data.producerOrg.id}`}>{data.producerOrg.name}</Link>
                      <StatusChip status={data.producerOrg.status} />
                    </div>
                  )}
                  {data.product && (
                    <>
                      <div className="small">{data.product.brandName} · {data.product.productName}</div>
                      <div className="small text-muted">SKU: {data.product.sku}</div>
                      <Link href={`/admin/producer-governance/products/${data.product.id}`} className="btn btn-sm btn-outline-primary mt-2">View product</Link>
                    </>
                  )}
                  {!data.producerOrg && !data.product && <span className="text-muted small">—</span>}
                </div>
              </div>
            </div>
            <div className="col-md-6 col-lg-3">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="mb-2">Actions</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {data.code?.status === 'BLOCKED' ? (
                      <button type="button" className="btn btn-sm btn-success" onClick={() => handleBlockUnblock('UNBLOCK')} disabled={actionLoading}>
                        Unblock code
                      </button>
                    ) : (
                      <button type="button" className="btn btn-sm btn-warning" onClick={() => handleBlockUnblock('BLOCK')} disabled={actionLoading}>
                        Block code
                      </button>
                    )}
                    <Link
                      href={`/admin/enforcement/cases?entityType=CODE&entityId=${encodeURIComponent(query.trim())}&producerOrgId=${data.producerOrg?.id ?? ''}`}
                      className="btn btn-sm btn-outline-danger"
                    >
                      Open incident
                    </Link>
                  </div>
                  <p className="small text-muted mt-2 mb-0">Block/Unblock requires enforcement permission.</p>
                </div>
              </div>
            </div>
          </div>

          {data.verificationHistory && data.verificationHistory.length > 0 ? (
            <div className="card">
              <div className="card-body">
                <h6 className="mb-3">Verification history</h6>
                <div className="table-responsive">
                  <table className="table table-sm table-hover">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Result</th>
                        <th>Country</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.verificationHistory.map((v) => (
                        <tr key={v.id}>
                          <td>{new Date(v.createdAt).toLocaleString()}</td>
                          <td><StatusChip status={v.result} /></td>
                          <td>{v.country ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="small text-muted mb-0 mt-2">Showing last {data.verificationHistory?.length ?? 0} verification events.</p>
              </div>
            </div>
          ) : data?.found ? (
            <div className="card">
              <div className="card-body">
                <h6 className="mb-2">Verification history</h6>
                <p className="text-muted small mb-0">No verification events for this code.</p>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </AdminPageShell>
  )
}
