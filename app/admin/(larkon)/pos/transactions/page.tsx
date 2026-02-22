'use client'

import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@iconify/react'
import PageHeader from '@/src/bpa/components/PageHeader'
import SectionCard from '@/src/bpa/admin/components/SectionCard'
import { apiGet } from '@/lib/api'

export default function PosTransactionsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await apiGet('/api/v1/orders?paymentMethod=CASH')
      setRows(Array.isArray(res?.data) ? res.data : res?.data?.items ?? [])
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load POS transactions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter((r) => String(r.id ?? '').includes(q) || String(r.customer?.name ?? '').toLowerCase().includes(q) || String(r.branch?.name ?? '').toLowerCase().includes(q))
  }, [rows, search])

  return (
    <div className="container-fluid">
      <PageHeader
        title="POS Transactions"
        subtitle={`Total: ${filtered.length} transactions`}
        right={
          <div className="d-flex gap-2">
            <input className="form-control form-control-sm" style={{ width: 240 }} placeholder="Search order/customer..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1" onClick={load} disabled={loading}><Icon icon="solar:refresh-outline" />Refresh</button>
          </div>
        }
      />
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <SectionCard title="Cash Order Transactions">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead><tr><th>Order</th><th>Customer</th><th>Branch</th><th>Total</th><th>Date</th></tr></thead>
            <tbody>
              {filtered.map((r: any) => (
                <tr key={r.id}>
                  <td>#{r.id}</td>
                  <td>{r.customer?.name ?? r.customerName ?? 'Walk-in'}</td>
                  <td>{r.branch?.name ?? r.branchName ?? '—'}</td>
                  <td>{r.totalAmount ?? r.total ?? '—'}</td>
                  <td>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
              {!filtered.length && !loading ? <tr><td colSpan={5} className="text-center text-secondary py-4">No POS transactions found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
