'use client'

import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import ComingSoonPage from '@/src/bpa/admin/components/ComingSoonPage'
import SectionCard from '@/src/bpa/admin/components/SectionCard'

export default function VerificationPolicyPage() {
  return (
    <AdminPageShell title="Verification requirements" breadcrumbs={[{ label: 'System & Settings' }, { label: 'Policy' }, { label: 'Verification' }]}>
      <SectionCard title="Requirements">
        <ComingSoonPage title="Verification requirements" />
      </SectionCard>
    </AdminPageShell>
  )
}

