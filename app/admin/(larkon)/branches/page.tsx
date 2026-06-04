'use client'

import { apiGet, apiPost } from '@/lib/api'
import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { Card, Modal } from 'react-bootstrap'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import AdminFiltersBar from '@/src/bpa/admin/components/AdminFiltersBar'
import StatCard from '@/src/bpa/admin/components/StatCard'
import StatusChip from '@/src/bpa/admin/components/StatusChip'
import LoadingSkeleton from '@/src/bpa/admin/components/LoadingSkeleton'
import { PaginationBar } from '@/src/components/common/PaginationBar'
import { useAdminFilters } from '@/src/bpa/admin/hooks/useAdminFilters'
import { adminToast } from '@/src/bpa/admin/lib/adminToast'
import {
  type AdminBranchListRow,
  resolveBranchLifecycleStatus,
  computeBranchKpis,
  listEnabledCapabilityKeys,
  getCapabilityLabel,
  formatBranchAddressSummary,
} from '@/src/bpa/admin/lib/branchAdmin'

const ITEMS_PER_PAGE = 50

export default function AdminBranchesPage() {
  const { search, setSearch, filters, setFilter, reset } = useAdminFilters({ status: '', orgId: '' })
  
  const [items, setItems] = useState<AdminBranchListRow[]>([])
  const [orgs, setOrgs] = useState<Array<{ id: number; name: string }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Create form state
  const [createForm, setCreateForm] = useState({
    orgId: '',
    name: '',
    code: '',
    address: '',
    capabilities: [] as string[],
  })
  const [createLoading, setCreateLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      if (filters.status) params.set('status', filters.status)
      if (filters.orgId) params.set('orgId', filters.orgId)
      
      const res = await apiGet<{ data?: AdminBranchListRow[] }>(`/api/v1/admin/branches?${params}`)
      setItems(res?.data ?? [])
      setPage(1)
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to load branches')
    } finally {
      setLoading(false)
    }
  }, [search, filters])

  const loadOrgs = useCallback(async () => {
    try {
      const res = await apiGet<{ data?: Array<{ id: number; name: string }> }>('/api/v1/admin/organizations')
      setOrgs(res?.data ?? [])
    } catch {
      setOrgs([])
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    loadOrgs()
  }, [loadOrgs])

  const kpis = useMemo(() => computeBranchKpis(items), [items])

  // Client-side pagination
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE)
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE
    return items.slice(start, start + ITEMS_PER_PAGE)
  }, [items, page])

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!createForm.orgId || !createForm.name.trim()) {
      adminToast.error('Organization and name are required')
      return
    }

    setCreateLoading(true)
    try {
      const capabilitiesJson: Record<string, boolean> = {}
      createForm.capabilities.forEach(cap => {
        capabilitiesJson[cap] = true
      })

      await apiPost('/api/v1/admin/branches', {
        orgId: Number(createForm.orgId),
        name: createForm.name.trim(),
        code: createForm.code.trim() || undefined,
        address: createForm.address.trim() || undefined,
        capabilitiesJson,
      })
      
      adminToast.success('Branch created successfully')
      setShowCreateModal(false)
      setCreateForm({ orgId: '', name: '', code: '', address: '', capabilities: [] })
      await load()
    } catch (e) {
      const msg = (e as Error)?.message ?? 'Failed to create branch'
      adminToast.error(msg)
    } finally {
      setCreateLoading(false)
    }
  }

  const toggleCapability = (cap: string) => {
    setCreateForm(prev => ({
      ...prev,
      capabilities: prev.capabilities.includes(cap)
        ? prev.capabilities.filter(c => c !== cap)
        : [...prev.capabilities, cap],
    }))
  }

  return (
    <AdminPageShell
      title="Branch Management Center"
      breadcrumbs={[{ label: 'Organization & Branches' }, { label: 'Branches' }]}
      actions={
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={load}
            disabled={loading}
          >
            <Icon icon="solar:refresh-bold" className="me-1" />
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowCreateModal(true)}
          >
            <Icon icon="solar:add-circle-bold" className="me-1" />
            Create Branch
          </button>
        </div>
      }
    >
      <p className="text-muted mb-3 small">
        Manage branches across all organizations: view status, capabilities, and organization assignments.
      </p>

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-lg-4 col-xl-2">
          <StatCard
            title="Total Branches"
            value={kpis.total}
            icon={<Icon icon="solar:buildings-3-bold" />}
            tone="primary"
          />
        </div>
        <div className="col-12 col-sm-6 col-lg-4 col-xl-2">
          <StatCard
            title="Active"
            value={kpis.active}
            icon={<Icon icon="solar:check-circle-bold" />}
            tone="success"
          />
        </div>
        <div className="col-12 col-sm-6 col-lg-4 col-xl-2">
          <StatCard
            title="Inactive"
            value={kpis.inactive}
            icon={<Icon icon="solar:close-circle-bold" />}
            tone="secondary"
          />
        </div>
        <div className="col-12 col-sm-6 col-lg-4 col-xl-2">
          <StatCard
            title="Clinic-Enabled"
            value={kpis.clinic}
            icon={<Icon icon="solar:health-bold" />}
            tone="info"
          />
        </div>
        <div className="col-12 col-sm-6 col-lg-4 col-xl-2">
          <StatCard
            title="Shop-Enabled"
            value={kpis.shop}
            icon={<Icon icon="solar:shop-bold" />}
            tone="warning"
          />
        </div>
        <div className="col-12 col-sm-6 col-lg-4 col-xl-2">
          <StatCard
            title="Online Sales"
            value={kpis.onlineSales}
            icon={<Icon icon="solar:cart-large-4-bold" />}
            tone="success"
          />
        </div>
      </div>

      {/* Filters */}
      <AdminFiltersBar
        searchPlaceholder="Search by name, org, code, or ID..."
        searchValue={search}
        onSearchChange={setSearch}
        filterValues={filters}
        onFilterChange={setFilter}
        onReset={reset}
        filters={[
          {
            key: 'status',
            label: 'Status',
            render: (value, onChange) => (
              <select
                id="admin-filter-status"
                className="form-select form-select-sm"
                style={{ minWidth: 140 }}
                value={value}
                onChange={(e) => onChange(e.target.value)}
              >
                <option value="">All</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="DRAFT">Draft</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            ),
          },
          {
            key: 'orgId',
            label: 'Organization',
            render: (value, onChange) => (
              <select
                id="admin-filter-orgId"
                className="form-select form-select-sm"
                style={{ minWidth: 180 }}
                value={value}
                onChange={(e) => onChange(e.target.value)}
              >
                <option value="">All Organizations</option>
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            ),
          },
        ]}
      />

      {error && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <LoadingSkeleton rows={8} />
      ) : items.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-5">
            <Icon icon="solar:buildings-3-bold-duotone" className="text-muted mb-3" style={{ fontSize: 64 }} />
            <h5 className="text-muted mb-2">No branches found</h5>
            <p className="text-secondary small mb-3">
              {search || filters.status || filters.orgId
                ? 'Try adjusting your filters'
                : 'Create your first branch to get started'}
            </p>
            {!search && !filters.status && !filters.orgId && (
              <button type="button" className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                <Icon icon="solar:add-circle-bold" className="me-1" />
                Create Branch
              </button>
            )}
          </Card.Body>
        </Card>
      ) : (
        <>
          <Card>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <table className="table align-middle table-hover mb-0">
                  <thead className="bg-light-subtle">
                    <tr>
                      <th>Name</th>
                      <th>Code</th>
                      <th>Organization</th>
                      <th>Address</th>
                      <th>Capabilities</th>
                      <th>Status</th>
                      <th>Updated</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.map((branch) => {
                      const statusInfo = resolveBranchLifecycleStatus(branch.status)
                      const capKeys = listEnabledCapabilityKeys(branch.capabilitiesJson)
                      
                      return (
                        <tr key={branch.id}>
                          <td>
                            <div className="fw-semibold">{branch.name}</div>
                            <div className="text-muted small">ID: {branch.id}</div>
                          </td>
                          <td>
                            {branch.code ? (
                              <code className="small">{branch.code}</code>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td>
                            {branch.org ? (
                              <div>
                                <div className="small">{branch.org.name}</div>
                                <div className="text-muted" style={{ fontSize: 11 }}>
                                  Org #{branch.org.id}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td>
                            <span className="small">{formatBranchAddressSummary(branch)}</span>
                          </td>
                          <td>
                            {capKeys.length > 0 ? (
                              <div className="d-flex flex-wrap gap-1">
                                {capKeys.map((key) => (
                                  <span key={key} className="badge bg-light text-dark border">
                                    {getCapabilityLabel(key)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted small">None</span>
                            )}
                          </td>
                          <td>
                            <StatusChip status={branch.status} variant={statusInfo.variant} />
                          </td>
                          <td>
                            <span className="text-muted small">
                              {branch.updatedAt
                                ? new Date(branch.updatedAt).toLocaleDateString()
                                : '—'}
                            </span>
                          </td>
                          <td>
                            <Link
                              href={`/admin/branches/${branch.id}`}
                              className="btn btn-sm btn-outline-primary"
                            >
                              <Icon icon="solar:eye-bold" className="me-1" />
                              View
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card.Body>
          </Card>

          {totalPages > 1 && (
            <div className="mt-3">
              <PaginationBar
                page={page}
                pageSize={ITEMS_PER_PAGE}
                total={items.length}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      {/* Create Branch Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Create New Branch</Modal.Title>
        </Modal.Header>
        <form onSubmit={handleCreateSubmit}>
          <Modal.Body>
            <div className="mb-3">
              <label htmlFor="create-org" className="form-label">
                Organization <span className="text-danger">*</span>
              </label>
              <select
                id="create-org"
                className="form-select"
                value={createForm.orgId}
                onChange={(e) => setCreateForm({ ...createForm, orgId: e.target.value })}
                required
              >
                <option value="">Select organization...</option>
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} (ID: {org.id})
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label htmlFor="create-name" className="form-label">
                Branch Name <span className="text-danger">*</span>
              </label>
              <input
                id="create-name"
                type="text"
                className="form-control"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g. Dhaka Main Branch"
                required
              />
            </div>

            <div className="mb-3">
              <label htmlFor="create-code" className="form-label">
                Branch Code
              </label>
              <input
                id="create-code"
                type="text"
                className="form-control"
                value={createForm.code}
                onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                placeholder="e.g. DHK-01 (optional, must be unique per org)"
              />
              <div className="form-text">Optional. Unique identifier within the organization.</div>
            </div>

            <div className="mb-3">
              <label htmlFor="create-address" className="form-label">
                Address
              </label>
              <input
                id="create-address"
                type="text"
                className="form-control"
                value={createForm.address}
                onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                placeholder="e.g. 123 Main Street, Dhaka"
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Capabilities</label>
              <div className="d-flex flex-wrap gap-2">
                {['clinic', 'shop', 'online_sales', 'delivery_hub', 'hq_warehouse'].map((cap) => (
                  <div key={cap} className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id={`cap-${cap}`}
                      checked={createForm.capabilities.includes(cap)}
                      onChange={() => toggleCapability(cap)}
                    />
                    <label className="form-check-label" htmlFor={`cap-${cap}`}>
                      {getCapabilityLabel(cap)}
                    </label>
                  </div>
                ))}
              </div>
              <div className="form-text">Select the capabilities this branch will support.</div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowCreateModal(false)}
              disabled={createLoading}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={createLoading}>
              {createLoading ? 'Creating...' : 'Create Branch'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>
    </AdminPageShell>
  )
}
