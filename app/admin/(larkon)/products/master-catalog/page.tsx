'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Icon } from '@iconify/react'
import Link from 'next/link'
import SectionCard from '@/src/bpa/admin/components/SectionCard'
import StatusChip from '@/src/bpa/admin/components/StatusChip'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import { apiGet, apiPatch } from '@/lib/api'
import { adminToast } from '@/src/bpa/admin/lib/adminToast'

export default function MasterCatalogPage() {
  const [rows, setRows] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('limit', '50')
      if (search.trim()) params.set('search', search.trim())
      const res = await apiGet(`/api/v1/products/master-catalog?${params.toString()}`)
      const items = Array.isArray(res?.data) ? res.data : res?.data?.items ?? []
      setRows(items)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load master catalog')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => rows, [rows])

  const toggleActive = async (row: any) => {
    try {
      await apiPatch(`/api/v1/products/master-catalog/${row.id}`, { isActive: !row.isActive })
      adminToast.success('Status updated')
      await load()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to update status')
      adminToast.error((e as Error)?.message ?? 'Failed to update status')
    }
  }

  return (
    <AdminPageShell
      title="Master Product Catalog"
      breadcrumbs={[{ label: 'Operations' }, { label: 'Master Catalog' }]}
      actions={
        <div className="d-flex align-items-center gap-2">
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Search name, barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 260 }}
            aria-label="Search catalog"
          />
          <button className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1" onClick={load} disabled={loading} aria-label="Refresh">
            <Icon icon="solar:refresh-outline" aria-hidden />
            Refresh
          </button>
        </div>
      }
    >
      {error ? <div className="alert alert-danger">{error}</div> : null}

      <SectionCard title="Catalog Items">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Product</th>
                <th>Barcode</th>
                <th>Category</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row: any) => (
                <tr key={row.id}>
                  <td>
                    <div className="fw-semibold">{row.name ?? '—'}</div>
                    <div className="text-secondary small">ID: {row.id}</div>
                  </td>
                  <td>{row.barcode ?? '—'}</td>
                  <td>{row.category?.name ?? '—'}</td>
                  <td><StatusChip status={row.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                  <td className="text-end">
                    <div className="d-inline-flex gap-2">
                      <Link className="btn btn-sm btn-outline-primary" href={`/admin/products/master-catalog/${row.id}`}>View</Link>
                      <Link className="btn btn-sm btn-outline-primary" href={`/admin/products/master-catalog/${row.id}?edit=true`}>Edit</Link>
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => toggleActive(row)}>
                        {row.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && !loading ? <tr><td colSpan={5} className="text-center text-secondary py-4">No products found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </AdminPageShell>
  )
}
