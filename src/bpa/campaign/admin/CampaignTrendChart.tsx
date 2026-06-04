'use client'

import dynamic from 'next/dynamic'
import type { ApexOptions } from 'apexcharts'
import type { CampaignStats } from '@/lib/campaignApi'

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false })

export default function CampaignTrendChart({ stats }: { stats: CampaignStats }) {
  const byDay = stats.byDay ?? []
  if (byDay.length === 0) {
    return <p className="text-muted small mb-0">No trend data yet.</p>
  }

  const categories = byDay.map((d) => d.date)
  const options: ApexOptions = {
    chart: { type: 'area', height: 280, toolbar: { show: false }, zoom: { enabled: false } },
    stroke: { curve: 'smooth', width: 2 },
    dataLabels: { enabled: false },
    xaxis: { categories, labels: { rotate: -45 } },
    yaxis: { min: 0, forceNiceScale: true },
    colors: ['#405189', '#0ab39c'],
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05 },
    },
    legend: { position: 'top' },
  }

  const series = [
    { name: 'Bookings', data: byDay.map((d) => d.bookings) },
    { name: 'Vaccinations', data: byDay.map((d) => d.vaccinations ?? 0) },
  ]

  return <ReactApexChart options={options} series={series} type="area" height={280} />
}
