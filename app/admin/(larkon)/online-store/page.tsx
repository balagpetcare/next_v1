'use client'

import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import PageHeader from '@/src/bpa/components/PageHeader'
import SectionCard from '@/src/bpa/admin/components/SectionCard'
import StatCard from '@/src/bpa/admin/components/StatCard'
import { apiGet } from '@/lib/api'

export default function OnlineStorePage() {
  const [stats, setStats] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [statsRes, itemsRes] = await Promise.all([
        apiGet('/api/v1/online-store/stats').catch(() => ({ data: null })),
        apiGet('/api/v1/online-store/inventory').catch(() => ({ data: [] })),
      ])
      setStats(statsRes?.data ?? null)
      setItems(Array.isArray(itemsRes?.data) ? itemsRes.data : itemsRes?.data?.items ?? [])
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load online store data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="container-fluid">
      <PageHeader
        title="Online Store Overview"
        subtitle="Store KPIs and inventory visibility"
        right={<button className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1" onClick={load} disabled={loading}><Icon icon="solar:refresh-outline" />Refresh</button>}
      />
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <div className="row g-3 mb-3">
        <div className="col-12 col-sm-6 col-lg-3"><StatCard title="Orders" value={stats?.orders ?? 0} tone="primary" /></div>
        <div className="col-12 col-sm-6 col-lg-3"><StatCard title="Revenue" value={stats?.revenue ?? 0} tone="success" /></div>
        <div className="col-12 col-sm-6 col-lg-3"><StatCard title="Products" value={stats?.products ?? items.length} tone="info" /></div>
        <div className="col-12 col-sm-6 col-lg-3"><StatCard title="Low Stock" value={stats?.lowStock ?? 0} tone="warning" /></div>
      </div>
      <SectionCard title="Store Inventory Snapshot">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead><tr><th>Product</th><th>Stock</th><th>Price</th></tr></thead>
            <tbody>
              {items.map((item: any) => (
                <tr key={item.id}><td>{item.name ?? '—'}</td><td>{item.stock ?? item.quantity ?? 0}</td><td>{item.price ?? '—'}</td></tr>
              ))}
              {!items.length && !loading ? <tr><td colSpan={3} className="text-center text-secondary py-4">No inventory data.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
