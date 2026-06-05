'use client'

import { useCallback, useEffect, useState } from 'react'
import DataTable from '@/src/bpa/admin/components/DataTable'
import { PaginationBar } from '@/src/components/common/PaginationBar'
import {
  adminSmsBalance,
  adminSmsBulk,
  adminSmsDashboard,
  adminSmsLogs,
  adminSmsRetry,
  adminSmsSend,
  type SmsDashboard,
  type SmsLogRow,
} from '@/lib/smsApi'

export default function SmsCenterPage() {
  const [dashboard, setDashboard] = useState<SmsDashboard | null>(null)
  const [balance, setBalance] = useState<string | number | null>(null)
  const [balanceError, setBalanceError] = useState('')
  const [logs, setLogs] = useState<SmsLogRow[]>([])
  const [logPage, setLogPage] = useState(1)
  const [logTotal, setLogTotal] = useState(0)
  const [logTotalPages, setLogTotalPages] = useState(1)
  const [logLoading, setLogLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [singlePhone, setSinglePhone] = useState('')
  const [singleMessage, setSingleMessage] = useState('')
  const [bulkPhones, setBulkPhones] = useState('')
  const [bulkMessage, setBulkMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    try {
      setDashboard(await adminSmsDashboard())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard')
    }
  }, [])

  const loadBalance = useCallback(async () => {
    setBalanceError('')
    try {
      const r = await adminSmsBalance()
      if (r.success) setBalance(r.balance ?? '—')
      else setBalanceError(r.error || 'Balance unavailable')
    } catch (e) {
      setBalanceError(e instanceof Error ? e.message : 'Balance check failed')
    }
  }, [])

  const loadLogs = useCallback(async () => {
    setLogLoading(true)
    try {
      const res = await adminSmsLogs({ page: logPage, pageSize: 20, status: statusFilter || undefined })
      setLogs(res.items ?? [])
      setLogTotal(res.total ?? 0)
      setLogTotalPages(res.totalPages ?? 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load logs')
    } finally {
      setLogLoading(false)
    }
  }, [logPage, statusFilter])

  useEffect(() => {
    loadDashboard()
    loadBalance()
  }, [loadDashboard, loadBalance])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  async function sendSingle() {
    setBusy(true)
    setResult('')
    setError('')
    try {
      await adminSmsSend({ phone: singlePhone, message: singleMessage })
      setResult('SMS queued/sent successfully')
      setSingleMessage('')
      loadLogs()
      loadDashboard()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed')
    } finally {
      setBusy(false)
    }
  }

  async function sendBulk() {
    setBusy(true)
    setResult('')
    setError('')
    try {
      const phones = bulkPhones.split(/[\n,;]+/).map((p) => p.trim()).filter(Boolean)
      const r = await adminSmsBulk({ phones, message: bulkMessage })
      setResult(`Bulk: ${r.data.queued} queued, ${r.data.failed} failed (${r.data.recipientCount} recipients)`)
      loadLogs()
      loadDashboard()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk send failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h4 className="mb-1">SMS Center</h4>
          <p className="text-muted small mb-0">BulkSMSBD gateway — send, monitor, and retry SMS</p>
        </div>
        <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => { loadDashboard(); loadBalance(); loadLogs() }}>
          Refresh
        </button>
      </div>

      {error ? <div className="alert alert-danger small">{error}</div> : null}
      {result ? <div className="alert alert-success small">{result}</div> : null}

      <div className="row g-3 mb-4">
        <div className="col-md-2">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="text-muted small">Balance</div>
              <div className="fs-5 fw-bold">{balance != null ? String(balance) : '—'}</div>
              {balanceError ? <div className="text-danger small mt-1">{balanceError}</div> : null}
            </div>
          </div>
        </div>
        {dashboard ? (
          <>
            <div className="col-md-2">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body text-center">
                  <div className="text-muted small">Sent</div>
                  <div className="fs-4 fw-bold text-success">{dashboard.sent}</div>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body text-center">
                  <div className="text-muted small">Failed</div>
                  <div className="fs-4 fw-bold text-danger">{dashboard.failed}</div>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body text-center">
                  <div className="text-muted small">Queued</div>
                  <div className="fs-4 fw-bold">{dashboard.queued}</div>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body text-center">
                  <div className="text-muted small">Last 24h</div>
                  <div className="fs-4 fw-bold">{dashboard.last24h}</div>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body text-center">
                  <div className="text-muted small">Queue jobs</div>
                  <div className="small">
                    W: {dashboard.queue?.waiting ?? 0} / A: {dashboard.queue?.active ?? 0}
                    <br />
                    F: {dashboard.queue?.failed ?? 0}
                  </div>
                  <div className={`badge mt-1 ${dashboard.smsEnabled ? 'bg-success' : 'bg-secondary'}`}>
                    {dashboard.smsEnabled ? 'SMS on' : 'SMS off'}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>

      <div className="row g-4 mb-4">
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h6 className="mb-3">Send single SMS</h6>
              <input className="form-control form-control-sm mb-2" placeholder="Phone (01XXXXXXXXX)" value={singlePhone} onChange={(e) => setSinglePhone(e.target.value)} />
              <textarea className="form-control form-control-sm mb-2" rows={3} maxLength={500} placeholder="Message" value={singleMessage} onChange={(e) => setSingleMessage(e.target.value)} />
              <button type="button" className="btn btn-primary btn-sm" disabled={busy || !singlePhone || singleMessage.length < 1} onClick={sendSingle}>
                Send SMS
              </button>
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h6 className="mb-3">Send bulk SMS</h6>
              <textarea className="form-control form-control-sm mb-2 font-monospace" rows={3} placeholder="Phones (one per line)" value={bulkPhones} onChange={(e) => setBulkPhones(e.target.value)} />
              <textarea className="form-control form-control-sm mb-2" rows={3} maxLength={500} placeholder="Message" value={bulkMessage} onChange={(e) => setBulkMessage(e.target.value)} />
              <button type="button" className="btn btn-primary btn-sm" disabled={busy || bulkMessage.length < 3} onClick={sendBulk}>
                Send bulk
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
            <h6 className="mb-0">SMS logs</h6>
            <select className="form-select form-select-sm w-auto" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setLogPage(1) }}>
              <option value="">All statuses</option>
              <option value="SENT">Sent</option>
              <option value="FAILED">Failed</option>
              <option value="QUEUED">Queued</option>
              <option value="SENDING">Sending</option>
            </select>
          </div>
          <DataTable
            columns={[
              { key: 'phone', label: 'Phone', render: (r) => r.phone },
              { key: 'status', label: 'Status', render: (r) => r.status },
              { key: 'template', label: 'Template', render: (r) => r.template ?? '—' },
              { key: 'created', label: 'Created', render: (r) => new Date(r.createdAt).toLocaleString() },
              {
                key: 'msg',
                label: 'Message',
                render: (r) => (
                  <span className="small text-muted text-truncate d-inline-block" style={{ maxWidth: 220 }}>
                    {r.message}
                  </span>
                ),
              },
              {
                key: 'actions',
                label: '',
                render: (r) =>
                  r.status === 'FAILED' ? (
                    <button
                      type="button"
                      className="btn btn-outline-warning btn-sm"
                      onClick={async () => {
                        try {
                          await adminSmsRetry(r.id)
                          loadLogs()
                        } catch (e) {
                          setError(e instanceof Error ? e.message : 'Retry failed')
                        }
                      }}
                    >
                      Retry
                    </button>
                  ) : null,
              },
            ]}
            rows={logs}
            loading={logLoading}
            keyField="id"
          />
          <PaginationBar page={logPage} pageSize={20} total={logTotal} totalPages={logTotalPages} onPageChange={setLogPage} />
        </div>
      </div>
    </div>
  )
}
