'use client'

import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import PageHeader from '@/src/bpa/components/PageHeader'
import SectionCard from '@/src/bpa/admin/components/SectionCard'
import StatCard from '@/src/bpa/admin/components/StatCard'
import { apiGet } from '@/lib/api'

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sales, setSales] = useState<any>(null)
  const [revenue, setRevenue] = useState<any>(null)
  const [topProducts, setTopProducts] = useState<any[]>([])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [salesRes, topRes, revenueRes] = await Promise.all([
        apiGet('/api/v1/reports/sales?groupBy=month').catch(() => ({ data: null })),
        apiGet('/api/v1/reports/top-products?limit=10').catch(() => ({ data: [] })),
        apiGet('/api/v1/reports/revenue?groupBy=month').catch(() => ({ data: null })),
      ])
      setSales(salesRes?.data ?? null)
      setTopProducts(Array.isArray(topRes?.data) ? topRes.data : [])
      setRevenue(revenueRes?.data ?? null)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="container-fluid">
      <PageHeader
        title="Analytics & Reports"
        subtitle="High-level business and operations metrics"
        right={<button className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1" onClick={load} disabled={loading}><Icon icon="solar:refresh-outline" />Refresh</button>}
      />
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <div className="row g-3 mb-3">
        <div className="col-12 col-sm-6 col-lg-3"><StatCard title="Total Sales" value={sales?.summary?.totalSales ?? 0} tone="success" /></div>
        <div className="col-12 col-sm-6 col-lg-3"><StatCard title="Total Orders" value={sales?.summary?.totalOrders ?? 0} tone="primary" /></div>
        <div className="col-12 col-sm-6 col-lg-3"><StatCard title="Revenue" value={revenue?.totalRevenue ?? 0} tone="info" /></div>
        <div className="col-12 col-sm-6 col-lg-3"><StatCard title="Avg Order Value" value={revenue?.averageOrderValue ?? 0} tone="warning" /></div>
      </div>
      <SectionCard title="Top Products">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead><tr><th>Product</th><th>Qty</th><th className="text-end">Revenue</th></tr></thead>
            <tbody>
              {topProducts.map((p: any, idx: number) => (
                <tr key={`${p.productName}-${idx}`}><td>{p.productName ?? '—'}</td><td>{p.totalQuantity ?? 0}</td><td className="text-end">{p.totalRevenue ?? 0}</td></tr>
              ))}
              {!topProducts.length && !loading ? <tr><td colSpan={3} className="text-center text-secondary py-4">No data available.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
