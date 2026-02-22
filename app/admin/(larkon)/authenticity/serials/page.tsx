'use client'

import { useState } from 'react'
import PageHeader from '@/src/bpa/components/PageHeader'
import SectionCard from '@/src/bpa/admin/components/SectionCard'
import StatusChip from '@/src/bpa/admin/components/StatusChip'
import { apiGet } from '@/lib/api'

export default function SerialsPage() {
  const [serial, setSerial] = useState('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const verify = async () => {
    if (!serial.trim()) return
    setError('')
    setResult(null)
    try {
      const res = await apiGet(`/api/v1/serials/verify?serial=${encodeURIComponent(serial.trim())}`)
      setResult(res?.data ?? null)
    } catch (e: any) {
      setError(e?.message ?? 'Verification failed')
    }
  }

  return (
    <div className="container-fluid">
      <PageHeader title="Serial Verification" subtitle="Verify authenticity serial codes" />
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <SectionCard title="Verify Serial">
        <div className="d-flex gap-2 mb-3">
          <input className="form-control" placeholder="Enter serial code..." value={serial} onChange={(e) => setSerial(e.target.value)} />
          <button className="btn btn-primary" onClick={verify}>Verify</button>
        </div>
        {result ? (
          <div className="border rounded p-3">
            <div className="mb-2"><strong>Serial:</strong> {result.serial ?? serial}</div>
            <div className="mb-2"><strong>Product:</strong> {result.productName ?? '—'}</div>
            <div><strong>Status:</strong> <StatusChip status={result.status} /></div>
          </div>
        ) : null}
      </SectionCard>
    </div>
  )
}
