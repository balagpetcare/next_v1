'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import PageHeader from '@/src/bpa/components/PageHeader'
import SectionCard from '@/src/bpa/admin/components/SectionCard'
import StatusChip from '@/src/bpa/admin/components/StatusChip'
import { apiGet, apiPost } from '@/lib/api'

export default function ModerationQueuePage() {
  const [tab, setTab] = useState('PENDING_APPROVAL')
  const [rows, setRows] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('approvalStatus', tab)
      const res = await apiGet(`/api/v1/products?${params.toString()}`)
      const items = Array.isArray(res?.data) ? res.data : res?.data?.items ?? []
      setRows(items)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load moderation queue')
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter((r) => String(r.id ?? '').includes(q) || String(r.name ?? '').toLowerCase().includes(q) || String(r.slug ?? '').toLowerCase().includes(q))
  }, [rows, search])

  const decide = async (id: number, action: 'approve' | 'reject') => {
    const confirmed = window.confirm(`Are you sure you want to ${action} this product?`)
    if (!confirmed) return
    try {
      await apiPost(`/api/v1/products/${id}/${action}`, {})
      await load()
    } catch (e: any) {
      setError(e?.message ?? `Failed to ${action} product`)
    }
  }

  return (
    <div className="container-fluid">
      <PageHeader
        title="Product Moderation Queue"
        subtitle="Review and decide pending catalog products"
        right={
          <input
            type="text"
            className="form-control form-control-sm"
            style={{ width: 280 }}
            placeholder="Search name, slug, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        }
      />
      {error ? <div className="alert alert-danger">{error}</div> : null}

      <div className="d-flex gap-2 mb-3">
        {['PENDING_APPROVAL', 'APPROVED', 'REJECTED'].map((status) => (
          <button key={status} className={`btn btn-sm ${tab === status ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setTab(status)}>
            {status.replace('_', ' ')}
          </button>
        ))}
      </div>

      <SectionCard title="Moderation Items" right={<span className="text-secondary small">{filtered.length} item(s)</span>}>
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Approval</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row: any) => (
                <tr key={row.id}>
                  <td>
                    <div className="fw-semibold">{row.name ?? '—'}</div>
                    <div className="text-secondary small">#{row.id} · {row.slug ?? '—'}</div>
                  </td>
                  <td>{row.category?.name ?? '—'}</td>
                  <td><StatusChip status={row.approvalStatus} /></td>
                  <td className="text-end">
                    {row.approvalStatus === 'PENDING_APPROVAL' ? (
                      <div className="d-inline-flex gap-2">
                        <button className="btn btn-sm btn-success" onClick={() => decide(row.id, 'approve')}>Approve</button>
                        <button className="btn btn-sm btn-danger" onClick={() => decide(row.id, 'reject')}>Reject</button>
                      </div>
                    ) : (
                      <span className="text-secondary small">No actions</span>
                    )}
                  </td>
                </tr>
              ))}
              {!filtered.length && !loading ? <tr><td colSpan={4} className="text-center text-secondary py-4">No products found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
