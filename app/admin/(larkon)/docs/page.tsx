'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import PageHeader from '@/src/bpa/components/PageHeader'
import SectionCard from '@/src/bpa/admin/components/SectionCard'
import { apiGet } from '@/lib/api'

export default function PlanningDocsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const res = await apiGet('/api/v1/docs/list')
        if (!cancelled) setRows(Array.isArray(res?.data) ? res.data : [])
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load docs list')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="container-fluid">
      <PageHeader title="Planning & Docs" subtitle="Documentation and planning references from backend docs" />
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <SectionCard title="Documents">
        {loading ? <div className="text-secondary">Loading...</div> : null}
        {!loading && !rows.length ? <div className="text-secondary">No documents found.</div> : null}
        {!!rows.length ? (
          <ul className="list-group list-group-flush">
            {rows.map((doc: any) => (
              <li key={doc.slug} className="list-group-item d-flex justify-content-between align-items-center">
                <span>{doc.title ?? doc.slug}</span>
                <Link href={`/admin/docs/${doc.slug}`} className="btn btn-sm btn-outline-primary">View</Link>
              </li>
            ))}
          </ul>
        ) : null}
      </SectionCard>
    </div>
  )
}
