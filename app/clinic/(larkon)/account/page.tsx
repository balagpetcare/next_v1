import { Suspense } from 'react'
import AccountHubPage from '@/src/components/account/AccountHubPage'

export default function ClinicAccountPage() {
  return (
    <Suspense fallback={<div className="p-20 text-secondary-light">Loading account…</div>}>
      <AccountHubPage basePath="/clinic" supportHref="/clinic/notifications" />
    </Suspense>
  )
}
