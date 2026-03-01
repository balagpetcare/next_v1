'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import StatusChip from '@/src/bpa/admin/components/StatusChip'
import {
  adminTicketGet,
  adminTicketUpdate,
  adminTicketReply,
  adminTicketAddNote,
  adminTicketEscalate,
} from '@/src/bpa/admin/lib/adminSupportApi'

function formatDateTime(d: string | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminSupportTicketDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const [ticket, setTicket] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [replyText, setReplyText] = useState('')
  const [noteText, setNoteText] = useState('')
  const [showInternal, setShowInternal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [assignedToUserId, setAssignedToUserId] = useState<string | number | null>(null)
  const [escalateModal, setEscalateModal] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const data = await adminTicketGet(id)
      setTicket(data)
      setStatus(data?.status ?? '')
      setPriority(data?.priority ?? '')
      setAssignedToUserId(data?.assignedToUserId ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load ticket')
      setTicket(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || !id) return
    setSubmitting(true)
    try {
      await adminTicketReply(id, { message: replyText.trim() })
      setReplyText('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reply failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteText.trim() || !id) return
    setSubmitting(true)
    try {
      await adminTicketAddNote(id, { message: noteText.trim() })
      setNoteText('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Note failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async () => {
    if (!id) return
    setSubmitting(true)
    try {
      await adminTicketUpdate(id, {
        status: status || undefined,
        priority: priority || undefined,
        assignedToUserId: assignedToUserId === '' ? null : (assignedToUserId as number | null),
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEscalate = async () => {
    if (!id) return
    setSubmitting(true)
    try {
      await adminTicketEscalate(id)
      setEscalateModal(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Escalate failed')
    } finally {
      setSubmitting(false)
    }
  }

  const messages = ticket?.messages ?? []
  const publicMessages = messages.filter((m: any) => !m.isInternal)
  const internalMessages = messages.filter((m: any) => m.isInternal)
  const canReply = ticket && ticket.status !== 'CLOSED' && ticket.status !== 'ESCALATED'

  if (loading && !ticket) {
    return (
      <AdminPageShell title="Ticket" breadcrumbs={[{ label: 'Support', href: '/admin/support' }, { label: 'Tickets', href: '/admin/support/tickets' }, { label: '…' }]}>
        <div className="placeholder-glow"><span className="placeholder col-6" /></div>
      </AdminPageShell>
    )
  }

  if (error && !ticket) {
    return (
      <AdminPageShell title="Ticket" breadcrumbs={[{ label: 'Support', href: '/admin/support' }, { label: 'Tickets', href: '/admin/support/tickets' }, { label: 'Error' }]}>
        <div className="alert alert-danger">{error}</div>
        <Link href="/admin/support/tickets">Back to tickets</Link>
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell
      title={ticket?.ticketNo ?? 'Ticket'}
      breadcrumbs={[
        { label: 'Support', href: '/admin/support' },
        { label: 'Tickets', href: '/admin/support/tickets' },
        { label: ticket?.ticketNo ?? id },
      ]}
      actions={
        <Link href="/admin/support/tickets" className="btn btn-outline-secondary btn-sm">
          Back to tickets
        </Link>
      }
    >
      {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

      <div className="card mb-3">
        <div className="card-body">
          <h5 className="card-title">Producer</h5>
          <p className="mb-1">
            <Link href={`/admin/producer-governance/${ticket?.producerOrg?.id}`}>
              {ticket?.producerOrg?.name ?? `Org #${ticket?.producerOrgId}`}
            </Link>
            {ticket?.producerOrg?.owner && (
              <span className="text-muted small ms-2">
                Owner: {ticket.producerOrg.owner.profile?.displayName ?? '—'} · {ticket.producerOrg.owner.auth?.email ?? ticket.producerOrg.owner.auth?.phone ?? ''}
              </span>
            )}
          </p>
          {ticket?.relatedEntityType && (
            <p className="mb-0 small text-muted">
              Related: {ticket.relatedEntityType} {ticket.relatedEntityId && `#${ticket.relatedEntityId}`}
              {ticket.relatedEntityType === 'PRODUCT' && ticket.relatedEntityId && (
                <Link href={`/admin/producer-governance/products?productId=${ticket.relatedEntityId}`} className="ms-2">View</Link>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
            <StatusChip status={ticket?.status} />
            <span className="badge bg-secondary">{ticket?.priority}</span>
            <span className="text-muted small">{ticket?.category?.replace(/_/g, ' ')}</span>
            <span className="small text-muted ms-auto">
              Created {formatDateTime(ticket?.createdAt)} · Updated {formatDateTime(ticket?.updatedAt)}
            </span>
          </div>
          <h5>{ticket?.subject}</h5>
          <p className="text-muted mb-0 whitespace-pre-wrap">{ticket?.description}</p>
        </div>
      </div>

      {canReply && (
        <div className="card mb-3">
          <div className="card-body">
            <h6>Update ticket</h6>
            <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
              <select className="form-select form-select-sm" style={{ width: 'auto' }} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="WAITING_ON_PRODUCER">Waiting on producer</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
              <select className="form-select form-select-sm" style={{ width: 'auto' }} value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
              <input
                type="number"
                className="form-control form-control-sm"
                style={{ width: 80 }}
                placeholder="Assigned user ID"
                value={assignedToUserId ?? ''}
                onChange={(e) => setAssignedToUserId(e.target.value === '' ? null : Number(e.target.value))}
              />
              <button type="button" className="btn btn-outline-primary btn-sm" disabled={submitting} onClick={handleUpdate}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card mb-3">
        <div className="card-body">
          <h6>Conversation</h6>
          {publicMessages.length === 0 && internalMessages.length === 0 ? (
            <p className="text-muted mb-0">No messages yet.</p>
          ) : (
            <div className="d-flex flex-column gap-2">
              {publicMessages.map((m: any) => (
                <div
                  key={m.id}
                  className={`p-2 rounded ${m.senderType === 'ADMIN' ? 'bg-primary bg-opacity-10 align-self-end' : 'bg-light align-self-start'}`}
                  style={{ maxWidth: '85%' }}
                >
                  <div className="small text-muted">
                    {m.senderType === 'PRODUCER' ? 'Producer' : 'Support'} · {formatDateTime(m.createdAt)}
                  </div>
                  <div className="whitespace-pre-wrap">{m.message}</div>
                </div>
              ))}
              {internalMessages.length > 0 && (
                <>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm align-self-start"
                    onClick={() => setShowInternal(!showInternal)}
                  >
                    {showInternal ? 'Hide' : 'Show'} internal notes ({internalMessages.length})
                  </button>
                  {showInternal && internalMessages.map((m: any) => (
                    <div key={m.id} className="p-2 rounded bg-warning bg-opacity-10 border align-self-start" style={{ maxWidth: '85%' }}>
                      <div className="small text-muted">Internal · {formatDateTime(m.createdAt)}</div>
                      <div className="whitespace-pre-wrap">{m.message}</div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {canReply && (
        <>
          <div className="card mb-3">
            <div className="card-body">
              <h6>Reply to producer</h6>
              <form onSubmit={handleReply}>
                <textarea
                  className="form-control mb-2"
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply..."
                  disabled={submitting}
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !replyText.trim()}>
                  Send reply
                </button>
              </form>
            </div>
          </div>
          <div className="card mb-3">
            <div className="card-body">
              <h6>Internal note</h6>
              <form onSubmit={handleNote}>
                <textarea
                  className="form-control mb-2"
                  rows={2}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Internal note (not visible to producer)"
                  disabled={submitting}
                />
                <button type="submit" className="btn btn-outline-secondary btn-sm" disabled={submitting || !noteText.trim()}>
                  Add note
                </button>
              </form>
            </div>
          </div>
        </>
      )}

      {ticket && !ticket.escalatedCaseId && ticket.status !== 'ESCALATED' && (
        <div className="mb-3">
          <button
            type="button"
            className="btn btn-warning"
            onClick={() => setEscalateModal(true)}
            disabled={submitting}
          >
            Escalate to enforcement case
          </button>
        </div>
      )}

      {ticket?.escalatedCase && (
        <div className="alert alert-info py-2">
          Escalated to case: <Link href={`/admin/enforcement/cases/${ticket.escalatedCase.id}`}>{ticket.escalatedCase.caseNo}</Link>
        </div>
      )}

      {escalateModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} role="dialog">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Escalate to enforcement</h5>
                <button type="button" className="btn-close" onClick={() => setEscalateModal(false)} aria-label="Close" />
              </div>
              <div className="modal-body">
                This will create a Trust &amp; Safety case and link it to this ticket. Continue?
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEscalateModal(false)}>Cancel</button>
                <button type="button" className="btn btn-warning" onClick={handleEscalate} disabled={submitting}>
                  {submitting ? 'Escalating…' : 'Escalate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  )
}
