'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import SectionCard from '@/src/bpa/admin/components/SectionCard'

type PermissionItem = { id?: number; key?: string; label?: string; description?: string }

export default function AdminPermissionsPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState<PermissionItem[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await apiGet<any>('/api/v1/admin/permissions')
      const directList = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.items)
          ? res.data.items
          : Array.isArray(res?.items)
            ? res.items
            : null

      if (directList) {
        setItems(directList)
      } else if (Array.isArray(res?.data?.groups)) {
        const flattened = res.data.groups.flatMap((g: any) =>
          Array.isArray(g?.permissions) ? g.permissions : []
        )
        setItems(flattened)
      } else {
        setItems([])
      }
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <AdminPageShell
      title="Permissions"
      breadcrumbs={[{ label: 'Users & Access' }, { label: 'Permissions' }]}
      actions={
        <button type="button" className="btn btn-outline-primary btn-sm" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      }
    >
      <p className="text-secondary mb-3 small">Read-only catalog. Assign via Roles.</p>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <SectionCard title="Permission list">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Key</th>
                <th>Label</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id ?? p.key ?? ''}>
                  <td className="font-monospace">{p.key}</td>
                  <td>{p.label ?? '—'}</td>
                  <td className="text-secondary">{p.description ?? '—'}</td>
                </tr>
              ))}
              {!items.length && !loading ? (
                <tr>
                  <td colSpan={3} className="text-secondary text-center">
                    No permissions found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {loading ? <div className="text-center text-secondary py-2">Loading…</div> : null}
      </SectionCard>
    </AdminPageShell>
  )
}
