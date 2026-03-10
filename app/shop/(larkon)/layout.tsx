'use client'
import '@larkon/assets/entry-with-choices'
import '@larkon-ui/styles/dashboard-overrides.scss'
import LarkonDashboardShell from '@larkon/components/layout/LarkonDashboardShell'

export default function ShopLarkonLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="/assets/css/style.css" />
      <LarkonDashboardShell basePath="/shop">{children}</LarkonDashboardShell>
    </>
  )
}
