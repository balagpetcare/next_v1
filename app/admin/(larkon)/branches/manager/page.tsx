'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { branchManagerApi } from '@/lib/adminApi'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import SectionCard from '@/src/bpa/admin/components/SectionCard'
import StatusChip from '@/src/bpa/admin/components/StatusChip'

type ManagedBranch = {
  branchId: number
  name?: string
  orgId?: number
  features?: { pos?: boolean; appointments?: boolean }
}

export default function AdminBranchManagerPage() {
  const router = useRouter()
  const [managed, setManaged] = useState<ManagedBranch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const res = await branchManagerApi.managedBranches()
        const rows = (res as { data?: ManagedBranch[] })?.data ?? []
        if (!cancelled) {
          setManaged(Array.isArray(rows) ? rows : [])
          if (Array.isArray(rows) && rows.length === 1) {
            router.replace(`/admin/branches/${rows[0].branchId}`)
          }
        }
      } catch (e) {
        if (!cancelled) setError((e as Error)?.message ?? 'Failed to load managed branches')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [router])

  return (
    <AdminPageShell
      title="Branch Manager Dashboard"
      breadcrumbs={[
        { label: 'Branches', href: '/admin/branches' },
        { label: 'Manager' },
      ]}
      actions={
        <button
          type="button"
          className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2"
          onClick={() => window.location.reload()}
          disabled={loading}
        >
          <Icon icon="solar:refresh-outline" />
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      }
    >
      <p className="text-secondary mb-3">Select a branch to view manager controls, KPIs, and staff overview.</p>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <SectionCard
        title="Managed Branches"
        right={
          <span className="text-muted small">Branches where you are assigned as Branch Manager or Organization Owner</span>
        }
      >
        {loading && managed.length === 0 ? (
          <div className="text-muted small">Loading managed branches…</div>
        ) : null}

        {!loading && managed.length === 0 ? (
          <div className="alert alert-info mb-0">
            You are not assigned as a Branch Manager for any branch yet, or your branch access is still pending approval.
          </div>
        ) : null}

        <div className="row g-3">
          {managed.map((b) => (
            <div className="col-12 col-md-6 col-xl-4" key={b.branchId}>
              <div className="card radius-12">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h6 className="mb-1">{b.name ?? `Branch #${b.branchId}`}</h6>
                      <StatusChip status={`Org #${b.orgId}`} />
                    </div>
                    <Link href={`/admin/branches/${b.branchId}`} className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1">
                      <Icon icon="solar:arrow-right-up-bold" />
                      Open
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </AdminPageShell>
  )
}
