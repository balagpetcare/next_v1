'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { apiGet, apiPatch } from '@/lib/api'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import SectionCard from '@/src/bpa/admin/components/SectionCard'
import StatCard from '@/src/bpa/admin/components/StatCard'
import StatusChip from '@/src/bpa/admin/components/StatusChip'
import { adminToast } from '@/src/bpa/admin/lib/adminToast'

const STATUS_OPTIONS = ['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED']

type OrgRow = {
  id: number
  name?: string
  supportPhone?: string
  status?: string
  ownerUserId?: number
  branches?: { id: number; name?: string; status?: string; verificationStatus?: string }[]
  legalProfile?: {
    id?: number
    registrationType?: string
    tradeLicenseNumber?: string
    tinNumber?: string
    verificationStatus?: string
  }
}

type Financial = {
  totalRevenue?: number
  totalOrders?: number
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="d-flex justify-content-between gap-3 py-1" style={{ fontSize: 13 }}>
      <div className="text-secondary" style={{ minWidth: 140 }}>{label}</div>
      <div className="text-end" style={{ fontWeight: 600 }}>{value != null && value !== '' ? String(value) : '—'}</div>
    </div>
  )
}

export default function AdminOrganizationDetailPage() {
  const params = useParams()
  const id = params?.id as string | undefined
  const [row, setRow] = useState<OrgRow | null>(null)
  const [financial, setFinancial] = useState<Financial | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name: '', supportPhone: '', status: 'PENDING_REVIEW' })

  const load = useCallback(async () => {
    if (!id) return
    setError('')
    try {
      const [orgRes, finRes] = await Promise.all([
        apiGet<{ data?: OrgRow }>(`/api/v1/admin/organizations/${id}`),
        apiGet<{ data?: Financial }>(`/api/v1/reports/revenue?orgId=${id}`).catch(() => ({ data: null })),
      ])
      const org = orgRes?.data ?? null
      setRow(org)
      setFinancial(finRes?.data ?? null)
      if (org) {
        setForm({
          name: org.name ?? '',
          supportPhone: org.supportPhone ?? '',
          status: org.status ?? 'PENDING_REVIEW',
        })
      }
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed')
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const branches = useMemo(() => row?.branches ?? [], [row])

  const save = async () => {
    if (!id) return
    setBusy(true)
    setError('')
    try {
      await apiPatch(`/api/v1/admin/organizations/${id}`, {
        name: form.name,
        supportPhone: form.supportPhone || null,
        status: form.status,
      })
      adminToast.success('Saved')
      await load()
    } catch (e) {
      const msg = (e as Error)?.message ?? 'Save failed'
      setError(msg)
      adminToast.error(msg)
    } finally {
      setBusy(false)
    }
  }

  const formatCurrency = (amount: number | undefined) =>
    new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount ?? 0)

  if (error && !row) {
    return (
      <AdminPageShell title="Organization" breadcrumbs={[{ label: 'Organizations', href: '/admin/organizations' }, { label: 'Error' }]}>
        <div className="alert alert-danger" role="alert">{error}</div>
        <Link href="/admin/organizations" className="btn btn-outline-secondary btn-sm mt-2">← Back</Link>
      </AdminPageShell>
    )
  }
  if (!row) {
    return (
      <AdminPageShell title="Organization" breadcrumbs={[{ label: 'Organizations', href: '/admin/organizations' }, { label: '…' }]}>
        <div className="text-secondary">Loading…</div>
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell
      title={`Organization #${row.id}`}
      breadcrumbs={[
        { label: 'Organizations', href: '/admin/organizations' },
        { label: `#${row.id}` },
      ]}
      actions={
        <Link href="/admin/organizations" className="btn btn-outline-secondary btn-sm">← Back</Link>
      }
    >
      <p className="text-secondary mb-3" style={{ fontSize: 13 }}>
        Owner User #{row.ownerUserId} • <StatusChip status={row.status} />
      </p>

      {financial && (
        <div className="row g-3 mb-3">
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard
              title="Total Revenue"
              value={formatCurrency(financial.totalRevenue)}
              icon={<Icon icon="solar:wallet-money-bold" />}
              tone="success"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard
              title="Total Orders"
              value={financial.totalOrders}
              icon={<Icon icon="solar:cart-bold" />}
              tone="primary"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard
              title="Branches"
              value={branches.length}
              icon={<Icon icon="solar:shop-2-bold" />}
              tone="info"
            />
          </div>
        </div>
      )}

      <div className="row g-3">
        <div className="col-12 col-xl-6">
          <SectionCard title="Organization Information">
            <div className="mb-3">
              <label className="form-label">Organization name</label>
              <input
                className="form-control"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Support phone</label>
              <input
                className="form-control"
                value={form.supportPhone}
                onChange={(e) => setForm({ ...form, supportPhone: e.target.value })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <button type="button" onClick={save} disabled={busy} className="btn btn-primary">
              {busy ? 'Saving…' : 'Save Changes'}
            </button>
          </SectionCard>
        </div>

        <div className="col-12 col-xl-6">
          <SectionCard title="KYC Information">
            <Field label="Has legal profile" value={row.legalProfile ? 'Yes' : 'No'} />
            {row.legalProfile ? (
              <>
                <Field label="Registration type" value={row.legalProfile.registrationType} />
                <Field label="Trade license" value={row.legalProfile.tradeLicenseNumber} />
                <Field label="TIN" value={row.legalProfile.tinNumber} />
                <Field label="Verification Status" value={row.legalProfile.verificationStatus} />
                {row.legalProfile.id && (
                  <div className="mt-2">
                    <Link
                      href={`/admin/verifications/organizations/${row.legalProfile.id}`}
                      className="btn btn-sm btn-outline-primary"
                    >
                      View Verification
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <div className="text-secondary">No KYC profile attached yet.</div>
            )}
          </SectionCard>
        </div>
      </div>

      <div className="row g-3 mt-3">
        <div className="col-12">
          <SectionCard title={`Branches (${branches.length})`}>
            <div className="row g-2">
              {branches.map((b) => (
                <div key={b.id} className="col-12 col-md-6 col-lg-4">
                  <div className="card radius-12 p-3">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="fw-semibold">{b.name}</div>
                        <div className="text-secondary" style={{ fontSize: 12 }}>
                          #{b.id} • <StatusChip status={b.status} /> <StatusChip status={b.verificationStatus} />
                        </div>
                      </div>
                      <Link href={`/admin/branches/${b.id}`} className="btn btn-sm btn-primary">
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
              {!branches.length && (
                <div className="col-12 text-secondary text-center py-3">No branches.</div>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </AdminPageShell>
  )
}
