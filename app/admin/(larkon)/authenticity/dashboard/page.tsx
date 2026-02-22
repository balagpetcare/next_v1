'use client'

import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import PageHeader from '@/src/bpa/components/PageHeader'
import StatCard from '@/src/bpa/admin/components/StatCard'
import { apiGet } from '@/lib/api'

export default function ProductAuthenticityDashboardPage() {
  const [stats, setStats] = useState({ batches: 0, serials: 0, issued: 0, activated: 0 })

  const load = async () => {
    const [batchesRes, serialsRes, issuedRes, activatedRes] = await Promise.all([
      apiGet('/api/v1/batches?limit=1').catch(() => ({ data: null })),
      apiGet('/api/v1/serials?limit=1').catch(() => ({ data: null })),
      apiGet('/api/v1/serials?status=ISSUED&limit=1').catch(() => ({ data: null })),
      apiGet('/api/v1/serials?status=ACTIVATED&limit=1').catch(() => ({ data: null })),
    ])
    setStats({
      batches: batchesRes?.data?.pagination?.total ?? 0,
      serials: serialsRes?.data?.pagination?.total ?? 0,
      issued: issuedRes?.data?.pagination?.total ?? 0,
      activated: activatedRes?.data?.pagination?.total ?? 0,
    })
  }

  useEffect(() => { load() }, [])

  return (
    <div className="container-fluid">
      <PageHeader
        title="Product Authenticity Dashboard"
        subtitle="Batch and serial performance snapshot"
        right={<button className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1" onClick={load}><Icon icon="solar:refresh-outline" />Refresh</button>}
      />
      <div className="row g-3">
        <div className="col-12 col-sm-6 col-lg-3"><StatCard title="Batches" value={stats.batches} tone="primary" /></div>
        <div className="col-12 col-sm-6 col-lg-3"><StatCard title="Serials" value={stats.serials} tone="info" /></div>
        <div className="col-12 col-sm-6 col-lg-3"><StatCard title="Issued" value={stats.issued} tone="warning" /></div>
        <div className="col-12 col-sm-6 col-lg-3"><StatCard title="Activated" value={stats.activated} tone="success" /></div>
      </div>
    </div>
  )
}
