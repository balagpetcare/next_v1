'use client'

import PageTItle from '@larkon/components/PageTItle'
import { apiGet, apiPatch, apiPost } from '@/lib/api'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { Card, Col, Row } from 'react-bootstrap'

export default function AdminCountriesPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ code: '', name: '', currencyCode: '', timezoneDefault: '', isActive: true })

  async function load() {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      const res = await apiGet<{ data?: any[] }>(`/api/v1/admin/countries?${params}`)
      setItems(res?.data ?? [])
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [q])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const code = form.code.trim().toUpperCase().slice(0, 2)
    if (!code || !form.name.trim()) {
      setError('Code (2 chars) and Name are required')
      return
    }
    try {
      await apiPost('/api/v1/admin/countries', {
        code,
        name: form.name.trim(),
        currencyCode: form.currencyCode.trim() || undefined,
        timezoneDefault: form.timezoneDefault.trim() || undefined,
        isActive: form.isActive,
      })
      toast.success('Country created')
      setForm({ code: '', name: '', currencyCode: '', timezoneDefault: '', isActive: true })
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
      await apiPatch(`/api/v1/admin/countries/${editing.id}`, {
        name: editing.name,
        currencyCode: editing.currencyCode || undefined,
        timezoneDefault: editing.timezoneDefault || undefined,
        isActive: editing.isActive,
      })
      toast.success('Country updated')
      setEditing(null)
      await load()
    } catch (e2) {
      setError((e2 as Error)?.message ?? 'Update failed')
      toast.error((e2 as Error)?.message)
    }
  }

  return (
    <>
      <PageTItle title="COUNTRIES" />
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <input
          type="text"
          className="form-control form-control-sm"
          style={{ width: 180 }}
          placeholder="Search..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
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
              <h5 className="card-title mb-3">{editing ? `Edit Country #${editing.id}` : 'Create Country'}</h5>
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
                    <label className="form-label small text-muted">Currency Code</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editing.currencyCode ?? ''}
                      onChange={(e) => setEditing({ ...editing, currencyCode: e.target.value })}
                      placeholder="e.g. BDT"
                    />
                  </div>
                  <div>
                    <label className="form-label small text-muted">Timezone</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editing.timezoneDefault ?? ''}
                      onChange={(e) => setEditing({ ...editing, timezoneDefault: e.target.value })}
                      placeholder="e.g. Asia/Dhaka"
                    />
                  </div>
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="edit-active"
                      checked={!!editing.isActive}
                      onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                    />
                    <label className="form-check-label" htmlFor="edit-active">Active</label>
                  </div>
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary">Save</button>
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <form onSubmit={onCreate} className="d-grid gap-3">
                  <div>
                    <label className="form-label small text-muted">Code (2 chars) *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().slice(0, 2) })}
                      placeholder="e.g. BD"
                      maxLength={2}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label small text-muted">Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Country name"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label small text-muted">Currency Code</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.currencyCode}
                      onChange={(e) => setForm({ ...form, currencyCode: e.target.value })}
                      placeholder="e.g. BDT"
                    />
                  </div>
                  <div>
                    <label className="form-label small text-muted">Timezone</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.timezoneDefault}
                      onChange={(e) => setForm({ ...form, timezoneDefault: e.target.value })}
                      placeholder="e.g. Asia/Dhaka"
                    />
                  </div>
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="create-active"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    />
                    <label className="form-check-label" htmlFor="create-active">Active</label>
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
              <h5 className="card-title p-3 mb-0 border-bottom">Countries ({items.length})</h5>
              <div className="table-responsive">
                <table className="table align-middle mb-0 table-hover table-centered">
                  <thead className="bg-light-subtle">
                    <tr>
                      <th>ID</th>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Currency</th>
                      <th>Timezone</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((c) => (
                      <tr key={c.id}>
                        <td>{c.id}</td>
                        <td className="fw-semibold">{c.code}</td>
                        <td>{c.name}</td>
                        <td>{c.currencyCode || '—'}</td>
                        <td className="small text-muted">{c.timezoneDefault || '—'}</td>
                        <td>
                          <span className={`badge ${c.isActive ? 'bg-success' : 'bg-secondary'}`}>
                            {c.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setEditing(c)}>Edit</button>
                        </td>
                      </tr>
                    ))}
                    {!items.length && !loading && (
                      <tr>
                        <td colSpan={7} className="text-muted text-center py-4">No countries yet.</td>
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
