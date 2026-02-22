'use client'

import { useCallback, useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import PageHeader from '@/src/bpa/components/PageHeader'
import SectionCard from '@/src/bpa/admin/components/SectionCard'
import { apiGet } from '@/lib/api'

export default function LiveMonitorPage() {
  const [feed, setFeed] = useState<any[]>([])
  const [sla, setSla] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [eventType, setEventType] = useState('')
  const [live, setLive] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const query = eventType ? `&eventType=${encodeURIComponent(eventType)}` : ''
      const [feedRes, slaRes] = await Promise.all([
        apiGet(`/api/v1/admin/dashboard/live-feed?limit=50${query}`),
        apiGet('/api/v1/admin/dashboard/sla'),
      ])
      setFeed(Array.isArray(feedRes?.data) ? feedRes.data : [])
      setSla(slaRes?.data ?? null)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load live monitor data')
    } finally {
      setLoading(false)
    }
  }, [eventType])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!live) return
    const timer = setInterval(load, 15000)
    return () => clearInterval(timer)
  }, [live, load])

  return (
    <div className="container-fluid">
      <PageHeader
        title="Live Operations Monitor"
        subtitle="Real-time operational events and SLA snapshot"
        right={
          <div className="d-flex align-items-center gap-2">
            <select
              className="form-select form-select-sm"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            >
              <option value="">All events</option>
              <option value="order">Orders</option>
              <option value="verification">Verifications</option>
              <option value="withdraw">Withdrawals</option>
              <option value="user">Users</option>
            </select>
            <button type="button" className={`btn btn-sm ${live ? 'btn-success' : 'btn-outline-secondary'}`} onClick={() => setLive((v) => !v)}>
              {live ? 'Live On' : 'Live Off'}
            </button>
            <button type="button" className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1" onClick={load} disabled={loading}>
              <Icon icon="solar:refresh-outline" />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        }
      />

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <div className="row g-3 mb-3">
        <div className="col-6 col-md-3">
          <div className="card radius-12">
            <div className="card-body py-3">
              <div className="text-secondary small">Verification Avg</div>
              <div className="fw-semibold">{sla?.avgVerificationHours != null ? `${sla.avgVerificationHours}h` : '—'}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card radius-12">
            <div className="card-body py-3">
              <div className="text-secondary small">Verification Pending</div>
              <div className="fw-semibold">{sla?.verificationPendingCount ?? 0}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card radius-12">
            <div className="card-body py-3">
              <div className="text-secondary small">Ticket Avg Response</div>
              <div className="fw-semibold">{sla?.ticketAvgResponseHours != null ? `${sla.ticketAvgResponseHours}h` : '—'}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card radius-12">
            <div className="card-body py-3">
              <div className="text-secondary small">Delivery On-time</div>
              <div className="fw-semibold">{sla?.deliveryOnTimePercent != null ? `${sla.deliveryOnTimePercent}%` : '—'}</div>
            </div>
          </div>
        </div>
      </div>

      <SectionCard title="Live Feed" right={<span className="text-secondary small">{feed.length} events</span>}>
        {!feed.length && !loading ? (
          <div className="text-secondary text-center py-4">No events found.</div>
        ) : (
          <div className="d-flex flex-column gap-2" style={{ maxHeight: '68vh', overflowY: 'auto' }}>
            {feed.map((item: any) => (
              <div key={item.id} className="border rounded radius-8 p-3">
                <div className="d-flex justify-content-between align-items-start gap-2">
                  <div>
                    <div className="fw-semibold">{item.title ?? 'Untitled event'}</div>
                    <div className="text-secondary small">{item.description ?? '—'}</div>
                  </div>
                  <span className="badge bg-secondary-50 text-secondary-600">{item.eventType ?? 'event'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
