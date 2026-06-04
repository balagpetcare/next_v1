'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import DataTable from '@/src/bpa/admin/components/DataTable'
import ErrorState from '@/src/bpa/admin/components/ErrorState'
import { campaignAdminBookings, campaignPublicVerify, type CampaignBookingRow } from '@/lib/campaignApi'

type VerifyRow = {
  id: string
  token: string
  petName: string
  bookingRef: string
  valid?: boolean
  message?: string
}

export default function AdminCampaignVerificationPage() {
  const params = useParams()
  const campaignId = Number(params?.id)
  const [rows, setRows] = useState<VerifyRow[]>([])
  const [tokenSearch, setTokenSearch] = useState('')
  const [lookupResult, setLookupResult] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!Number.isFinite(campaignId)) return
    setLoading(true)
    setError('')
    try {
      const { items } = await campaignAdminBookings(campaignId, { page: 1, pageSize: 50, status: 'COMPLETED' })
      const certs: VerifyRow[] = []
      for (const b of items) {
        for (const p of b.pets ?? []) {
          if (p.certificateToken) {
            certs.push({
              id: `${b.bookingRef}-${p.id}`,
              token: p.certificateToken,
              petName: p.name,
              bookingRef: b.bookingRef,
            })
          }
        }
      }
      setRows(certs)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load certificates')
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    load()
  }, [load])

  async function verifyToken() {
    setError('')
    setLookupResult(null)
    try {
      setLookupResult(await campaignPublicVerify(tokenSearch.trim()))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed')
    }
  }

  async function verifyRow(row: VerifyRow) {
    try {
      const result = await campaignPublicVerify(row.token)
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                valid: (result as { valid?: boolean })?.valid ?? (result as { status?: string })?.status === 'VALID',
                message: (result as { message?: string })?.message,
              }
            : r
        )
      )
    } catch {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, valid: false, message: 'Not found' } : r)))
    }
  }

  return (
    <AdminPageShell title="Verification logs" breadcrumbs={[{ label: 'Campaigns', href: '/admin/campaigns' }, { label: 'Verification' }]}>
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      <div className="d-flex gap-2 mb-3 flex-wrap">
        <input
          className="form-control form-control-sm"
          style={{ maxWidth: 320 }}
          placeholder="Certificate token to verify…"
          value={tokenSearch}
          onChange={(e) => setTokenSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') verifyToken()
          }}
        />
        <button type="button" className="btn btn-sm btn-primary" onClick={verifyToken}>
          Verify token
        </button>
      </div>

      {lookupResult ? (
        <pre className="border rounded p-3 bg-light small mb-3" style={{ maxHeight: 240, overflow: 'auto' }}>
          {JSON.stringify(lookupResult, null, 2)}
        </pre>
      ) : null}

      <p className="text-muted small">Recent certificates from completed bookings. Tap verify to call the public verification API.</p>

      <DataTable
        columns={[
          { key: 'ref', label: 'Booking', render: (r: VerifyRow) => r.bookingRef },
          { key: 'pet', label: 'Pet', render: (r: VerifyRow) => r.petName },
          { key: 'token', label: 'Token', render: (r: VerifyRow) => <span className="font-monospace small">{r.token}</span> },
          {
            key: 'status',
            label: 'Result',
            render: (r: VerifyRow) =>
              r.valid === undefined ? (
                '—'
              ) : r.valid ? (
                <span className="badge bg-success">Valid</span>
              ) : (
                <span className="badge bg-danger">Invalid</span>
              ),
          },
          {
            key: 'action',
            label: '',
            render: (r: VerifyRow) => (
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => verifyRow(r)}>
                Verify
              </button>
            ),
          },
        ]}
        rows={rows}
        loading={loading}
        keyField="id"
      />
    </AdminPageShell>
  )
}
