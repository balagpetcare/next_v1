'use client'

import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import ComingSoonPage from '@/src/bpa/admin/components/ComingSoonPage'
import SectionCard from '@/src/bpa/admin/components/SectionCard'

export default function RefundPolicyPage() {
  return (
    <AdminPageShell title="Refund / discount" breadcrumbs={[{ label: 'System & Settings' }, { label: 'Policy' }, { label: 'Refund' }]}>
      <SectionCard title="Refund policy">
        <ComingSoonPage title="Refund / discount policy" />
      </SectionCard>
    </AdminPageShell>
  )
}

