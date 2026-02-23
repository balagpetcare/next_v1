'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import SectionCard from '@/src/bpa/admin/components/SectionCard'
import { apiGet, apiPatch, apiPost } from '@/lib/api'

type PolicyRow = { id: number; name?: string; status?: string; effectiveFrom?: string | null }

export default function StatePoliciesPage() {
  const params = useParams<{ id?: string }>()
  const stateId = useMemo(() => Number(params?.id), [params])
  const [rows, setRows] = useState<PolicyRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', status: 'DRAFT' })

  const load = useCallback(async () => {
    if (!stateId) return
    setLoading(true)
    setError('')
    try {
      const res = await apiGet<{ data?: PolicyRow[] }>(`/api/v1/admin/state/states/${stateId}/policies`)
      setRows(res?.data ?? [])
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [stateId])

  useEffect(() => {
    load()
  }, [load])

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stateId) return
    setLoading(true)
    setError('')
    try {
      await apiPost(`/api/v1/admin/state/states/${stateId}/policies`, {
        name: form.name || 'Draft State Policy',
        status: form.status,
      })
      setForm({ name: '', status: 'DRAFT' })
      await load()
    } catch (e2) {
      setError((e2 as Error)?.message ?? 'Create failed')
    } finally {
      setLoading(false)
    }
  }

  const activate = async (policyId: number) => {
    setLoading(true)
    setError('')
    try {
      await apiPost(`/api/v1/admin/state/policies/${policyId}/activate`, {})
      await load()
    } catch (e) {
      setError((e as Error)?.message ?? 'Activate failed')
    } finally {
      setLoading(false)
    }
  }

  const archive = async (policyId: number) => {
    setLoading(true)
    setError('')
    try {
      await apiPatch(`/api/v1/admin/state/policies/${policyId}`, { status: 'ARCHIVED' })
      await load()
    } catch (e) {
      setError((e as Error)?.message ?? 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminPageShell
      title="State Policies"
      breadcrumbs={[{ label: 'Geography' }, { label: 'States', href: '/admin/states' }, { label: `#${stateId}` }, { label: 'Policies' }]}
    >
      <SectionCard title="Create Policy">
        <form className="row g-3" onSubmit={onCreate}>
          <div className="col-md-6">
            <label className="form-label">Name</label>
            <input
              className="form-control"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Dhaka Default Policy"
            />
          </div>
          <div className="col-md-3">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="DRAFT">DRAFT</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>
          <div className="col-md-3 d-flex align-items-end">
            <button className="btn btn-primary w-100" disabled={loading}>Create</button>
          </div>
        </form>
        {error ? <div className="text-danger mt-2">{error}</div> : null}
      </SectionCard>

      <SectionCard title="Policies" className="mt-3">
        {loading ? <div className="text-secondary">Loading…</div> : null}
        <div className="table-responsive">
          <table className="table table-sm table-hover">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Status</th>
                <th>Effective From</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.name}</td>
                  <td>{row.status}</td>
                  <td>{row.effectiveFrom ? new Date(String(row.effectiveFrom)).toLocaleString() : '-'}</td>
                  <td className="d-flex gap-2 flex-wrap">
                    <button className="btn btn-sm btn-outline-success" onClick={() => activate(row.id)} disabled={loading}>Activate</button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => archive(row.id)} disabled={loading}>Archive</button>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={5} className="text-muted">No policies found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </AdminPageShell>
  )
}

