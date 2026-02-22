'use client'

import PageTItle from '@larkon/components/PageTItle'
import { apiGet, apiPost } from '@/lib/api'
import { useEffect, useMemo, useState } from 'react'
import { Card, Col, Row } from 'react-bootstrap'

function SmallPill({ text }: { text: string }) {
  return (
    <span className="badge bg-light-subtle text-muted border py-1 px-2 me-1">
      {text}
    </span>
  )
}

export default function AdminStaffPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [staff, setStaff] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])

  const [createForm, setCreateForm] = useState({
    userId: '',
    fullName: '',
    phone: '',
    title: '',
  })

  const canWrite = true

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [s, r, b] = await Promise.all([
        apiGet<{ data?: any[] }>('/api/v1/admin/staff'),
        apiGet<{ data?: any[] }>('/api/v1/admin/roles'),
        apiGet<{ data?: any[] }>('/api/v1/admin/branches'),
      ])
      setStaff(s?.data ?? [])
      setRoles(r?.data ?? [])
      setBranches(b?.data ?? [])
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const roleOptions = useMemo(
    () => roles.map((r) => ({ id: r.id, label: `${r.key} — ${r.name}` })),
    [roles]
  )
  const branchOptions = useMemo(
    () => branches.map((b) => ({ id: b.id, label: `${b.code} — ${b.name}` })),
    [branches]
  )

  async function onCreateStaff(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const userId = Number(createForm.userId)
    if (!userId) {
      setError('userId is required')
      return
    }
    setLoading(true)
    try {
      await apiPost('/api/v1/admin/staff', {
        userId,
        fullName: createForm.fullName || undefined,
        phone: createForm.phone || undefined,
        title: createForm.title || undefined,
      })
      setCreateForm({ userId: '', fullName: '', phone: '', title: '' })
      await load()
    } catch (e2) {
      setError((e2 as Error)?.message ?? 'Failed')
    } finally {
      setLoading(false)
    }
  }

  async function assignRole(staffId: number, roleId: string) {
    if (!roleId) return
    setLoading(true)
    setError('')
    try {
      await apiPost(`/api/v1/admin/staff/${staffId}/roles`, { roleId: Number(roleId) })
      await load()
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed')
    } finally {
      setLoading(false)
    }
  }

  async function assignBranch(staffId: number, branchId: string, position: string) {
    if (!branchId) return
    setLoading(true)
    setError('')
    try {
      await apiPost(`/api/v1/admin/staff/${staffId}/branches`, {
        branchId: Number(branchId),
        position: position || undefined,
      })
      await load()
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageTItle title="STAFF" />
      <div className="d-flex justify-content-between align-items-center mb-3">
        <p className="text-muted mb-0 small">
          Create staff profiles for existing users, then assign roles and branch access.
        </p>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={load}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="alert alert-danger" role="alert">
          <strong>Error:</strong> {error}
        </div>
      ) : null}

      {canWrite ? (
        <Card className="mb-4">
          <Card.Body>
            <h5 className="card-title mb-3">Create Staff</h5>
            <form onSubmit={onCreateStaff}>
              <Row className="mb-2">
                <Col sm={2}>
                  <label className="form-label small text-muted">User ID</label>
                </Col>
                <Col sm={10}>
                  <input
                    type="text"
                    className="form-control"
                    value={createForm.userId}
                    onChange={(e) =>
                      setCreateForm((s) => ({ ...s, userId: e.target.value }))
                    }
                    placeholder="e.g. 1"
                  />
                </Col>
              </Row>
              <Row className="mb-2">
                <Col sm={2}>
                  <label className="form-label small text-muted">Full name</label>
                </Col>
                <Col sm={10}>
                  <input
                    type="text"
                    className="form-control"
                    value={createForm.fullName}
                    onChange={(e) =>
                      setCreateForm((s) => ({ ...s, fullName: e.target.value }))
                    }
                    placeholder="Optional"
                  />
                </Col>
              </Row>
              <Row className="mb-2">
                <Col sm={2}>
                  <label className="form-label small text-muted">Phone</label>
                </Col>
                <Col sm={10}>
                  <input
                    type="text"
                    className="form-control"
                    value={createForm.phone}
                    onChange={(e) =>
                      setCreateForm((s) => ({ ...s, phone: e.target.value }))
                    }
                    placeholder="Optional"
                  />
                </Col>
              </Row>
              <Row className="mb-3">
                <Col sm={2}>
                  <label className="form-label small text-muted">Title</label>
                </Col>
                <Col sm={10}>
                  <input
                    type="text"
                    className="form-control"
                    value={createForm.title}
                    onChange={(e) =>
                      setCreateForm((s) => ({ ...s, title: e.target.value }))
                    }
                    placeholder="e.g. Branch Manager"
                  />
                </Col>
              </Row>
              <div className="d-flex justify-content-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                >
                  Create
                </button>
              </div>
            </form>
          </Card.Body>
        </Card>
      ) : null}

      <div className="row g-3">
        {staff.map((s) => {
          const staffRoles = (s.roles ?? [])
            .map((x: { role?: { key?: string } }) => x.role?.key)
            .filter(Boolean)
          const staffBranches = (s.branches ?? [])
            .map((x: { branch?: { code?: string } }) => x.branch?.code)
            .filter(Boolean)

          return (
            <Col key={s.id} md={6} lg={4}>
              <Card>
                <Card.Body>
                  <h6 className="card-title">Staff #{s.id}</h6>
                  <p className="text-muted small mb-2">
                    userId: <strong>{s.userId}</strong>
                    {s.fullName ? ` — ${s.fullName}` : null}
                  </p>
                  <div className="mb-2">
                    <span className="small text-muted">Roles: </span>
                    {staffRoles.length
                      ? staffRoles.map((r) => <SmallPill key={r} text={r} />)
                      : '—'}
                  </div>
                  <div className="mb-3">
                    <span className="small text-muted">Branches: </span>
                    {staffBranches.length
                      ? staffBranches.map((b) => <SmallPill key={b} text={b} />)
                      : '—'}
                  </div>
                  {canWrite ? (
                    <Row className="g-2">
                      <Col xs={12}>
                        <select
                          className="form-select form-select-sm"
                          defaultValue=""
                          onChange={(e) => {
                            const v = e.target.value
                            if (!v) return
                            e.target.value = ''
                            assignRole(s.id, v)
                          }}
                        >
                          <option value="">Assign role…</option>
                          {roleOptions.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                        <small className="text-muted d-block mt-1">
                          After assigning, refresh will show updated permissions next login.
                        </small>
                      </Col>
                      <Col xs={12}>
                        <select
                          className="form-select form-select-sm mb-1"
                          id={`branch-${s.id}`}
                          defaultValue=""
                        >
                          <option value="">Select branch…</option>
                          {branchOptions.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          className="form-control form-control-sm mb-1"
                          id={`pos-${s.id}`}
                          placeholder="Position (optional)"
                        />
                        <button
                          type="button"
                          disabled={loading}
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => {
                            const branchId = (
                              document.getElementById(
                                `branch-${s.id}`
                              ) as HTMLSelectElement
                            )?.value
                            const position = (
                              document.getElementById(
                                `pos-${s.id}`
                              ) as HTMLInputElement
                            )?.value
                            assignBranch(s.id, branchId, position)
                          }}
                        >
                          Assign
                        </button>
                      </Col>
                    </Row>
                  ) : null}
                </Card.Body>
              </Card>
            </Col>
          )
        })}
        {!staff.length && (
          <Col xs={12}>
            <Card>
              <Card.Body>
                <p className="text-muted mb-0">No staff yet.</p>
              </Card.Body>
            </Card>
          </Col>
        )}
      </div>
    </>
  )
}
