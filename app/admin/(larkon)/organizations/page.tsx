'use client'

import PageTItle from '@larkon/components/PageTItle'
import { apiGet, apiPatch, apiPost } from '@/lib/api'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { Card, Col, Row } from 'react-bootstrap'

export default function AdminOrganizationsPage() {
  const [items, setItems] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ ownerUserId: '', name: '', supportPhone: '', status: 'DRAFT' })

  async function load() {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (status) params.set('status', status)
      const res = await apiGet<{ data?: any[] }>(`/api/v1/admin/organizations?${params}`)
      setItems(res?.data ?? [])
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  async function loadUsers() {
    try {
      const res = await apiGet<{ data?: any[] }>('/api/v1/admin/users')
      setUsers(res?.data ?? [])
    } catch {
      setUsers([])
    }
  }

  useEffect(() => {
    load()
  }, [q, status])

  useEffect(() => {
    loadUsers()
  }, [])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const ownerUserId = Number(form.ownerUserId)
    if (!ownerUserId || !form.name.trim()) {
      setError('Owner User ID and Name are required')
      return
    }
    try {
      await apiPost('/api/v1/admin/organizations', {
        ownerUserId,
        name: form.name.trim(),
        supportPhone: form.supportPhone.trim() || undefined,
        status: form.status || undefined,
      })
      toast.success('Organization created')
      setForm({ ownerUserId: '', name: '', supportPhone: '', status: 'DRAFT' })
      await load()
    } catch (e2) {
      setError((e2 as Error)?.message ?? 'Create failed')
      toast.error((e2 as Error)?.message)
    }
  }

  async function onSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setError('')
    try {
      await apiPatch(`/api/v1/admin/organizations/${editing.id}`, {
        name: editing.name,
        supportPhone: editing.supportPhone || undefined,
        status: editing.status,
      })
      toast.success('Organization updated')
      setEditing(null)
      await load()
    } catch (e2) {
      setError((e2 as Error)?.message ?? 'Update failed')
      toast.error((e2 as Error)?.message)
    }
  }

  return (
    <>
      <PageTItle title="ORGANIZATIONS" />
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div className="d-flex gap-2 align-items-center flex-wrap">
          <input
            type="text"
            className="form-control form-control-sm"
            style={{ width: 180 }}
            placeholder="Search..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="form-select form-select-sm"
            style={{ width: 120 }}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All status</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING">Pending</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}

      <Row>
        <Col xl={5}>
          <Card className="mb-4">
            <Card.Body>
              <h5 className="card-title mb-3">{editing ? `Edit Organization #${editing.id}` : 'Create Organization'}</h5>
              {editing ? (
                <form onSubmit={onSaveEdit} className="d-grid gap-3">
                  <div>
                    <label className="form-label small text-muted">Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editing.name ?? ''}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label small text-muted">Support Phone</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editing.supportPhone ?? ''}
                      onChange={(e) => setEditing({ ...editing, supportPhone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label small text-muted">Status</label>
                    <select
                      className="form-select"
                      value={editing.status ?? 'DRAFT'}
                      onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="PENDING">Pending</option>
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  </div>
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary">Save</button>
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <form onSubmit={onCreate} className="d-grid gap-3">
                  <div>
                    <label className="form-label small text-muted">Owner User ID *</label>
                    <select
                      className="form-select"
                      value={form.ownerUserId}
                      onChange={(e) => setForm({ ...form, ownerUserId: e.target.value })}
                      required
                    >
                      <option value="">Select user...</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.id} — {u.displayName || u.email || u.phone || '—'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label small text-muted">Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Organization name"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label small text-muted">Support Phone</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.supportPhone}
                      onChange={(e) => setForm({ ...form, supportPhone: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="form-label small text-muted">Status</label>
                    <select
                      className="form-select"
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="PENDING">Pending</option>
                      <option value="ACTIVE">Active</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary">Create</button>
                </form>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col xl={7}>
          <Card>
            <Card.Body className="p-0">
              <h5 className="card-title p-3 mb-0 border-bottom">Organizations ({items.length})</h5>
              <div className="table-responsive">
                <table className="table align-middle mb-0 table-hover table-centered">
                  <thead className="bg-light-subtle">
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Owner</th>
                      <th>Status</th>
                      <th>Branches</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((o) => (
                      <tr key={o.id}>
                        <td>{o.id}</td>
                        <td className="fw-semibold">{o.name}</td>
                        <td>{o.ownerUserId}</td>
                        <td><span className="badge bg-light-subtle text-muted">{o.status}</span></td>
                        <td>{o._count?.branches ?? '—'}</td>
                        <td>
                          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setEditing(o)}>Edit</button>
                        </td>
                      </tr>
                    ))}
                    {!items.length && !loading && (
                      <tr>
                        <td colSpan={6} className="text-muted text-center py-4">No organizations yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  )
}
