'use client'

import type { CampaignDashboardOverview } from '@/lib/campaignApi'

type Widget = {
  label: string
  value: string | number
  hint?: string
  icon: string
  variant?: string
}

export default function CampaignDashboardWidgets({ overview }: { overview: CampaignDashboardOverview }) {
  const fmtMoney =
    overview.pricingType === 'FREE'
      ? 'Free campaign'
      : `${overview.revenue.toLocaleString()} ${overview.currency}`

  const widgets: Widget[] = [
    { label: 'Total bookings', value: overview.totalBookings, icon: 'ri-calendar-check-line', variant: 'primary' },
    { label: 'Total cats', value: overview.totalCats, icon: 'ri-bear-smile-line', variant: 'info' },
    { label: 'Total vaccinated', value: overview.totalVaccinated, icon: 'ri-syringe-line', variant: 'success' },
    { label: 'Pending vaccination', value: overview.pendingVaccination, icon: 'ri-time-line', variant: 'warning' },
    { label: 'Revenue', value: fmtMoney, icon: 'ri-money-dollar-circle-line', variant: 'dark' },
    { label: 'Certificates issued', value: overview.certificatesIssued, icon: 'ri-award-line', variant: 'success' },
    {
      label: 'SMS sent (est.)',
      value: overview.smsSentEstimate,
      hint: 'Bookings + completion messages',
      icon: 'ri-message-2-line',
      variant: 'secondary',
    },
  ]

  return (
    <div className="row g-3 mb-4">
      {widgets.map((w) => (
        <div className="col-sm-6 col-xl-4 col-xxl-3" key={w.label}>
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body d-flex align-items-start gap-3">
              <div className={`rounded p-2 bg-${w.variant ?? 'primary'}-subtle text-${w.variant ?? 'primary'}`}>
                <i className={`${w.icon} fs-4`} aria-hidden />
              </div>
              <div>
                <p className="text-muted small mb-1">{w.label}</p>
                <h4 className="mb-0">{w.value}</h4>
                {w.hint ? <p className="text-muted mb-0 mt-1" style={{ fontSize: '0.75rem' }}>{w.hint}</p> : null}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
