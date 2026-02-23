'use client'

import { apiGet, apiPatch, apiPost } from '@/lib/api'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Card } from 'react-bootstrap'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import AdminFiltersBar from '@/src/bpa/admin/components/AdminFiltersBar'
import { useAdminFilters } from '@/src/bpa/admin/hooks/useAdminFilters'
import { adminToast } from '@/src/bpa/admin/lib/adminToast'

export default function AdminUsersPage() {
  const { search, setSearch, filters, setFilter, reset } = useAdminFilters(
    { status: '' },
    { defaultLimit: 50 }
  )
  const q = search
  const status = filters.status ?? ''

  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email: '', phone: '', displayName: 'New User', password: '' })
  const [editing, setEditing] = useState<any>(null)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (status) params.set('status', status)
      const res = await apiGet<{ data?: any[] }>(`/api/v1/admin/users?${params}`)
      setItems(res?.data ?? [])
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [q, status])

  useEffect(() => {
    load()
  }, [load])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const hasEmail = form.email.trim().includes('@')
    const hasPhone = form.phone.trim().replace(/\D/g, '').length >= 10
    if (!hasEmail && !hasPhone) {
      setError('Email or phone is required')
      return
    }
    if (form.password.length < 4) {
      setError('Password must be at least 4 characters')
      return
    }
    try {
      await apiPost('/api/v1/admin/users', {
        email: hasEmail ? form.email.trim() : undefined,
        phone: hasPhone ? form.phone.trim() : undefined,
        displayName: form.displayName.trim() || 'New User',
        password: form.password,
      })
      adminToast.success('User created')
      setForm({ email: '', phone: '', displayName: 'New User', password: '' })
      setShowCreate(false)
      await load()
    } catch (e2) {
      const msg = (e2 as Error)?.message ?? 'Create failed'
      setError(msg)
      adminToast.error(msg)
    }
  }

  async function onStatusChange(user: any, newStatus: string) {
    setError('')
    try {
      await apiPatch(`/api/v1/admin/users/${user.id}`, { status: newStatus })
      adminToast.success(`User ${newStatus === 'ACTIVE' ? 'activated' : newStatus === 'BLOCKED' ? 'blocked' : 'updated'}`)
      setEditing(null)
      await load()
    } catch (e2) {
      const msg = (e2 as Error)?.message ?? 'Update failed'
      setError(msg)
      adminToast.error(msg)
    }
  }

  return (
    <AdminPageShell
      title="Users"
      breadcrumbs={[{ label: 'People & Access' }, { label: 'Users' }]}
      actions={
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => { setShowCreate(!showCreate); setEditing(null); }}
          >
            {showCreate ? 'Cancel' : 'Create User'}
          </button>
          <Link href="/admin/staff" className="btn btn-outline-secondary btn-sm">
            Manage Staff
          </Link>
          <button type="button" className="btn btn-outline-primary btn-sm" onClick={load} disabled={loading} aria-label="Refresh">
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      }
    >
      <AdminFiltersBar
        searchPlaceholder="Search users…"
        searchValue={q}
        onSearchChange={setSearch}
        filters={[
          {
            key: 'status',
            label: 'Status',
            render: (value, onChange) => (
              <select
                id="admin-filter-status"
                className="form-select form-select-sm"
                style={{ width: 140 }}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-label="Filter by status"
              >
                <option value="">All status</option>
                <option value="ACTIVE">Active</option>
                <option value="BLOCKED">Blocked</option>
                <option value="DELETED">Deleted</option>
              </select>
            ),
          },
        ]}
        filterValues={filters}
        onFilterChange={setFilter}
        onReset={reset}
      />

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}

      {showCreate ? (
        <Card className="mb-4">
          <Card.Body>
            <h5 className="card-title mb-3">Create User</h5>
            <form onSubmit={onCreate} className="d-grid gap-3" style={{ maxWidth: 400 }}>
              <div>
                <label className="form-label small text-muted">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Optional if phone provided"
                />
              </div>
              <div>
                <label className="form-label small text-muted">Phone</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Optional if email provided"
                />
              </div>
              <div>
                <label className="form-label small text-muted">Display Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder="Display name"
                />
              </div>
              <div>
                <label className="form-label small text-muted">Password *</label>
                <input
                  type="password"
                  className="form-control"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min 4 characters"
                  required
                  minLength={4}
                />
              </div>
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary">Create</button>
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              </div>
            </form>
          </Card.Body>
        </Card>
      ) : null}

      <Card>
        <Card.Body className="p-0">
          <h5 className="card-title p-3 mb-0 border-bottom">Users ({items.length})</h5>
          <div className="table-responsive">
            <table className="table align-middle mb-0 table-hover table-centered">
              <thead className="bg-light-subtle">
                <tr>
                  <th>ID</th>
                  <th>Display Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td className="fw-semibold">{u.displayName || '—'}</td>
                    <td>{u.email || '—'}</td>
                    <td>{u.phone || '—'}</td>
                    <td>
                      <span className={`badge ${u.status === 'ACTIVE' ? 'bg-success' : u.status === 'BLOCKED' ? 'bg-danger' : 'bg-light-subtle text-muted'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-1 align-items-center flex-wrap">
                        <Link href={`/admin/users/${u.id}`} className="btn btn-sm btn-outline-primary">
                          View
                        </Link>
                        {editing?.id === u.id ? (
                          <>
                            {u.status !== 'ACTIVE' && (
                              <button
                                type="button"
                                className="btn btn-sm btn-success"
                                onClick={() => onStatusChange(u, 'ACTIVE')}
                              >
                                Activate
                              </button>
                            )}
                            {u.status !== 'BLOCKED' && (
                              <button
                                type="button"
                                className="btn btn-sm btn-warning"
                                onClick={() => onStatusChange(u, 'BLOCKED')}
                              >
                                Block
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => setEditing(null)}
                            >
                              Done
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setEditing(u)}
                          >
                            Edit status
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!items.length && !loading && (
                  <tr>
                    <td colSpan={6} className="text-muted text-center py-4">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card.Body>
      </Card>
    </AdminPageShell>
  )
}
