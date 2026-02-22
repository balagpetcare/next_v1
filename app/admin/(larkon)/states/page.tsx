'use client'

import PageTItle from '@larkon/components/PageTItle'
import { apiGet, apiPatch, apiPost } from '@/lib/api'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { Card, Col, Row } from 'react-bootstrap'

export default function AdminStatesPage() {
  const [items, setItems] = useState<any[]>([])
  const [countries, setCountries] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [countryId, setCountryId] = useState('')
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ countryId: '', code: '', name: '', isActive: true })

  async function load() {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (countryId) params.set('countryId', countryId)
      const res = await apiGet<{ data?: any[] }>(`/api/v1/admin/states?${params}`)
      setItems(res?.data ?? [])
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  async function loadCountries() {
    try {
      const res = await apiGet<{ data?: any[] }>('/api/v1/admin/countries')
      setCountries(res?.data ?? [])
    } catch {
      setCountries([])
    }
  }

  useEffect(() => {
    load()
  }, [q, countryId])

  useEffect(() => {
    loadCountries()
  }, [])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const cid = Number(form.countryId)
    if (!cid || !form.code.trim() || !form.name.trim()) {
      setError('Country, Code, and Name are required')
      return
    }
    try {
      await apiPost('/api/v1/admin/states', {
        countryId: cid,
        code: form.code.trim(),
        name: form.name.trim(),
        isActive: form.isActive,
      })
      toast.success('State created')
      setForm({ countryId: '', code: '', name: '', isActive: true })
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
      await apiPatch(`/api/v1/admin/states/${editing.id}`, {
        name: editing.name,
        isActive: editing.isActive,
      })
      toast.success('State updated')
      setEditing(null)
      await load()
    } catch (e2) {
      setError((e2 as Error)?.message ?? 'Update failed')
      toast.error((e2 as Error)?.message)
    }
  }

  return (
    <>
      <PageTItle title="STATES" />
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
            style={{ width: 160 }}
            value={countryId}
            onChange={(e) => setCountryId(e.target.value)}
          >
            <option value="">All countries</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
            ))}
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
              <h5 className="card-title mb-3">{editing ? `Edit State #${editing.id}` : 'Create State'}</h5>
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
                    <label className="form-label small text-muted">Country *</label>
                    <select
                      className="form-select"
                      value={form.countryId}
                      onChange={(e) => setForm({ ...form, countryId: e.target.value })}
                      required
                    >
                      <option value="">Select country...</option>
                      {countries.map((c) => (
                        <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label small text-muted">Code *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      placeholder="e.g. DHA"
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
                      placeholder="State/division name"
                      required
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
              <h5 className="card-title p-3 mb-0 border-bottom">States ({items.length})</h5>
              <div className="table-responsive">
                <table className="table align-middle mb-0 table-hover table-centered">
                  <thead className="bg-light-subtle">
                    <tr>
                      <th>ID</th>
                      <th>Country</th>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((s) => (
                      <tr key={s.id}>
                        <td>{s.id}</td>
                        <td>{s.country?.code ?? '—'}</td>
                        <td className="fw-semibold">{s.code}</td>
                        <td>{s.name}</td>
                        <td>
                          <span className={`badge ${s.isActive ? 'bg-success' : 'bg-secondary'}`}>
                            {s.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setEditing(s)}>Edit</button>
                        </td>
                      </tr>
                    ))}
                    {!items.length && !loading && (
                      <tr>
                        <td colSpan={6} className="text-muted text-center py-4">No states yet.</td>
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
