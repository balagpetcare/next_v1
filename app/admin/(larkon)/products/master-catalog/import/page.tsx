'use client'

import { useState } from 'react'
import PageHeader from '@/src/bpa/components/PageHeader'
import SectionCard from '@/src/bpa/admin/components/SectionCard'

export default function MasterCatalogImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const upload = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      // Multipart upload uses fetch with credentials; api helpers are JSON oriented.
      const res = await fetch('/api/v1/products/master-catalog/import', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Import failed')
      setMessage(data?.message || 'Import completed successfully')
    } catch (e: any) {
      setError(e?.message ?? 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-fluid">
      <PageHeader title="Master Catalog Import" subtitle="Upload CSV to bulk import master catalog products" />
      {error ? <div className="alert alert-danger">{error}</div> : null}
      {message ? <div className="alert alert-success">{message}</div> : null}
      <SectionCard title="CSV Upload">
        <div className="d-flex flex-column gap-3">
          <input type="file" className="form-control" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <div className="d-flex gap-2">
            <button className="btn btn-primary" disabled={!file || loading} onClick={upload}>
              {loading ? 'Uploading...' : 'Upload CSV'}
            </button>
            <a href="/admin/products/master-catalog" className="btn btn-outline-secondary">Back to catalog</a>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
