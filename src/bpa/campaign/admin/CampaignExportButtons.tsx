'use client'

import { useState } from 'react'
import type { CampaignExportFormat } from '@/lib/campaignApi'

type Props = {
  label?: string
  busy?: boolean
  onExport: (format: CampaignExportFormat) => Promise<void>
}

const FORMATS: { id: CampaignExportFormat; label: string }[] = [
  { id: 'csv', label: 'CSV' },
  { id: 'xlsx', label: 'XLSX' },
  { id: 'pdf', label: 'PDF' },
]

export default function CampaignExportButtons({ label = 'Export', busy: externalBusy, onExport }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handle(format: CampaignExportFormat) {
    setError('')
    setBusy(true)
    try {
      await onExport(format)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setBusy(false)
    }
  }

  const isBusy = busy || externalBusy

  return (
    <div className="d-flex flex-wrap align-items-center gap-2">
      <span className="text-muted small">{label}:</span>
      {FORMATS.map((f) => (
        <button
          key={f.id}
          type="button"
          className="btn btn-outline-secondary btn-sm"
          disabled={isBusy}
          onClick={() => handle(f.id)}
        >
          {f.label}
        </button>
      ))}
      {isBusy ? <span className="text-muted small">Downloading…</span> : null}
      {error ? <span className="text-danger small">{error}</span> : null}
    </div>
  )
}
