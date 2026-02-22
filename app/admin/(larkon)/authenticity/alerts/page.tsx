'use client'

import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import PageHeader from '@/src/bpa/components/PageHeader'
import SectionCard from '@/src/bpa/admin/components/SectionCard'
import StatusChip from '@/src/bpa/admin/components/StatusChip'
import { apiGet } from '@/lib/api'

export default function FraudAlertsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await apiGet('/api/v1/authenticity/alerts')
      setRows(Array.isArray(res?.data) ? res.data : res?.data?.items ?? [])
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load fraud alerts')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  return (
    <div className="container-fluid">
      <PageHeader title="Fraud Alerts" subtitle={`Alerts: ${rows.length}`} right={<button className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1" onClick={load} disabled={loading}><Icon icon="solar:refresh-outline" />Refresh</button>} />
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <SectionCard title="Alert Stream">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead><tr><th>Time</th><th>Serial</th><th>Reason</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((r: any, idx: number) => (
                <tr key={r.id ?? idx}>
                  <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</td>
                  <td>{r.serial ?? r.serialCode ?? '—'}</td>
                  <td>{r.reason ?? r.description ?? '—'}</td>
                  <td><StatusChip status={r.status ?? 'OPEN'} /></td>
                </tr>
              ))}
              {!rows.length && !loading ? <tr><td colSpan={4} className="text-center text-secondary py-4">No alerts found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
