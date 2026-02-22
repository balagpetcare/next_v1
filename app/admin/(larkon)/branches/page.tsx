'use client'

import PageTItle from '@larkon/components/PageTItle'
import { apiGet, apiPatch, apiPost } from '@/lib/api'
import { useEffect, useMemo, useState } from 'react'
import { Card, Col, Row } from 'react-bootstrap'

const CAPS = ['clinic', 'shop', 'online_sales', 'delivery_hub', 'hq_warehouse']

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="badge bg-light-subtle text-muted border py-1 px-2 me-1">
      {children}
    </span>
  )
}

export default function AdminBranchesPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [address, setAddress] = useState('')
  const [caps, setCaps] = useState(['clinic'])
  const [editing, setEditing] = useState<any>(null)

  const canWrite = true

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await apiGet<{ data?: any[] }>('/api/v1/admin/branches')
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

  const editingCaps = useMemo(() => {
    if (!editing) return []
    return (editing.capabilities ?? []).map((x: { capability?: string }) => x.capability)
  }, [editing])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim() || !code.trim()) {
      setError('Name and code are required')
      return
    }
    try {
      await apiPost('/api/v1/admin/branches', {
        name: name.trim(),
        code: code.trim(),
        address: address.trim() || undefined,
        capabilities: caps,
      })
      setName('')
      setCode('')
      setAddress('')
      setCaps(['clinic'])
      await load()
    } catch (e2) {
      setError((e2 as Error)?.message ?? 'Create failed')
    }
  }

  async function onSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setError('')
    try {
      await apiPatch(`/api/v1/admin/branches/${editing.id}`, {
        name: editing.name,
        address: editing.address,
        isActive: editing.isActive,
        capabilities: editingCaps.map((cap: string) => ({ capability: cap })),
      })
      setEditing(null)
      await load()
    } catch (e2) {
      setError((e2 as Error)?.message ?? 'Update failed')
    }
  }

  return (
    <>
      <PageTItle title="BRANCHES" />
      <div className="d-flex justify-content-between align-items-center mb-3">
        <p className="text-muted mb-0 small">
          Create/update branches and set capabilities (clinic/shop/online etc.).
        </p>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={load}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
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
              <h5 className="card-title mb-3">
                {editing ? `Edit Branch #${editing.id}` : 'Create Branch'}
              </h5>
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
                    <label className="form-label small text-muted">Address</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editing.address ?? ''}
                      onChange={(e) => setEditing({ ...editing, address: e.target.value })}
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
                    <label className="form-check-label" htmlFor="edit-active">
                      Active
                    </label>
                  </div>
                  <div>
                    <label className="form-label small text-muted">Capabilities</label>
                    <div className="d-flex flex-wrap gap-2">
                      {CAPS.map((c) => {
                        const checked = editingCaps.includes(c)
                        return (
                          <div key={c} className="form-check form-check-inline">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              id={`edit-cap-${c}`}
                              checked={checked}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? [...editingCaps.filter((x: string) => x !== c), c]
                                    : editingCaps.filter((x: string) => x !== c)
                                setEditing({
                                  ...editing,
                                  capabilities: next.map((cap: string) => ({ capability: cap })),
                                })
                              }}
                            />
                            <label className="form-check-label" htmlFor={`edit-cap-${c}`}>
                              {c}
                            </label>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary">
                      Save
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setEditing(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={onCreate} className="d-grid gap-3">
                  <div>
                    <label className="form-label small text-muted">Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rampura Branch"
                    />
                  </div>
                  <div>
                    <label className="form-label small text-muted">Code *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Unique in org (e.g. CS-01)"
                    />
                  </div>
                  <div>
                    <label className="form-label small text-muted">Address</label>
                    <input
                      type="text"
                      className="form-control"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="form-label small text-muted">Capabilities</label>
                    <div className="d-flex flex-wrap gap-2">
                      {CAPS.map((c) => (
                        <div key={c} className="form-check form-check-inline">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id={`cap-${c}`}
                            checked={caps.includes(c)}
                            onChange={(e) => {
                              setCaps((prev) =>
                                e.target.checked
                                  ? [...prev.filter((x) => x !== c), c]
                                  : prev.filter((x) => x !== c)
                              )
                            }}
                          />
                          <label className="form-check-label" htmlFor={`cap-${c}`}>
                            {c}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!canWrite}
                    className="btn btn-primary"
                  >
                    Create
                  </button>
                </form>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col xl={7}>
          <Card>
            <Card.Body className="p-0">
              <h5 className="card-title p-3 mb-0 border-bottom">All Branches ({items.length})</h5>
              <div className="table-responsive">
                <table className="table align-middle mb-0 table-hover table-centered">
                  <thead className="bg-light-subtle">
                    <tr>
                      <th>Name</th>
                      <th>Code</th>
                      <th>Capabilities</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((b) => (
                      <tr key={b.id}>
                        <td className="fw-semibold">{b.name}</td>
                        <td>
                          <code>{b.code}</code>
                        </td>
                        <td>
                          {(b.capabilities ?? []).length
                            ? b.capabilities.map((c: { capability?: string }) => (
                                <Pill key={c.capability}>{c.capability}</Pill>
                              ))
                            : '—'}
                        </td>
                        <td>{b.isActive ? 'Active' : 'Inactive'}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => setEditing(b)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!items.length && (
                      <tr>
                        <td colSpan={5} className="text-muted text-center py-4">
                          No branches yet.
                        </td>
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
