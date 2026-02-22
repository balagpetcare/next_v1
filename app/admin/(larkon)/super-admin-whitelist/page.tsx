'use client'

import PageTItle from '@larkon/components/PageTItle'
import { apiDelete, apiGet, apiPost } from '@/lib/api'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { Card, Modal, ModalBody, ModalFooter, ModalHeader } from 'react-bootstrap'

export default function AdminSuperAdminWhitelistPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [form, setForm] = useState({ email: '', phone: '', note: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      const res = await apiGet<{ data?: any[] }>(`/api/v1/admin/super-admin-whitelist?${params}`)
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
    const hasEmail = form.email.trim().includes('@')
    const hasPhone = form.phone.trim().replace(/\D/g, '').length >= 10
    if (!hasEmail && !hasPhone) {
      setError('Email or phone is required')
      return
    }
    try {
      await apiPost('/api/v1/admin/super-admin-whitelist', {
        email: hasEmail ? form.email.trim() : undefined,
        phone: hasPhone ? form.phone.trim() : undefined,
        note: form.note.trim() || undefined,
        isActive: true,
      })
      toast.success('Entry added to whitelist')
      setForm({ email: '', phone: '', note: '' })
      setShowCreate(false)
      await load()
    } catch (e2) {
      const msg = (e2 as Error)?.message ?? 'Add failed'
      setError(msg)
      toast.error(msg)
    }
  }

  async function onConfirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setError('')
    try {
      await apiDelete(`/api/v1/admin/super-admin-whitelist/${deleteTarget.id}`)
      toast.success('Entry removed')
      setDeleteTarget(null)
      await load()
    } catch (e2) {
      const msg = (e2 as Error)?.message ?? 'Remove failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <PageTItle title="SUPER ADMIN WHITELIST" />
      <div className="alert alert-warning border-warning mb-3" role="alert">
        <strong>Security-sensitive.</strong> Only whitelisted email/phone can access super-admin features.
        Changes take effect on next login.
      </div>

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
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => { setShowCreate(!showCreate); setError(''); }}
          >
            {showCreate ? 'Cancel' : 'Add Entry'}
          </button>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}

      {showCreate ? (
        <Card className="mb-4">
          <Card.Body>
            <h5 className="card-title mb-3">Add Whitelist Entry</h5>
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
                <label className="form-label small text-muted">Note (optional)</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Audit note"
                />
              </div>
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary">Add</button>
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              </div>
            </form>
          </Card.Body>
        </Card>
      ) : null}

      <Card>
        <Card.Body className="p-0">
          <h5 className="card-title p-3 mb-0 border-bottom">Whitelist ({items.length})</h5>
          <div className="table-responsive">
            <table className="table align-middle mb-0 table-hover table-centered">
              <thead className="bg-light-subtle">
                <tr>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Note</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.email || '—'}</td>
                    <td>{row.phone || '—'}</td>
                    <td className="text-muted small">{row.note || '—'}</td>
                    <td>
                      <span className={`badge ${row.isActive ? 'bg-success' : 'bg-secondary'}`}>
                        {row.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => setDeleteTarget(row)}
                        disabled={!row.isActive}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {!items.length && !loading && (
                  <tr>
                    <td colSpan={6} className="text-muted text-center py-4">No whitelist entries.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card.Body>
      </Card>

      <Modal show={!!deleteTarget} onHide={() => setDeleteTarget(null)} centered>
        <ModalHeader closeButton>
          <h5 className="modal-title">Remove from Whitelist</h5>
        </ModalHeader>
        <ModalBody>
          Are you sure you want to remove{' '}
          <strong>{deleteTarget?.email || deleteTarget?.phone || deleteTarget?.id}</strong>?
          This will revoke super-admin access for that identity.
        </ModalBody>
        <ModalFooter>
          <button type="button" className="btn btn-outline-secondary" onClick={() => setDeleteTarget(null)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirmDelete}
            disabled={deleting}
          >
            {deleting ? 'Removing…' : 'Remove'}
          </button>
        </ModalFooter>
      </Modal>
    </>
  )
}
