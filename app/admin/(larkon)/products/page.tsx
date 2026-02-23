'use client'

import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@iconify/react'
import Link from 'next/link'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import SectionCard from '@/src/bpa/admin/components/SectionCard'
import StatusChip from '@/src/bpa/admin/components/StatusChip'
import { apiGet, apiPost } from '@/lib/api'

const STATUS = ['', 'ACTIVE', 'INACTIVE', 'PENDING_APPROVAL', 'REJECTED']
const APPROVAL_STATUS = ['', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED']

export default function AdminProductsIndexPage() {
  const [rows, setRows] = useState<any[]>([])
  const [status, setStatus] = useState('')
  const [approvalStatus, setApprovalStatus] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (status) params.append('status', status)
      if (approvalStatus) params.append('approvalStatus', approvalStatus)
      const r = await apiGet(`/api/v1/products?${params.toString()}`)
      setRows(Array.isArray((r as any)?.data) ? (r as any).data : (r as any)?.data?.items || [])
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [status, approvalStatus])

  const filtered = useMemo(() => {
    if (!search) return rows
    const q = search.toLowerCase()
    return rows.filter((r) => {
      const name = String(r?.name || '').toLowerCase()
      const slug = String(r?.slug || '').toLowerCase()
      const id = String(r?.id || '')
      return name.includes(q) || slug.includes(q) || id.includes(q)
    })
  }, [rows, search])

  const handleApprove = async (productId: number) => {
    if (!confirm('Approve this product?')) return
    try {
      await apiPost(`/api/v1/products/${productId}/approve`, {})
      await load()
    } catch (e) {
      alert((e as Error)?.message ?? 'Failed to approve product')
    }
  }

  const handleReject = async (productId: number) => {
    const reason = prompt('Enter rejection reason:')
    if (!reason) return
    try {
      await apiPost(`/api/v1/products/${productId}/reject`, { reason })
      await load()
    } catch (e) {
      alert((e as Error)?.message ?? 'Failed to reject product')
    }
  }

  return (
    <AdminPageShell
      title="Products"
      breadcrumbs={[{ label: 'Operations' }, { label: 'Products' }]}
      actions={
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Search name, slug, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 250 }}
          />
          <select
            className="form-select form-select-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ width: 170 }}
          >
            {STATUS.map((s) => (
              <option key={s} value={s}>{s || 'All Status'}</option>
            ))}
          </select>
          <select
            className="form-select form-select-sm"
            value={approvalStatus}
            onChange={(e) => setApprovalStatus(e.target.value)}
            style={{ width: 190 }}
          >
            {APPROVAL_STATUS.map((s) => (
              <option key={s} value={s}>{s || 'All Approval'}</option>
            ))}
          </select>
          <button onClick={load} disabled={loading} className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2">
            <Icon icon="solar:refresh-outline" aria-hidden />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          <Link href="/admin/products/moderation" className="btn btn-outline-primary btn-sm">Moderation queue</Link>
          <Link href="/admin/products/master-catalog" className="btn btn-primary btn-sm">Master catalog</Link>
        </div>
      }
    >
      {error ? <div className="alert alert-danger">{error}</div> : null}

      <SectionCard title="Products" right={<span className="text-secondary small">Total: {filtered.length}</span>}>
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Variants</th>
                <th>Status</th>
                <th>Approval</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="fw-semibold">{r.name || '—'}</div>
                    <div className="text-secondary" style={{ fontSize: 12 }}>ID: {r.id} • {r.slug || '—'}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>{r.category?.name || '—'}</td>
                  <td style={{ fontSize: 13 }}>{r.variants?.length || 0} variants</td>
                  <td><StatusChip status={String(r.status ?? '')} /></td>
                  <td><StatusChip status={String(r.approvalStatus ?? '')} /></td>
                  <td className="text-end">
                    <div className="d-flex gap-2 justify-content-end">
                      <Link className="btn btn-sm btn-primary" href={`/admin/products/${r.id}`}>View</Link>
                      {r.approvalStatus === 'PENDING_APPROVAL' ? (
                        <>
                          <button className="btn btn-sm btn-success" onClick={() => handleApprove(r.id)}>Approve</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleReject(r.id)}>Reject</button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && !loading ? (
                <tr>
                  <td colSpan={6} className="text-secondary text-center" style={{ fontSize: 13 }}>No products found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </AdminPageShell>
  )
}

