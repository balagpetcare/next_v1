'use client'

import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import PageHeader from '@/src/bpa/components/PageHeader'
import SectionCard from '@/src/bpa/admin/components/SectionCard'
import { apiGet } from '@/lib/api'

export default function PricingPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await apiGet('/api/v1/pricing/rules')
      setRows(Array.isArray(res?.data) ? res.data : res?.data?.items ?? [])
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load pricing rules')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="container-fluid">
      <PageHeader
        title="Pricing Rules"
        subtitle={`Total rules: ${rows.length}`}
        right={<button className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1" onClick={load} disabled={loading}><Icon icon="solar:refresh-outline" />Refresh</button>}
      />
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <SectionCard title="Rules">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead><tr><th>Name</th><th>Type</th><th>Value</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((row: any) => (
                <tr key={row.id}><td>{row.name ?? row.ruleName ?? `Rule #${row.id}`}</td><td>{row.type ?? row.ruleType ?? '—'}</td><td>{row.value ?? row.amount ?? '—'}</td><td>{row.status ?? 'ACTIVE'}</td></tr>
              ))}
              {!rows.length && !loading ? <tr><td colSpan={4} className="text-center text-secondary py-4">No pricing rules found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
