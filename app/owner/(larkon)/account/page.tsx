import { Suspense } from 'react'
import AccountHubPage from '@/src/components/account/AccountHubPage'

export default function OwnerAccountPage() {
  return (
    <Suspense fallback={<div className="p-20 text-secondary-light">Loading account…</div>}>
      <AccountHubPage basePath="/owner" supportHref="/owner/notifications" />
    </Suspense>
  )
}
