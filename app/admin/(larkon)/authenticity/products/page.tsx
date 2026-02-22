'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/src/bpa/components/PageHeader'
import SectionCard from '@/src/bpa/admin/components/SectionCard'
import { apiGet, apiPost } from '@/lib/api'

export default function ProductVersionsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    try {
      const res = await apiGet('/api/v1/products/versions')
      setRows(Array.isArray(res?.data) ? res.data : res?.data?.items ?? [])
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load product versions')
    }
  }
  useEffect(() => { load() }, [])

  const create = async () => {
    if (!name.trim()) return
    try {
      await apiPost('/api/v1/products/versions', { name: name.trim() })
      setName('')
      await load()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create product version')
    }
  }

  return (
    <div className="container-fluid">
      <PageHeader title="Product Versions" subtitle="Manage authenticity product versions" />
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <SectionCard title="Create Product Version">
        <div className="row g-2 mb-3">
          <div className="col-md-6"><input className="form-control" placeholder="Version name" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="col-md-2"><button className="btn btn-primary w-100" onClick={create}>Create</button></div>
        </div>
      </SectionCard>
      <SectionCard title="Versions">
        <div className="table-responsive">
          <table className="table align-middle mb-0"><thead><tr><th>ID</th><th>Name</th></tr></thead><tbody>{rows.map((r: any) => <tr key={r.id}><td>{r.id}</td><td>{r.name ?? r.versionName ?? '—'}</td></tr>)}</tbody></table>
        </div>
      </SectionCard>
    </div>
  )
}
