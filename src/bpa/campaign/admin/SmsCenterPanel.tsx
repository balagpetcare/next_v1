'use client'

import { useCallback, useEffect, useState } from 'react'
import DataTable from '@/src/bpa/admin/components/DataTable'
import { PaginationBar } from '@/src/components/common/PaginationBar'
import { CAMPAIGN_SMS_TEMPLATES } from '@/src/bpa/campaign/admin/smsTemplates'
import {
  campaignAdminRecoverStuckSms,
  campaignAdminSendBulkSms,
  campaignAdminSmsCostSummary,
  campaignAdminSmsLogs,
  campaignAdminSmsTemplates,
  type CampaignSmsLogRow,
  type CampaignSmsCostSummary,
} from '@/lib/campaignApi'

type Tab = 'templates' | 'logs' | 'cost' | 'bulk'

type Props = { campaignId: number }

function fmtBdt(n: number) {
  return `৳${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 2 }).format(n)}`
}

export default function SmsCenterPanel({ campaignId }: Props) {
  const [tab, setTab] = useState<Tab>('templates')
  const [logs, setLogs] = useState<CampaignSmsLogRow[]>([])
  const [logPage, setLogPage] = useState(1)
  const [logTotal, setLogTotal] = useState(0)
  const [logTotalPages, setLogTotalPages] = useState(1)
  const [logLoading, setLogLoading] = useState(false)
  const [cost, setCost] = useState<CampaignSmsCostSummary | null>(null)
  const [customTemplates, setCustomTemplates] = useState<{ code: string; template: string }[]>([])
  const [bulkMessage, setBulkMessage] = useState('')
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkPhones, setBulkPhones] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkResult, setBulkResult] = useState<string>('')
  const [error, setError] = useState('')

  const loadLogs = useCallback(async () => {
    if (!Number.isFinite(campaignId)) return
    setLogLoading(true)
    try {
      const res = await campaignAdminSmsLogs(campaignId, { page: logPage, pageSize: 20 })
      setLogs(res.items ?? [])
      setLogTotal(res.total ?? 0)
      setLogTotalPages(res.totalPages ?? 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load SMS logs')
    } finally {
      setLogLoading(false)
    }
  }, [campaignId, logPage])

  const loadCost = useCallback(async () => {
    try {
      setCost(await campaignAdminSmsCostSummary(campaignId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load cost summary')
    }
  }, [campaignId])

  const loadTemplates = useCallback(async () => {
    try {
      const rows = await campaignAdminSmsTemplates(campaignId)
      setCustomTemplates(rows.map((r) => ({ code: r.code, template: r.template })))
    } catch {
      setCustomTemplates([])
    }
  }, [campaignId])

  useEffect(() => {
    if (tab === 'logs') loadLogs()
    if (tab === 'cost') loadCost()
    if (tab === 'templates') loadTemplates()
  }, [tab, loadLogs, loadCost, loadTemplates])

  const defaultRows = CAMPAIGN_SMS_TEMPLATES.map((t) => ({
    id: t.code,
    code: t.code,
    name: t.name,
    body: t.body,
    source: 'System default',
  }))

  async function runBulk(dryRun: boolean) {
    setBulkBusy(true)
    setBulkResult('')
    setError('')
    try {
      const phones = bulkPhones
        .split(/[\n,;]+/)
        .map((p) => p.trim())
        .filter(Boolean)
      const result = await campaignAdminSendBulkSms(campaignId, {
        message: bulkMessage,
        phones: phones.length ? phones : undefined,
        bookingStatus: bulkStatus || undefined,
        dryRun,
      })
      setBulkResult(
        dryRun
          ? `Preview: ${result.recipientCount} recipient(s)`
          : `Queued: ${result.queued}, failed: ${result.failed}${result.errors.length ? ` — ${result.errors.join('; ')}` : ''}`
      )
      if (!dryRun && tab === 'logs') loadLogs()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk SMS failed')
    } finally {
      setBulkBusy(false)
    }
  }

  return (
    <div>
      <ul className="nav nav-tabs mb-3">
        {(
          [
            ['templates', 'Templates'],
            ['logs', 'Delivery log'],
            ['cost', 'Cost'],
            ['bulk', 'Bulk SMS'],
          ] as const
        ).map(([id, label]) => (
          <li key={id} className="nav-item">
            <button
              type="button"
              className={`nav-link ${tab === id ? 'active' : ''}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>

      {error ? <div className="alert alert-danger small">{error}</div> : null}

      {tab === 'templates' ? (
        <>
          <div className="alert alert-info small mb-3">
            System defaults below. Per-campaign overrides from the database are merged at send time.
            {customTemplates.length > 0
              ? ` ${customTemplates.length} custom template(s) loaded.`
              : ' No custom overrides yet.'}
          </div>
          <DataTable
            columns={[
              { key: 'code', label: 'Code', render: (r) => <span className="font-monospace small">{r.code}</span> },
              { key: 'name', label: 'Name', render: (r) => r.name },
              { key: 'body', label: 'Body', render: (r) => <span className="small text-muted">{r.body}</span> },
              { key: 'source', label: 'Source', render: (r) => r.source },
            ]}
            rows={defaultRows}
            keyField="id"
          />
        </>
      ) : null}

      {tab === 'logs' ? (
        <>
          <div className="mb-2">
            <button
              type="button"
              className="btn btn-outline-warning btn-sm"
              onClick={async () => {
                try {
                  await campaignAdminRecoverStuckSms(campaignId)
                  loadLogs()
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Recover failed')
                }
              }}
            >
              Recover stuck (15m+)
            </button>
          </div>
          <DataTable
            columns={[
              { key: 'phone', label: 'Phone', render: (r) => r.phone },
              { key: 'template', label: 'Template', render: (r) => r.templateCode ?? '—' },
              { key: 'status', label: 'Status', render: (r) => r.status },
              { key: 'queued', label: 'Queued', render: (r) => new Date(r.queuedAt).toLocaleString() },
              {
                key: 'msg',
                label: 'Message',
                render: (r) => <span className="small text-muted text-truncate d-inline-block" style={{ maxWidth: 240 }}>{r.message}</span>,
              },
            ]}
            rows={logs}
            loading={logLoading}
            keyField="id"
          />
          <PaginationBar page={logPage} pageSize={20} total={logTotal} totalPages={logTotalPages} onPageChange={setLogPage} />
        </>
      ) : null}

      {tab === 'cost' && cost ? (
        <div className="row g-3">
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <div className="text-muted small">Sent</div>
                <div className="fs-4 fw-bold">{cost.totalSent}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <div className="text-muted small">Delivered</div>
                <div className="fs-4 fw-bold text-success">{cost.totalDelivered}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <div className="text-muted small">Failed</div>
                <div className="fs-4 fw-bold text-danger">{cost.totalFailed}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <div className="text-muted small">Est. cost</div>
                <div className="fs-4 fw-bold">{fmtBdt(cost.estimatedCostBdt)}</div>
              </div>
            </div>
          </div>
          <div className="col-12 text-muted small">
            Period: {new Date(cost.from).toLocaleDateString()} — {new Date(cost.to).toLocaleDateString()}
          </div>
        </div>
      ) : null}

      {tab === 'bulk' ? (
        <div className="card border-0 shadow-sm" style={{ maxWidth: 640 }}>
          <div className="card-body">
            <p className="small text-muted">
              Sends an <strong>ANNOUNCEMENT</strong> SMS to up to 500 recipients. Leave phones empty to target
              bookings by status filter.
            </p>
            <div className="mb-3">
              <label className="form-label">Message *</label>
              <textarea
                className="form-control"
                rows={4}
                maxLength={500}
                value={bulkMessage}
                onChange={(e) => setBulkMessage(e.target.value)}
                placeholder="Campaign announcement text…"
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Booking status filter (if no phone list)</label>
              <select className="form-select" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
                <option value="">All non-cancelled</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="COMPLETED">Completed</option>
                <option value="CHECKED_IN">Checked in</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">Phone list (optional, one per line)</label>
              <textarea
                className="form-control font-monospace small"
                rows={3}
                value={bulkPhones}
                onChange={(e) => setBulkPhones(e.target.value)}
                placeholder="017xxxxxxxx"
              />
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="btn btn-outline-primary btn-sm" disabled={bulkBusy} onClick={() => runBulk(true)}>
                Preview count
              </button>
              <button type="button" className="btn btn-primary btn-sm" disabled={bulkBusy || bulkMessage.length < 3} onClick={() => runBulk(false)}>
                Send bulk SMS
              </button>
            </div>
            {bulkResult ? <div className="alert alert-success small mt-3 mb-0">{bulkResult}</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
