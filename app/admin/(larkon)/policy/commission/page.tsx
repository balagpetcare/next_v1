'use client'

import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import ComingSoonPage from '@/src/bpa/admin/components/ComingSoonPage'
import SectionCard from '@/src/bpa/admin/components/SectionCard'

export default function CommissionPolicyPage() {
  return (
    <AdminPageShell title="Commission" breadcrumbs={[{ label: 'System & Settings' }, { label: 'Policy' }, { label: 'Commission' }]}>
      <SectionCard title="Commission">
        <ComingSoonPage title="Commission policy" />
      </SectionCard>
    </AdminPageShell>
  )
}

