'use client'

import Link from 'next/link'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import SectionCard from '@/src/bpa/admin/components/SectionCard'

export default function SupportIndexPage() {
  return (
    <AdminPageShell title="Support" breadcrumbs={[{ label: 'Support' }]}>
      <SectionCard title="Quick links">
        <div className="d-grid gap-2">
          <Link className="btn btn-outline-primary" href="/admin/support/tickets">Tickets queue</Link>
          <Link className="btn btn-outline-primary" href="/admin/support/reviews">Reviews moderation</Link>
          <Link className="btn btn-outline-primary" href="/admin/support/reports">Reports / abuse</Link>
          <Link className="btn btn-outline-primary" href="/admin/support/help-center">Help center</Link>
          <Link className="btn btn-outline-primary" href="/admin/support/faqs">FAQs</Link>
          <Link className="btn btn-outline-primary" href="/admin/support/privacy-policy">Privacy policy</Link>
        </div>
      </SectionCard>

      <SectionCard title="Tickets queue" className="mt-3">
        <p className="text-secondary mb-0">Support modules are organized under the section pages.</p>
      </SectionCard>
    </AdminPageShell>
  )
}

