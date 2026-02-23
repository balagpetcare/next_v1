'use client'

import Link from 'next/link'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import SectionCard from '@/src/bpa/admin/components/SectionCard'

export default function PolicyCenterPage() {
  return (
    <AdminPageShell title="Policy center" breadcrumbs={[{ label: 'System & Settings' }, { label: 'Policy' }]}>
      <SectionCard title="Quick links">
        <div className="d-grid gap-2">
          <Link className="btn btn-outline-primary" href="/admin/policy/verification">Verification requirements</Link>
          <Link className="btn btn-outline-primary" href="/admin/policy/refund">Refund / discount</Link>
          <Link className="btn btn-outline-primary" href="/admin/policy/commission">Commission</Link>
        </div>
      </SectionCard>

      <SectionCard title="Policy management" className="mt-3">
        <p className="text-secondary mb-0">Policy center (checklist editor, version control) not yet implemented.</p>
      </SectionCard>
    </AdminPageShell>
  )
}

