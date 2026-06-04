import { Suspense } from 'react'
import AccountHubPage from '@/src/components/account/AccountHubPage'

export default function DoctorAccountPage() {
  return (
    <Suspense fallback={<div className="p-20 text-secondary-light">Loading account…</div>}>
      <AccountHubPage basePath="/doctor" supportHref="/doctor/notifications" />
    </Suspense>
  )
}
