'use client'

import PageTItle from '@larkon/components/PageTItle'
import { apiGet, apiPatch, apiPost } from '@/lib/api'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { Card, Col, Row } from 'react-bootstrap'

export default function AdminBranchTypesPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ code: '', nameEn: '', nameBn: '', description: '', isActive: true })

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await apiGet<{ data?: any[] }>('/api/v1/admin/branch-types')
      setItems(res?.data ?? [])
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.code.trim() || !form.nameEn.trim()) {
      setError('Code and Name (English) are required')
      return
    }
    try {
      await apiPost('/api/v1/admin/branch-types', {
        code: form.code.trim(),
        nameEn: form.nameEn.trim(),
        nameBn: form.nameBn.trim() || undefined,
        description: form.description.trim() || undefined,
        isActive: form.isActive,
      })
      toast.success('Branch type saved')
      setForm({ code: '', nameEn: '', nameBn: '', description: '', isActive: true })
      await load()
    } catch (e2) {
      setError((e2 as Error)?.message ?? 'Save failed')
      toast.error((e2 as Error)?.message)
    }
  }

  async function onSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setError('')
    try {
      await apiPatch(`/api/v1/admin/branch-types/${editing.id}`, {
        nameEn: editing.nameEn,
        nameBn: editing.nameBn || undefined,
        description: editing.description || undefined,
        isActive: editing.isActive,
      })
      toast.success('Branch type updated')
      setEditing(null)
      await load()
    } catch (e2) {
      setError((e2 as Error)?.message ?? 'Update failed')
      toast.error((e2 as Error)?.message)
    }
  }

  return (
    <>
      <PageTItle title="BRANCH TYPES" />
      <div className="d-flex justify-content-end mb-3">
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
              <h5 className="card-title mb-3">{editing ? `Edit Branch Type #${editing.id}` : 'Add Branch Type'}</h5>
              {editing ? (
                <form onSubmit={onSaveEdit} className="d-grid gap-3">
                  <div>
                    <label className="form-label small text-muted">Name (English)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editing.nameEn ?? ''}
                      onChange={(e) => setEditing({ ...editing, nameEn: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label small text-muted">Name (Bangla)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editing.nameBn ?? ''}
                      onChange={(e) => setEditing({ ...editing, nameBn: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="form-label small text-muted">Description</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editing.description ?? ''}
                      onChange={(e) => setEditing({ ...editing, description: e.target.value })}
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
                    <label className="form-label small text-muted">Code *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      placeholder="e.g. WAREHOUSE"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label small text-muted">Name (English) *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.nameEn}
                      onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                      placeholder="Branch type name"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label small text-muted">Name (Bangla)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.nameBn}
                      onChange={(e) => setForm({ ...form, nameBn: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="form-label small text-muted">Description</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
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
                  <button type="submit" className="btn btn-primary">Save</button>
                </form>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col xl={7}>
          <Card>
            <Card.Body className="p-0">
              <h5 className="card-title p-3 mb-0 border-bottom">Branch Types ({items.length})</h5>
              <div className="table-responsive">
                <table className="table align-middle mb-0 table-hover table-centered">
                  <thead className="bg-light-subtle">
                    <tr>
                      <th>ID</th>
                      <th>Code</th>
                      <th>Name (EN)</th>
                      <th>Name (BN)</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((bt) => (
                      <tr key={bt.id}>
                        <td>{bt.id}</td>
                        <td className="fw-semibold">{bt.code}</td>
                        <td>{bt.nameEn}</td>
                        <td>{bt.nameBn || '—'}</td>
                        <td>
                          <span className={`badge ${bt.isActive ? 'bg-success' : 'bg-secondary'}`}>
                            {bt.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setEditing(bt)}>Edit</button>
                        </td>
                      </tr>
                    ))}
                    {!items.length && !loading && (
                      <tr>
                        <td colSpan={6} className="text-muted text-center py-4">No branch types yet.</td>
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
