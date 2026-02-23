'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import SectionCard from '@/src/bpa/admin/components/SectionCard'
import { apiDelete, apiGet, apiPost } from '@/lib/api'

type RoleRow = { id: number; key: string; label?: string; name?: string; scope?: string }
type InviteRow = { id: number; email: string; roleId?: number; role?: { key?: string; label?: string }; displayName?: string; status?: string; expiresAt?: string }
type AssignmentRow = { userId: number; roleId: number; user?: any; role?: any; createdAt?: string }

export default function CountryUsersPage() {
  const params = useParams<{ id?: string }>()
  const countryId = useMemo(() => Number(params?.id), [params])
  const [roles, setRoles] = useState<RoleRow[]>([])
  const [rows, setRows] = useState<AssignmentRow[]>([])
  const [invites, setInvites] = useState<InviteRow[]>([])
  const [form, setForm] = useState({ email: '', displayName: '', roleId: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!countryId) return
    setLoading(true)
    setError('')
    try {
      const [usersRes, rolesRes, invitesRes] = await Promise.all([
        apiGet<{ data?: AssignmentRow[] }>(`/api/v1/admin/country/countries/${countryId}/users`),
        apiGet<{ data?: RoleRow[] }>('/api/v1/admin/roles'),
        apiGet<{ data?: InviteRow[] }>(`/api/v1/admin/access-invites?countryId=${countryId}&scopeType=COUNTRY`),
      ])
      const allRoles = rolesRes?.data ?? []
      setRoles(allRoles.filter((r) => r.scope === 'COUNTRY'))
      setRows(usersRes?.data ?? [])
      setInvites(invitesRes?.data ?? [])
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [countryId])

  useEffect(() => {
    load()
  }, [load])

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.roleId) return
    setLoading(true)
    setError('')
    try {
      await apiPost('/api/v1/admin/access-invites', {
        scopeType: 'COUNTRY',
        countryId,
        roleId: Number(form.roleId),
        email: form.email,
        displayName: form.displayName?.trim() || undefined,
      })
      setForm({ email: '', displayName: '', roleId: '' })
      await load()
    } catch (e2) {
      setError((e2 as Error)?.message ?? 'Invite failed')
    } finally {
      setLoading(false)
    }
  }

  const onRevokeInvite = async (row: InviteRow) => {
    setLoading(true)
    setError('')
    try {
      await apiPost(`/api/v1/admin/access-invites/${row.id}/revoke`, {})
      await load()
    } catch (e) {
      setError((e as Error)?.message ?? 'Revoke failed')
    } finally {
      setLoading(false)
    }
  }

  const onResendInvite = async (row: InviteRow) => {
    setLoading(true)
    setError('')
    try {
      await apiPost('/api/v1/admin/access-invites', {
        scopeType: 'COUNTRY',
        countryId,
        roleId: Number(row.roleId),
        email: row.email,
        displayName: row.displayName || undefined,
      })
      await load()
    } catch (e) {
      setError((e as Error)?.message ?? 'Resend failed')
    } finally {
      setLoading(false)
    }
  }

  const onRemove = async (row: AssignmentRow) => {
    setLoading(true)
    setError('')
    try {
      await apiDelete(`/api/v1/admin/country/countries/${countryId}/users/${row.userId}/roles/${row.roleId}`)
      await load()
    } catch (e) {
      setError((e as Error)?.message ?? 'Remove failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminPageShell
      title="Country Staff"
      breadcrumbs={[{ label: 'Geography' }, { label: 'Countries', href: '/admin/countries' }, { label: `#${countryId}` }, { label: 'Users' }]}
      actions={
        <button className="btn btn-outline-primary btn-sm" onClick={load} disabled={loading}>
          Refresh
        </button>
      }
    >
      {error ? <div className="alert alert-danger">{error}</div> : null}

      <SectionCard title="Invite Country Staff">
        <form className="row g-3" onSubmit={onInvite}>
          <div className="col-md-4">
            <label className="form-label">Email</label>
            <input className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="staff@email.com" required />
          </div>
          <div className="col-md-4">
            <label className="form-label">Display Name (optional)</label>
            <input className="form-control" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Staff name" />
          </div>
          <div className="col-md-3">
            <label className="form-label">Role</label>
            <select className="form-select" value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} required>
              <option value="">Select role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label ?? r.name} ({r.key})
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-1 d-flex align-items-end">
            <button className="btn btn-primary w-100" disabled={loading}>Invite</button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Country Staff Assignments" className="mt-3">
        {loading ? <div className="text-secondary">Loading…</div> : null}
        <div className="table-responsive">
          <table className="table table-sm table-hover">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Display</th>
                <th>Role</th>
                <th>Assigned At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.userId}-${row.roleId}`}>
                  <td>{row.userId}</td>
                  <td>{row.user?.profile?.displayName || row.user?.profile?.username || '-'}</td>
                  <td>{row.role?.label || row.role?.key}</td>
                  <td>{row.createdAt ? new Date(String(row.createdAt)).toLocaleString() : '-'}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => onRemove(row)} disabled={loading}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={5} className="text-muted">No country staff assigned.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Pending Invites" className="mt-3">
        {loading ? <div className="text-secondary">Loading…</div> : null}
        <div className="table-responsive">
          <table className="table table-sm table-hover">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Expires</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((row) => (
                <tr key={row.id}>
                  <td>{row.email}</td>
                  <td>{row.role?.label || row.role?.key || row.roleId}</td>
                  <td>{row.status}</td>
                  <td>{row.expiresAt ? new Date(String(row.expiresAt)).toLocaleString() : '-'}</td>
                  <td className="d-flex gap-2">
                    <button className="btn btn-sm btn-outline-primary" onClick={() => onResendInvite(row)} disabled={loading}>Resend</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => onRevokeInvite(row)} disabled={loading || row.status !== 'PENDING'}>Revoke</button>
                  </td>
                </tr>
              ))}
              {!invites.length ? (
                <tr>
                  <td colSpan={5} className="text-muted">No invites found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </AdminPageShell>
  )
}

