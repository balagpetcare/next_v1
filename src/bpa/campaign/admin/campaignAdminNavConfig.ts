/**
 * Campaign Admin V2 — sidebar navigation (single source of truth).
 */

export type CampaignNavItem = {
  key: string
  label: string
  href: string
  icon: string
  /** If set, also active when pathname starts with this prefix (for tabbed routes). */
  activePrefixes?: string[]
}

export function getCampaignAdminNav(campaignId: number): CampaignNavItem[] {
  const base = `/admin/campaigns/${campaignId}`
  return [
    { key: 'overview', label: 'Campaign Overview', href: base, icon: 'solar:chart-2-outline' },
    { key: 'configuration', label: 'Configuration', href: `${base}/configuration`, icon: 'solar:settings-outline', activePrefixes: [`${base}/edit`, `${base}/pricing`] },
    {
      key: 'included-vaccines',
      label: 'Vaccines included',
      href: `${base}/included-vaccines`,
      icon: 'solar:syringe-outline',
    },
    { key: 'locations', label: 'Locations', href: `${base}/locations`, icon: 'solar:map-point-outline' },
    {
      key: 'planning',
      label: 'Campaign Planning',
      href: `${base}/planning`,
      icon: 'solar:clipboard-list-outline',
    },
    { key: 'slots', label: 'Slots', href: `${base}/slots`, icon: 'solar:clock-circle-outline' },
    { key: 'bookings', label: 'Bookings', href: `${base}/bookings`, icon: 'solar:calendar-outline' },
    { key: 'payments', label: 'Payments', href: `${base}/payments`, icon: 'solar:wallet-outline' },
    {
      key: 'operations',
      label: 'Operations Center',
      href: `${base}/operations-center`,
      icon: 'solar:widget-5-outline',
      activePrefixes: [`${base}/analytics`, `${base}/sms`, `${base}/certificates`, `${base}/exports`],
    },
    {
      key: 'demand',
      label: 'Demand forecasting',
      href: `${base}/demand-intelligence`,
      icon: 'solar:chart-square-outline',
      activePrefixes: [`${base}/rollout-reports`, `${base}/pre-registrations`, `${base}/rollout`],
    },
    { key: 'verification', label: 'Verification', href: `${base}/verification`, icon: 'solar:verified-check-outline' },
    {
      key: 'reports',
      label: 'Reports',
      href: `${base}/reports`,
      icon: 'solar:document-text-outline',
      activePrefixes: [`${base}/statistics`, `${base}/exports`, `${base}/vaccinations`],
    },
    { key: 'audit', label: 'Audit', href: `${base}/audit`, icon: 'solar:history-outline' },
  ]
}

export function isCampaignNavActive(pathname: string, item: CampaignNavItem): boolean {
  const p = (pathname || '').replace(/\/$/, '')
  const h = item.href.replace(/\/$/, '')
  if (item.key === 'overview') {
    return p === h
  }
  if (p === h || p.startsWith(h + '/')) return true
  for (const prefix of item.activePrefixes ?? []) {
    const pr = prefix.replace(/\/$/, '')
    if (p === pr || p.startsWith(pr + '/')) return true
  }
  return false
}
