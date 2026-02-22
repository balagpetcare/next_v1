'use client'

import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@iconify/react'
import PageHeader from '@/src/bpa/components/PageHeader'
import SectionCard from '@/src/bpa/admin/components/SectionCard'
import StatusChip from '@/src/bpa/admin/components/StatusChip'
import { apiGet } from '@/lib/api'

export default function ReturnsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      const res = await apiGet(`/api/v1/returns?${params.toString()}`)
      setRows(Array.isArray(res?.data) ? res.data : res?.data?.items ?? [])
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load returns')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [status])

  const filtered = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter((r) => String(r.id ?? '').includes(q) || String(r.orderId ?? '').includes(q))
  }, [rows, search])

  return (
    <div className="container-fluid">
      <PageHeader
        title="Returns Management"
        subtitle={`Total: ${filtered.length} returns`}
        right={
          <div className="d-flex gap-2">
            <input className="form-control form-control-sm" style={{ width: 220 }} placeholder="Search return/order..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="form-select form-select-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All status</option><option value="PENDING">PENDING</option><option value="APPROVED">APPROVED</option><option value="REJECTED">REJECTED</option><option value="REFUNDED">REFUNDED</option>
            </select>
            <button className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1" onClick={load} disabled={loading}><Icon icon="solar:refresh-outline" />Refresh</button>
          </div>
        }
      />
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <SectionCard title="Returns">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead><tr><th>Return ID</th><th>Order ID</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map((r: any) => (
                <tr key={r.id}>
                  <td>#{r.id}</td><td>#{r.orderId ?? '—'}</td><td>{r.refundAmount ?? '—'}</td><td><StatusChip status={r.status} /></td>
                </tr>
              ))}
              {!filtered.length && !loading ? <tr><td colSpan={4} className="text-center text-secondary py-4">No returns found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
