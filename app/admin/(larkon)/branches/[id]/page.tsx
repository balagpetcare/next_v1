'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { apiGet, apiPatch } from '@/lib/api'
import { branchManagerApi } from '@/lib/adminApi'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import SectionCard from '@/src/bpa/admin/components/SectionCard'
import StatCard from '@/src/bpa/admin/components/StatCard'
import StatusChip from '@/src/bpa/admin/components/StatusChip'
import LoadingSkeleton from '@/src/bpa/admin/components/LoadingSkeleton'
import { adminToast } from '@/src/bpa/admin/lib/adminToast'
import {
  resolveBranchLifecycleStatus,
  listEnabledCapabilityKeys,
  getCapabilityLabel,
  formatBranchAddressSummary,
  parseCapabilitiesJson,
} from '@/src/bpa/admin/lib/branchAdmin'

const STATUS_OPTIONS = ['DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'INACTIVE', 'BLOCKED']
const VERIF_OPTIONS = ['UNSUBMITTED', 'SUBMITTED', 'VERIFIED', 'REJECTED']

type BranchRow = {
  id: number
  name?: string
  code?: string | null
  status?: string
  verificationStatus?: string
  orgId?: number
  org?: { name?: string; ownerUserId?: number }
  capabilitiesJson?: unknown
  featuresJson?: unknown
  location?: unknown
  addressJson?: unknown
  typeLinks?: { branchType?: { code?: string } }[]
  profileDetails?: { id?: number; documents?: unknown[] }
  publishRequests?: { id: number; status?: string }[]
  members?: { id: number; userId?: number; user?: { profile?: { displayName?: string }; auth?: { phone?: string; email?: string } }; roles?: { roleId?: number; role?: { key?: string } }[] }[]
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="d-flex justify-content-between gap-3 py-1" style={{ fontSize: 13 }}>
      <div className="text-secondary" style={{ minWidth: 140 }}>{label}</div>
      <div className="text-end" style={{ fontWeight: 600 }}>{value != null && value !== '' ? String(value) : '—'}</div>
    </div>
  )
}

export default function AdminBranchDetailPage() {
  const params = useParams()
  const id = params?.id as string | undefined
  const [row, setRow] = useState<BranchRow | null>(null)
  const [inventory, setInventory] = useState<Record<string, unknown> | null>(null)
  const [sales, setSales] = useState<Record<string, unknown> | null>(null)
  const [managerKpis, setManagerKpis] = useState<Record<string, unknown> | null>(null)
  const [staffOverview, setStaffOverview] = useState<any[] | null>(null)
  const [form, setForm] = useState({
    name: '',
    status: 'DRAFT',
    verificationStatus: 'UNSUBMITTED',
    typeCodes: [] as string[],
    capabilitiesJson: {} as Record<string, unknown>,
    featuresJson: {} as Record<string, unknown>,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    setError('')
    try {
      const [branchRes, invRes, revRes, kpisRes, staffRes] = await Promise.all([
        apiGet<{ data?: BranchRow }>(`/api/v1/admin/branches/${id}`),
        apiGet<{ data?: unknown }>(`/api/v1/inventory?branchId=${id}`).catch(() => ({ data: null })),
        apiGet<{ data?: unknown }>(`/api/v1/reports/revenue?branchId=${id}`).catch(() => ({ data: null })),
        branchManagerApi.kpis(id).catch(() => ({ data: null })),
        branchManagerApi.staffOverview(id).catch(() => ({ data: null })),
      ])
      const data = branchRes?.data ?? null
      setRow(data)
      setInventory((invRes as any)?.data ?? null)
      setSales((revRes as any)?.data ?? null)
      setManagerKpis((kpisRes as any)?.data ?? null)
      setStaffOverview(Array.isArray((staffRes as any)?.data) ? (staffRes as any).data : null)
      if (data) {
        setForm({
          name: data.name ?? '',
          status: data.status ?? 'DRAFT',
          verificationStatus: data.verificationStatus ?? 'UNSUBMITTED',
          typeCodes: (data.typeLinks ?? []).map((x: any) => x?.branchType?.code).filter(Boolean),
          capabilitiesJson: (data as any).capabilitiesJson ?? {},
          featuresJson: (data as any).featuresJson ?? {},
        })
      }
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed')
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const typeCodesStr = useMemo(() => (form.typeCodes || []).join(', '), [form.typeCodes])

  const save = async () => {
    if (!id) return
    setBusy(true)
    setError('')
    try {
      await apiPatch(`/api/v1/admin/branches/${id}`, {
        name: form.name,
        status: form.status,
        verificationStatus: form.verificationStatus,
        typeCodes: String(typeCodesStr).split(',').map((x) => x.trim()).filter(Boolean),
        capabilitiesJson: form.capabilitiesJson,
        featuresJson: form.featuresJson,
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

  const formatCurrency = (amount: number | string | undefined) =>
    new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(Number(amount ?? 0))

  if (error && !row) {
    return (
      <AdminPageShell title="Branch" breadcrumbs={[{ label: 'Branches', href: '/admin/branches' }, { label: 'Error' }]}>
        <div className="alert alert-danger" role="alert">{error}</div>
        <Link href="/admin/branches" className="btn btn-outline-secondary btn-sm mt-2">← Back</Link>
      </AdminPageShell>
    )
  }
  if (!row) {
    return (
      <AdminPageShell title="Branch" breadcrumbs={[{ label: 'Branches', href: '/admin/branches' }, { label: '…' }]}>
        <LoadingSkeleton rows={6} />
      </AdminPageShell>
    )
  }

  const statusInfo = resolveBranchLifecycleStatus(row.status ?? 'DRAFT')
  const capabilityKeys = listEnabledCapabilityKeys(row.capabilitiesJson)
  const addressSummary = formatBranchAddressSummary(row)

  const salesData = sales as { totalRevenue?: number; totalOrders?: number; averageOrderValue?: number } | null
  const invData = inventory as { summary?: { totalItems?: number; lowStockCount?: number }; items?: unknown[] } | null
  const kpisData = managerKpis as { orders?: { countToday?: number; totalAmountToday?: string }; staff?: { totalActive?: number }; accessRequests?: { pending?: number } } | null

  return (
    <AdminPageShell
      title={`Branch #${row.id}`}
      breadcrumbs={[
        { label: 'Branches', href: '/admin/branches' },
        { label: `#${row.id}` },
      ]}
      actions={<Link href="/admin/branches" className="btn btn-outline-secondary btn-sm">← Back</Link>}
    >
      <p className="text-secondary mb-3" style={{ fontSize: 13 }}>
        Org #{row.orgId} • {row.org?.name ?? '—'} • Owner User #{row.org?.ownerUserId ?? '—'}
      </p>

      {error ? <div className="alert alert-danger mb-3">{error}</div> : null}

      {/* Branch Summary */}
      <SectionCard title="Branch Overview" className="mb-3">
        <div className="row">
          <div className="col-md-6">
            <Field label="Branch Name" value={row.name} />
            <Field label="Branch Code" value={row.code || '—'} />
            <Field label="Branch ID" value={`#${row.id}`} />
            <Field label="Organization" value={row.org?.name} />
          </div>
          <div className="col-md-6">
            <Field 
              label="Status" 
              value={<StatusChip status={row.status} variant={statusInfo.variant} />} 
            />
            <Field 
              label="Verification" 
              value={<StatusChip status={row.verificationStatus || 'UNSUBMITTED'} />} 
            />
            <Field label="Address" value={addressSummary} />
            <div className="d-flex justify-content-between gap-3 py-1" style={{ fontSize: 13 }}>
              <div className="text-secondary" style={{ minWidth: 140 }}>Capabilities</div>
              <div className="text-end d-flex flex-wrap gap-1 justify-content-end">
                {capabilityKeys.length > 0 ? (
                  capabilityKeys.map((key) => (
                    <span key={key} className="badge bg-light text-dark border">
                      {getCapabilityLabel(key)}
                    </span>
                  ))
                ) : (
                  <span className="text-muted">None configured</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {kpisData && (
        <div className="row g-3 mb-3">
          <div className="col-12"><h6 className="text-secondary mb-2">Manager KPIs (Today)</h6></div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard title="Orders Today" value={kpisData.orders?.countToday ?? 0} icon={<Icon icon="solar:cart-bold" />} tone="primary" />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard title="Sales Today" value={formatCurrency(kpisData.orders?.totalAmountToday)} icon={<Icon icon="solar:wallet-money-bold" />} tone="success" />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard title="Active Staff" value={kpisData.staff?.totalActive ?? 0} icon={<Icon icon="solar:user-id-bold" />} tone="info" />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard title="Pending Access Requests" value={kpisData.accessRequests?.pending ?? 0} icon={<Icon icon="solar:clock-circle-bold" />} tone="warning" />
          </div>
        </div>
      )}

      {salesData && (
        <div className="row g-3 mb-3">
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard title="Total Revenue" value={formatCurrency(salesData.totalRevenue)} icon={<Icon icon="solar:wallet-money-bold" />} tone="success" />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard title="Total Orders" value={salesData.totalOrders} icon={<Icon icon="solar:cart-bold" />} tone="primary" />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard title="Avg Order Value" value={formatCurrency(salesData.averageOrderValue)} icon={<Icon icon="solar:chart-2-bold" />} tone="info" />
          </div>
        </div>
      )}

      {invData && (
        <div className="row g-3 mb-3">
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard title="Inventory Items" value={invData.summary?.totalItems ?? (Array.isArray(invData.items) ? invData.items.length : 0)} icon={<Icon icon="solar:box-bold" />} tone="info" />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard title="Low Stock" value={invData.summary?.lowStockCount ?? 0} icon={<Icon icon="solar:warning-bold" />} tone="warning" />
          </div>
        </div>
      )}

      <div className="row g-3">
        <div className="col-12 col-xl-6">
          <SectionCard title="Branch Information">
            <div className="mb-3">
              <label className="form-label">Name</label>
              <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="mb-3">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">Verification Status</label>
              <select className="form-select" value={form.verificationStatus} onChange={(e) => setForm({ ...form, verificationStatus: e.target.value })}>
                {VERIF_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">Type codes (comma separated)</label>
              <input
                className="form-control"
                value={typeCodesStr}
                onChange={(e) => setForm({ ...form, typeCodes: String(e.target.value).split(',').map((x) => x.trim()).filter(Boolean) })}
                placeholder="CLINIC, PET_SHOP"
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Capabilities</label>
              <div className="d-flex flex-wrap gap-2">
                {['clinic', 'shop', 'online_sales', 'delivery_hub', 'hq_warehouse'].map((cap) => {
                  const caps = parseCapabilitiesJson(form.capabilitiesJson)
                  const isEnabled = caps[cap] === true
                  return (
                    <div key={cap} className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={`edit-cap-${cap}`}
                        checked={isEnabled}
                        onChange={(e) => {
                          const newCaps = { ...caps, [cap]: e.target.checked }
                          setForm({ ...form, capabilitiesJson: newCaps })
                        }}
                      />
                      <label className="form-check-label" htmlFor={`edit-cap-${cap}`}>
                        {getCapabilityLabel(cap)}
                      </label>
                    </div>
                  )
                })}
              </div>
            </div>
            <button type="button" onClick={save} disabled={busy} className="btn btn-primary">
              {busy ? 'Saving…' : 'Save Changes'}
            </button>
          </SectionCard>
        </div>

        <div className="col-12 col-xl-6">
          <SectionCard title="KYC & Verification">
            <Field label="KYC Documents" value={`${(row.profileDetails?.documents || []).length} document(s)`} />
            <Field label="Latest Publish Request" value={row.publishRequests?.[0] ? `#${row.publishRequests[0].id} • ${row.publishRequests[0].status}` : undefined} />
            {row.profileDetails?.id && (
              <div className="mt-3">
                <Link href={`/admin/verifications/branches/${row.profileDetails.id}`} className="btn btn-sm btn-outline-primary">
                  View Verification
                </Link>
              </div>
            )}
          </SectionCard>

          {staffOverview && staffOverview.length > 0 && (
            <SectionCard title="Branch Staff (Manager View)" className="mt-3">
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr><th>User</th><th>Role</th><th>Status</th><th>Access</th><th>Last Login</th></tr>
                  </thead>
                  <tbody>
                    {staffOverview.map((m: any) => (
                      <tr key={m.memberId}>
                        <td>
                          <div className="d-flex flex-column">
                            <span>{m.user?.displayName || `User #${m.userId}`}</span>
                            <span className="text-secondary small">{m.user?.email || m.user?.phone || m.user?.username || '—'}</span>
                          </div>
                        </td>
                        <td><StatusChip status={m.role || '—'} /></td>
                        <td><StatusChip status={m.status} /></td>
                        <td>{m.branchAccess ? <StatusChip status={m.branchAccess.status} /> : <span className="text-secondary small">—</span>}</td>
                        <td className="text-secondary small">{m.branchAccess?.lastLoginAt ? new Date(m.branchAccess.lastLoginAt).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          <SectionCard title="Staff roster" className="mt-3">
            {(() => {
              const members = row.members ?? [];
              return members.length > 0 ? (
              <div className="d-flex flex-column gap-2">
                {members.map((m) => (
                  <div key={m.id} className="d-flex align-items-center justify-content-between p-2 border rounded">
                    <div>
                      <div className="fw-semibold">{m.user?.profile?.displayName ?? `User #${m.userId}`}</div>
                      <div className="text-secondary small">{m.user?.auth?.phone ?? m.user?.auth?.email ?? '—'}</div>
                    </div>
                    <div className="d-flex gap-1">
                      {(m.roles || []).map((r) => (
                        <span key={r.roleId} className="badge bg-secondary">{r.role?.key ?? ''}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-secondary small">No staff assigned.</div>
            );
            })()}
          </SectionCard>
        </div>
      </div>
    </AdminPageShell>
  )
}
