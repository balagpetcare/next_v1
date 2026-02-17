'use client'
import '@larkon/assets/scss/app.scss'
import '@larkon-ui/styles/dashboard-overrides.scss'
import LarkonDashboardShell from '@larkon/components/layout/LarkonDashboardShell'

export default function ProducerLarkonLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="/assets/css/style.css" />
      <LarkonDashboardShell basePath="/producer">{children}</LarkonDashboardShell>
    </>
  )
}
