'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import PageHeader from '@/src/bpa/components/PageHeader'
import SectionCard from '@/src/bpa/admin/components/SectionCard'
import { apiGet } from '@/lib/api'

export default function AdminDocViewPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string | undefined

  const [doc, setDoc] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const res = await apiGet(`/api/v1/docs/${encodeURIComponent(slug)}`)
        if (!cancelled) setDoc(res?.data ?? null)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load doc')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  if (!slug) {
    router.replace('/admin/docs')
    return null
  }

  return (
    <div className="container-fluid">
      <PageHeader
        title={doc?.title ?? slug}
        subtitle="Back to docs"
        right={<Link href="/admin/docs" className="btn btn-sm btn-outline-secondary">Back to list</Link>}
      />
      <SectionCard title="">
        {loading ? <div className="text-secondary">Loading...</div> : null}
        {error ? <div className="text-danger">{error}</div> : null}
        {!loading && !error ? (
          <pre className="mb-0 small bg-light rounded p-3" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {doc?.content ?? 'No content available.'}
          </pre>
        ) : null}
      </SectionCard>
    </div>
  )
}
