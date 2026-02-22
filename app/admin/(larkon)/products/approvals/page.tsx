'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/src/bpa/components/PageHeader'
import SectionCard from '@/src/bpa/admin/components/SectionCard'
import StatusChip from '@/src/bpa/admin/components/StatusChip'
import { apiGet, apiPost } from '@/lib/api'

export default function ProductApprovalsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('approvalStatus', 'PENDING_APPROVAL')
      const res = await apiGet(`/api/v1/products?${params.toString()}`)
      setRows(Array.isArray(res?.data) ? res.data : res?.data?.items ?? [])
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load approvals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const approve = async (id: number) => {
    try {
      await apiPost(`/api/v1/products/${id}/approve`, {})
      await load()
    } catch (e: any) {
      setError(e?.message ?? 'Approve failed')
    }
  }

  const reject = async (id: number) => {
    const reason = window.prompt('Optional reject reason')
    try {
      await apiPost(`/api/v1/products/${id}/reject`, { reason: reason || undefined })
      await load()
    } catch (e: any) {
      setError(e?.message ?? 'Reject failed')
    }
  }

  return (
    <div className="container-fluid">
      <PageHeader title="Product Approvals" subtitle={`Pending items: ${rows.length}`} />
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <SectionCard title="Pending Product Approvals">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead><tr><th>Product</th><th>Category</th><th>Status</th><th className="text-end">Actions</th></tr></thead>
            <tbody>
              {rows.map((row: any) => (
                <tr key={row.id}>
                  <td><div className="fw-semibold">{row.name ?? '—'}</div><div className="text-secondary small">#{row.id}</div></td>
                  <td>{row.category?.name ?? '—'}</td>
                  <td><StatusChip status={row.approvalStatus} /></td>
                  <td className="text-end">
                    <div className="d-inline-flex gap-2">
                      <button className="btn btn-sm btn-success" onClick={() => approve(row.id)}>Approve</button>
                      <button className="btn btn-sm btn-danger" onClick={() => reject(row.id)}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && !loading ? <tr><td colSpan={4} className="text-center text-secondary py-4">No pending approvals.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
