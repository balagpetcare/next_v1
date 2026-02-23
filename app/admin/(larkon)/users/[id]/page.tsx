'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { apiGet, apiPatch, apiPost } from '@/lib/api'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import SectionCard from '@/src/bpa/admin/components/SectionCard'
import StatusChip from '@/src/bpa/admin/components/StatusChip'
import { adminToast } from '@/src/bpa/admin/lib/adminToast'

const TABS = [
  { key: 'account', label: 'Account' },
  { key: 'linked', label: 'Linked entities' },
  { key: 'activity', label: 'Activity' },
  { key: 'flags', label: 'Flags' },
  { key: 'notes', label: 'Notes' },
  { key: 'audit', label: 'Audit' },
] as const

type UserRecord = {
  id: number
  displayName?: string
  username?: string
  email?: string
  phone?: string
  status?: string
  provider?: string
  createdAt?: string
  updatedAt?: string
  ownerKyc?: { id: number; verificationStatus?: string }
  organizations?: { id: number; name?: string; status?: string }[]
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="d-flex justify-content-between gap-3 py-1" style={{ fontSize: 13 }}>
      <div className="text-secondary" style={{ minWidth: 140 }}>{label}</div>
      <div className="text-end" style={{ fontWeight: 600 }}>{value != null && value !== '' ? String(value) : '—'}</div>
    </div>
  )
}

export default function AdminUserDetailPage() {
  const params = useParams()
  const id = params?.id as string | undefined
  const [user, setUser] = useState<UserRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<typeof TABS[number]['key']>('account')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const r = await apiGet<{ data?: UserRecord }>(`/api/v1/admin/users/${id}`)
      setUser(r?.data ?? null)
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return
    try {
      await apiPatch(`/api/v1/admin/users/${id}`, { status: newStatus })
      adminToast.success('Status updated')
      load()
    } catch (e) {
      adminToast.error((e as Error)?.message ?? 'Failed to update')
    }
  }

  const handleForceLogout = async () => {
    if (!id) return
    try {
      await apiPost(`/api/v1/admin/users/${id}/force-logout`, {})
      adminToast.success('Sessions revoked')
      load()
    } catch (e) {
      adminToast.error((e as Error)?.message ?? 'Force logout failed')
    }
  }

  if (loading && !user) {
    return (
      <AdminPageShell title="User" breadcrumbs={[{ label: 'Users', href: '/admin/users' }, { label: '…' }]}>
        <div className="text-secondary">Loading…</div>
      </AdminPageShell>
    )
  }
  if (error) {
    return (
      <AdminPageShell title="User" breadcrumbs={[{ label: 'Users', href: '/admin/users' }, { label: 'Error' }]}>
        <div className="alert alert-danger" role="alert">{error}</div>
        <Link href="/admin/users" className="btn btn-outline-secondary btn-sm mt-2">← Back to Users</Link>
      </AdminPageShell>
    )
  }
  if (!user) {
    return (
      <AdminPageShell title="User" breadcrumbs={[{ label: 'Users', href: '/admin/users' }, { label: 'Not found' }]}>
        <div className="text-secondary">User not found.</div>
        <Link href="/admin/users" className="btn btn-outline-secondary btn-sm mt-2">← Back to Users</Link>
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell
      title="User Profile"
      breadcrumbs={[
        { label: 'Users', href: '/admin/users' },
        { label: `#${user.id}` },
      ]}
      actions={
        <div className="d-flex gap-2 flex-wrap">
          {user.status !== 'ACTIVE' && (
            <button type="button" className="btn btn-success btn-sm" onClick={() => handleStatusChange('ACTIVE')}>
              <Icon icon="solar:check-circle-bold" /> Activate
            </button>
          )}
          {user.status !== 'BLOCKED' && (
            <button type="button" className="btn btn-warning btn-sm" onClick={() => handleStatusChange('BLOCKED')}>
              <Icon icon="solar:ban-bold" /> Block
            </button>
          )}
          <button type="button" className="btn btn-outline-danger btn-sm" onClick={handleForceLogout}>
            <Icon icon="solar:logout-2-bold" /> Force logout
          </button>
          <Link href="/admin/users" className="btn btn-outline-secondary btn-sm">← Back</Link>
        </div>
      }
    >
      <p className="text-secondary mb-3" style={{ fontSize: 13 }}>
        User #{user.id} • <StatusChip status={user.status} />
      </p>

      <div className="d-flex gap-2 mb-3 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`btn btn-sm ${activeTab === t.key ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-12">
          {activeTab === 'account' && (
            <SectionCard title="Account">
              <div className="row">
                <div className="col-12 col-md-6">
                  <Field label="User ID" value={user.id} />
                  <Field label="Display Name" value={user.displayName} />
                  <Field label="Username" value={user.username} />
                  <Field label="Email" value={user.email} />
                  <Field label="Phone" value={user.phone} />
                </div>
                <div className="col-12 col-md-6">
                  <Field label="Provider" value={user.provider || 'LOCAL'} />
                  <Field label="Status" value={user.status} />
                  <Field label="Created" value={user.createdAt ? new Date(user.createdAt).toLocaleString() : undefined} />
                  <Field label="Updated" value={user.updatedAt ? new Date(user.updatedAt).toLocaleString() : undefined} />
                </div>
              </div>
            </SectionCard>
          )}

          {activeTab === 'linked' && (
            <SectionCard title="Linked entities">
              {user.ownerKyc && (
                <div className="mb-3">
                  <div className="fw-semibold mb-2">Owner KYC</div>
                  <StatusChip status={user.ownerKyc.verificationStatus} />
                  <Link href={`/admin/verifications/owners/${user.ownerKyc.id}`} className="btn btn-sm btn-outline-primary ms-2">
                    View KYC
                  </Link>
                </div>
              )}
              {user.organizations && user.organizations.length > 0 ? (
                <div>
                  <div className="fw-semibold mb-2">Organizations ({user.organizations.length})</div>
                  {user.organizations.map((org) => (
                    <div key={org.id} className="d-flex align-items-center gap-2 mb-2 p-2 border rounded">
                      <span>{org.name}</span>
                      <StatusChip status={org.status} />
                      <Link href={`/admin/organizations/${org.id}`} className="btn btn-sm btn-outline-secondary">
                        View
                      </Link>
                    </div>
                  ))}
                </div>
              ) : !user.ownerKyc ? (
                <div className="text-secondary">No linked entities.</div>
              ) : null}
            </SectionCard>
          )}

          {activeTab === 'activity' && (
            <SectionCard title="Activity">
              <div className="text-secondary">Activity summary not yet available. Use Audit tab for history.</div>
            </SectionCard>
          )}

          {activeTab === 'flags' && (
            <SectionCard title="Flags">
              <div className="text-secondary">No flags.</div>
            </SectionCard>
          )}

          {activeTab === 'notes' && (
            <SectionCard title="Notes">
              <div className="text-secondary">Internal notes not yet available.</div>
            </SectionCard>
          )}

          {activeTab === 'audit' && (
            <SectionCard title="Audit">
              <Link href={`/admin/audit?actor=${user.id}`} className="btn btn-primary">
                <Icon icon="solar:clipboard-list-bold" className="me-2" />
                View audit log for this user
              </Link>
            </SectionCard>
          )}
        </div>
      </div>
    </AdminPageShell>
  )
}
