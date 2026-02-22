'use client'

import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@iconify/react'
import PageHeader from '@/src/bpa/components/PageHeader'
import SectionCard from '@/src/bpa/admin/components/SectionCard'
import StatusChip from '@/src/bpa/admin/components/StatusChip'
import { apiGet } from '@/lib/api'

export default function ServiceCatalogPage() {
  const [rows, setRows] = useState<any[]>([])
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (search.trim()) params.set('search', search.trim())
      const res = await apiGet(`/api/v1/services?${params.toString()}`)
      setRows(Array.isArray(res?.data) ? res.data : res?.data?.items ?? [])
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load services')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [category])
  const filtered = useMemo(() => rows, [rows])

  return (
    <div className="container-fluid">
      <PageHeader
        title="Service Catalog"
        subtitle={`Total: ${filtered.length} services`}
        right={
          <div className="d-flex gap-2">
            <input className="form-control form-control-sm" style={{ width: 220 }} placeholder="Search services..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <input className="form-control form-control-sm" style={{ width: 140 }} placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
            <button className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1" onClick={load} disabled={loading}><Icon icon="solar:refresh-outline" />Refresh</button>
          </div>
        }
      />
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <SectionCard title="Services">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map((r: any) => (
                <tr key={r.id}>
                  <td><div className="fw-semibold">{r.name ?? '—'}</div><div className="text-secondary small">ID: {r.id}</div></td>
                  <td>{r.category ?? '—'}</td><td>{r.price ?? '—'}</td><td><StatusChip status={r.status} /></td>
                </tr>
              ))}
              {!filtered.length && !loading ? <tr><td colSpan={4} className="text-center text-secondary py-4">No services found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
