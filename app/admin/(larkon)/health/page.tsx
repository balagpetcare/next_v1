'use client'

import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import Link from 'next/link'
import PageHeader from '@/src/bpa/components/PageHeader'
import SectionCard from '@/src/bpa/admin/components/SectionCard'

const base = String(process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')

export default function HealthPage() {
  const [apiOk, setApiOk] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let done = false
    fetch(`${base}/health`, { credentials: 'include' })
      .then((r) => r.json().then((j: { service?: string }) => ({ ok: r.ok, ...j })))
      .then(({ ok, service }) => {
        if (!done) setApiOk(ok && (service === 'bpa_api' || !!service))
      })
      .catch(() => {
        if (!done) setApiOk(false)
      })
      .finally(() => {
        if (!done) setLoading(false)
      })
    return () => {
      done = true
    }
  }, [])

  return (
    <div className="container-fluid">
      <PageHeader
        title="System health"
        subtitle="API, DB, routing"
        right={
          <Link href="/admin/system" className="btn btn-outline-secondary btn-sm">
            System hub
          </Link>
        }
      />
      <SectionCard title="Status">
        {loading ? (
          <p className="text-secondary mb-0">Checking…</p>
        ) : (
          <div className="d-flex align-items-center gap-2">
            {apiOk ? (
              <>
                <span className="text-success">
                  <Icon icon="solar:check-circle-bold" />
                </span>
                <span>API OK</span>
              </>
            ) : (
              <>
                <span className="text-danger">
                  <Icon icon="solar:close-circle-bold" />
                </span>
                <span>API unreachable</span>
              </>
            )}
          </div>
        )}
      </SectionCard>
      <SectionCard title="Routing">
        <p className="text-secondary mb-0">This page confirms admin routing works.</p>
      </SectionCard>
    </div>
  )
}
