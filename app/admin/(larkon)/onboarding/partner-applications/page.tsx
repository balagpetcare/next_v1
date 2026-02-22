'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/src/bpa/components/PageHeader'
import SectionCard from '@/src/bpa/admin/components/SectionCard'
import StatusChip from '@/src/bpa/admin/components/StatusChip'
import { apiGet, apiPost } from '@/lib/api'

export default function PartnerApplicationsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    try {
      const res = await apiGet('/api/v1/onboarding/partner-applications')
      setRows(Array.isArray(res?.data) ? res.data : res?.data?.items ?? [])
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load partner applications')
    }
  }
  useEffect(() => { load() }, [])

  const decide = async (id: number, action: 'approve' | 'reject') => {
    try {
      await apiPost(`/api/v1/onboarding/partner-applications/${id}/${action}`, {})
      await load()
    } catch (e: any) {
      setError(e?.message ?? `Failed to ${action} application`)
    }
  }

  return (
    <div className="container-fluid">
      <PageHeader title="Partner Applications" subtitle={`Applications: ${rows.length}`} />
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <SectionCard title="Applications">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead><tr><th>ID</th><th>Applicant</th><th>Status</th><th className="text-end">Actions</th></tr></thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id}>
                  <td>#{r.id}</td><td>{r.name ?? r.companyName ?? r.email ?? '—'}</td><td><StatusChip status={r.status} /></td>
                  <td className="text-end">
                    <div className="d-inline-flex gap-2">
                      <button className="btn btn-sm btn-success" onClick={() => decide(r.id, 'approve')}>Approve</button>
                      <button className="btn btn-sm btn-danger" onClick={() => decide(r.id, 'reject')}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length ? <tr><td colSpan={4} className="text-center text-secondary py-4">No partner applications found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
