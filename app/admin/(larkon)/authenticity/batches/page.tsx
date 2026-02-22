'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/src/bpa/components/PageHeader'
import SectionCard from '@/src/bpa/admin/components/SectionCard'
import StatusChip from '@/src/bpa/admin/components/StatusChip'
import { apiGet, apiPost } from '@/lib/api'

export default function AuthenticityBatchesPage() {
  const [rows, setRows] = useState<any[]>([])
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    try {
      const res = await apiGet('/api/v1/batches')
      setRows(Array.isArray(res?.data) ? res.data : res?.data?.items ?? [])
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load batches')
    }
  }
  useEffect(() => { load() }, [])

  const issue = async (id: number) => {
    try {
      await apiPost(`/api/v1/batches/${id}/issue`, {})
      await load()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to issue batch')
    }
  }

  return (
    <div className="container-fluid">
      <PageHeader title="Authenticity Batches" subtitle={`Batches: ${rows.length}`} />
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <SectionCard title="Batches">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead><tr><th>ID</th><th>Factory</th><th>Status</th><th className="text-end">Actions</th></tr></thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id}><td>#{r.id}</td><td>{r.factoryName ?? r.factoryId ?? '—'}</td><td><StatusChip status={r.status} /></td><td className="text-end"><button className="btn btn-sm btn-outline-primary" onClick={() => issue(r.id)}>Issue</button></td></tr>
              ))}
              {!rows.length ? <tr><td colSpan={4} className="text-center text-secondary py-4">No batches found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
