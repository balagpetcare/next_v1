'use client'

import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@iconify/react'
import PageHeader from '@/src/bpa/components/PageHeader'
import SectionCard from '@/src/bpa/admin/components/SectionCard'
import StatusChip from '@/src/bpa/admin/components/StatusChip'
import { apiGet } from '@/lib/api'

export default function VendorsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await apiGet('/api/v1/vendors')
      setRows(Array.isArray(res?.data) ? res.data : res?.data?.items ?? [])
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load vendors')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter((r) => String(r.name ?? '').toLowerCase().includes(q) || String(r.contactPerson ?? '').toLowerCase().includes(q) || String(r.email ?? '').toLowerCase().includes(q))
  }, [rows, search])

  return (
    <div className="container-fluid">
      <PageHeader
        title="Vendors Management"
        subtitle={`Total: ${filtered.length} vendors`}
        right={
          <div className="d-flex gap-2">
            <input className="form-control form-control-sm" style={{ width: 250 }} placeholder="Search vendors..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1" onClick={load} disabled={loading}>
              <Icon icon="solar:refresh-outline" />
              Refresh
            </button>
          </div>
        }
      />
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <SectionCard title="Vendors">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead><tr><th>Vendor</th><th>Contact</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map((r: any) => (
                <tr key={r.id}>
                  <td><div className="fw-semibold">{r.name ?? '—'}</div><div className="text-secondary small">ID: {r.id}</div></td>
                  <td>{r.contactPerson ?? r.email ?? r.phone ?? '—'}</td>
                  <td><StatusChip status={r.status} /></td>
                </tr>
              ))}
              {!filtered.length && !loading ? <tr><td colSpan={3} className="text-center text-secondary py-4">No vendors found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
