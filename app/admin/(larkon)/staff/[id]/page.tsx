'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { apiGet } from '@/lib/api'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import SectionCard from '@/src/bpa/admin/components/SectionCard'
import StatCard from '@/src/bpa/admin/components/StatCard'
import StatusChip from '@/src/bpa/admin/components/StatusChip'

type StaffRecord = {
  id: number
  userId?: number
  role?: string
  status?: string
  createdAt?: string
  updatedAt?: string
  user?: { profile?: { displayName?: string; username?: string }; auth?: { email?: string; phone?: string } }
  org?: { name?: string }
  branch?: { name?: string }
  roles?: { key?: string; label?: string; scope?: string }[]
}

type PerformanceRecord = {
  totalOrders?: number
  totalRevenue?: number
  avgOrderValue?: number
}

function formatDate(dateString: string | undefined) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminStaffDetailPage() {
  const params = useParams()
  const id = params?.id as string | undefined
  const [staff, setStaff] = useState<StaffRecord | null>(null)
  const [performance, setPerformance] = useState<PerformanceRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const [staffRes, perfRes] = await Promise.all([
        apiGet<{ data?: StaffRecord }>(`/api/v1/admin/staff/${id}`),
        apiGet<{ data?: PerformanceRecord }>(`/api/v1/admin/staff/${id}/performance`).catch(() => null),
      ])
      setStaff(staffRes?.data ?? null)
      setPerformance(perfRes?.data ?? null)
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to load staff data')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const displayName = useMemo(() => {
    if (!staff) return '…'
    return staff.user?.profile?.displayName ?? staff.user?.profile?.username ?? `Staff #${staff.id}`
  }, [staff])

  if (loading && !staff) {
    return (
      <AdminPageShell title="Staff" breadcrumbs={[{ label: 'Staff', href: '/admin/staff' }, { label: '…' }]}>
        <div className="text-secondary">Loading…</div>
      </AdminPageShell>
    )
  }

  if (error || !staff) {
    return (
      <AdminPageShell title="Staff" breadcrumbs={[{ label: 'Staff', href: '/admin/staff' }, { label: 'Error' }]}>
        <div className="alert alert-danger">{error || 'Staff member not found'}</div>
        <Link href="/admin/staff" className="btn btn-outline-primary">
          <Icon icon="solar:arrow-left-outline" className="me-2" />
          Back to Staff List
        </Link>
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell
      title={displayName}
      breadcrumbs={[
        { label: 'Staff', href: '/admin/staff' },
        { label: `#${staff.id}` },
      ]}
      actions={
        <div className="d-flex gap-2">
          <Link href="/admin/staff" className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2">
            <Icon icon="solar:arrow-left-outline" />
            Back to List
          </Link>
          <button type="button" onClick={load} disabled={loading} className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2">
            <Icon icon="solar:refresh-outline" />
            Refresh
          </button>
        </div>
      }
    >
      <p className="text-secondary mb-3" style={{ fontSize: 13 }}>
        Staff #{staff.id} • {staff.role ?? 'No role'}
      </p>

      {error ? <div className="alert alert-danger mb-3">{error}</div> : null}

      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6 col-lg-3">
          <StatCard
            title="Status"
            value={<StatusChip status={staff.status} />}
            subtitle={`Role: ${staff.role ?? 'N/A'}`}
            icon={<Icon icon="solar:user-check-rounded-outline" width={20} />}
            tone="primary"
          />
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <StatCard
            title="Total Orders"
            value={performance?.totalOrders ?? 0}
            subtitle="All time"
            icon={<Icon icon="solar:cart-outline" width={20} />}
            tone="success"
          />
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <StatCard
            title="Total Revenue"
            value={performance?.totalRevenue != null ? `৳${(performance.totalRevenue / 1000).toFixed(1)}K` : '৳0'}
            subtitle={`Avg: ৳${performance?.avgOrderValue ?? 0}`}
            icon={<Icon icon="solar:wallet-money-outline" width={20} />}
            tone="info"
          />
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <StatCard
            title="Assigned Roles"
            value={staff.roles?.length ?? 0}
            subtitle={staff.roles?.map((r) => r.key || r.label).join(', ') || 'None'}
            icon={<Icon icon="solar:user-id-outline" width={20} />}
            tone="warning"
          />
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-4">
          <SectionCard title="Staff Information">
            <div className="d-flex flex-column gap-3">
              <div>
                <div className="text-secondary mb-1" style={{ fontSize: 12 }}>Full Name</div>
                <div className="fw-semibold">{displayName}</div>
              </div>
              <div>
                <div className="text-secondary mb-1" style={{ fontSize: 12 }}>Email</div>
                <div>{staff.user?.auth?.email ?? '—'}</div>
              </div>
              <div>
                <div className="text-secondary mb-1" style={{ fontSize: 12 }}>Phone</div>
                <div>{staff.user?.auth?.phone ?? '—'}</div>
              </div>
              <div>
                <div className="text-secondary mb-1" style={{ fontSize: 12 }}>User ID</div>
                <div>#{staff.userId}</div>
              </div>
              <div>
                <div className="text-secondary mb-1" style={{ fontSize: 12 }}>Organization</div>
                <div>{staff.org?.name ?? '—'}</div>
              </div>
              <div>
                <div className="text-secondary mb-1" style={{ fontSize: 12 }}>Branch</div>
                <div>{staff.branch?.name ?? '—'}</div>
              </div>
              <div>
                <div className="text-secondary mb-1" style={{ fontSize: 12 }}>Role</div>
                <div><StatusChip status={staff.role ?? '—'} /></div>
              </div>
              <div>
                <div className="text-secondary mb-1" style={{ fontSize: 12 }}>Status</div>
                <div><StatusChip status={staff.status} /></div>
              </div>
              {staff.createdAt && (
                <div>
                  <div className="text-secondary mb-1" style={{ fontSize: 12 }}>Created</div>
                  <div>{formatDate(staff.createdAt)}</div>
                </div>
              )}
              {staff.updatedAt && (
                <div>
                  <div className="text-secondary mb-1" style={{ fontSize: 12 }}>Last Updated</div>
                  <div>{formatDate(staff.updatedAt)}</div>
                </div>
              )}
            </div>
          </SectionCard>

          {staff.roles && staff.roles.length > 0 && (
            <SectionCard title="Assigned Roles" className="mt-3">
              <div className="d-flex flex-column gap-2">
                {staff.roles.map((role, idx) => (
                  <div key={idx} className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-semibold">{role.key ?? role.label}</div>
                      {role.scope && <div className="text-secondary" style={{ fontSize: 12 }}>Scope: {role.scope}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        <div className="col-12 col-lg-8">
          <SectionCard title="Recent Activity">
            <div className="text-secondary text-center py-4">No recent activity</div>
          </SectionCard>
        </div>
      </div>
    </AdminPageShell>
  )
}
