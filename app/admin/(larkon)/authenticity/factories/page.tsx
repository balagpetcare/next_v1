'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/src/bpa/components/PageHeader'
import SectionCard from '@/src/bpa/admin/components/SectionCard'
import { apiGet, apiPost } from '@/lib/api'

export default function FactoriesLinesPage() {
  const [factories, setFactories] = useState<any[]>([])
  const [name, setName] = useState('')
  const [countryCode, setCountryCode] = useState('BD')
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    try {
      const res = await apiGet('/api/v1/factories')
      setFactories(Array.isArray(res?.data) ? res.data : [])
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load factories')
    }
  }
  useEffect(() => { load() }, [])

  const createFactory = async () => {
    if (!name.trim()) return
    try {
      await apiPost('/api/v1/factories', { name: name.trim(), countryCode })
      setName('')
      await load()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create factory')
    }
  }

  return (
    <div className="container-fluid">
      <PageHeader title="Factories & Lines" subtitle="Manage authenticity factories" />
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <SectionCard title="Create Factory">
        <div className="row g-2 mb-3">
          <div className="col-md-5"><input className="form-control" placeholder="Factory name" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="col-md-3"><input className="form-control" placeholder="Country code" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} /></div>
          <div className="col-md-2"><button className="btn btn-primary w-100" onClick={createFactory}>Create</button></div>
        </div>
      </SectionCard>
      <SectionCard title="Factories">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead><tr><th>ID</th><th>Name</th><th>Country</th></tr></thead>
            <tbody>{factories.map((f: any) => <tr key={f.id}><td>{f.id}</td><td>{f.name}</td><td>{f.countryCode ?? '—'}</td></tr>)}</tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
