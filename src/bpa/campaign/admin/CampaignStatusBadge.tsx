'use client'

type Props = { status: string }

const STYLES: Record<string, string> = {
  DRAFT: 'bg-secondary-subtle text-secondary',
  ACTIVE: 'bg-success-subtle text-success',
  PAUSED: 'bg-warning-subtle text-warning',
  COMPLETED: 'bg-primary-subtle text-primary',
  CANCELLED: 'bg-danger-subtle text-danger',
  CONFIRMED: 'bg-info-subtle text-info',
  CHECKED_IN: 'bg-success-subtle text-success',
  IN_PROGRESS: 'bg-primary-subtle text-primary',
  NO_SHOW: 'bg-danger-subtle text-danger',
}

export default function CampaignStatusBadge({ status }: Props) {
  const cls = STYLES[status] ?? 'bg-light text-dark'
  return <span className={`badge rounded-pill ${cls}`}>{status.replace(/_/g, ' ')}</span>
}
