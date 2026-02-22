'use client'

import Link from 'next/link'
import PageHeader from '@/src/bpa/components/PageHeader'
import SectionCard from '@/src/bpa/admin/components/SectionCard'

export default function DeliveryHubPage() {
  return (
    <div className="container-fluid">
      <PageHeader title="Delivery Hub" subtitle="Delivery operations overview and quick links" />
      <SectionCard title="Delivery Modules">
        <div className="d-flex flex-wrap gap-2">
          <Link href="/admin/delivery/jobs" className="btn btn-outline-primary btn-sm">Jobs Queue</Link>
          <Link href="/admin/delivery/riders" className="btn btn-outline-primary btn-sm">Riders</Link>
          <Link href="/admin/delivery/hubs" className="btn btn-outline-primary btn-sm">Hubs</Link>
          <Link href="/admin/delivery/incidents" className="btn btn-outline-primary btn-sm">Incidents</Link>
        </div>
      </SectionCard>
    </div>
  )
}
