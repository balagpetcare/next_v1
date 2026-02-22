'use client'

import Link from 'next/link'
import PageHeader from '@/src/bpa/components/PageHeader'
import SectionCard from '@/src/bpa/admin/components/SectionCard'

export default function SystemHubPage() {
  return (
    <div className="container-fluid">
      <PageHeader title="System Hub" subtitle="System-level controls and diagnostics links" />
      <SectionCard title="System Modules">
        <div className="d-flex flex-wrap gap-2">
          <Link href="/admin/health" className="btn btn-outline-primary btn-sm">System Health</Link>
          <Link href="/admin/settings" className="btn btn-outline-primary btn-sm">Settings</Link>
          <Link href="/admin/system/integrations" className="btn btn-outline-primary btn-sm">Integrations</Link>
          <Link href="/admin/system/sessions" className="btn btn-outline-primary btn-sm">Sessions</Link>
        </div>
      </SectionCard>
    </div>
  )
}
