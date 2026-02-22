'use client'

import Link from 'next/link'
import PageHeader from '@/src/bpa/components/PageHeader'
import SectionCard from '@/src/bpa/admin/components/SectionCard'

export default function ContentHubPage() {
  return (
    <div className="container-fluid">
      <PageHeader title="Content Hub" subtitle="Manage admin content streams and templates" />
      <SectionCard title="Content Modules">
        <div className="d-flex flex-wrap gap-2">
          <Link href="/admin/content/announcements" className="btn btn-outline-primary btn-sm">Announcements</Link>
          <Link href="/admin/content/notifications" className="btn btn-outline-primary btn-sm">Notification Logs</Link>
          <Link href="/admin/content/templates" className="btn btn-outline-primary btn-sm">Templates</Link>
          <Link href="/admin/content/cms" className="btn btn-outline-primary btn-sm">CMS Blocks</Link>
        </div>
      </SectionCard>
    </div>
  )
}
