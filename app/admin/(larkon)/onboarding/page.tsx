'use client'

import Link from 'next/link'
import PageHeader from '@/src/bpa/components/PageHeader'
import SectionCard from '@/src/bpa/admin/components/SectionCard'

export default function OnboardingPage() {
  return (
    <div className="container-fluid">
      <PageHeader title="Onboarding Center" subtitle="Review and process onboarding workflows" />
      <SectionCard title="Onboarding Modules">
        <div className="d-flex flex-wrap gap-2">
          <Link href="/admin/onboarding/publish-requests" className="btn btn-outline-primary btn-sm">Publish Requests</Link>
          <Link href="/admin/onboarding/partner-applications" className="btn btn-outline-primary btn-sm">Partner Applications</Link>
        </div>
      </SectionCard>
    </div>
  )
}
