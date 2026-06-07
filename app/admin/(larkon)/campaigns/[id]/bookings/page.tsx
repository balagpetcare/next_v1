'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import DataTable from '@/src/bpa/admin/components/DataTable'
import ErrorState from '@/src/bpa/admin/components/ErrorState'
import CampaignStatusBadge from '@/src/bpa/campaign/admin/CampaignStatusBadge'
import { PaginationBar } from '@/src/components/common/PaginationBar'
import CampaignExportButtons from '@/src/bpa/campaign/admin/CampaignExportButtons'
import {
  campaignAdminBookings,
  campaignAdminBookingFilterOptions,
  campaignAdminExportBookings,
  formatCampaignBookingLocation,
  type CampaignBookingFilterOptions,
  type CampaignBookingListParams,
  type CampaignBookingListSummary,
  type CampaignBookingRow,
  type CampaignExportFormat,
} from '@/lib/campaignApi'
import { normalizeBangladeshPhone } from '@/lib/phone'

const PAGE_SIZE = 20

type FilterState = {
  status: string
  cityCorporation: string
  area: string
  coverageZone: string
  bookingMode: string
  paymentStatus: string
  petCountMin: string
  petCountMax: string
  dateFrom: string
  dateTo: string
  phone: string
  reference: string
}

const EMPTY_FILTERS: FilterState = {
  status: '',
  cityCorporation: '',
  area: '',
  coverageZone: '',
  bookingMode: '',
  paymentStatus: '',
  petCountMin: '',
  petCountMax: '',
  dateFrom: '',
  dateTo: '',
  phone: '',
  reference: '',
}

function maskPhone(phone: string) {
  if (!phone || phone.length < 6) return phone
  return `${phone.slice(0, 5)}***${phone.slice(-3)}`
}

function filtersFromSearchParams(sp: URLSearchParams): FilterState {
  return {
    status: sp.get('status') ?? '',
    cityCorporation: sp.get('cityCorporation') ?? sp.get('city') ?? '',
    area: sp.get('area') ?? '',
    coverageZone: sp.get('coverageZone') ?? '',
    bookingMode: sp.get('bookingMode') ?? '',
    paymentStatus: sp.get('paymentStatus') ?? '',
    petCountMin: sp.get('petCountMin') ?? '',
    petCountMax: sp.get('petCountMax') ?? '',
    dateFrom: sp.get('dateFrom') ?? '',
    dateTo: sp.get('dateTo') ?? '',
    phone: sp.get('phone') ?? '',
    reference: sp.get('reference') ?? '',
  }
}

function buildListParams(
  filters: FilterState,
  page: number
): CampaignBookingListParams {
  const params: CampaignBookingListParams = { page, pageSize: PAGE_SIZE }
  if (filters.status) params.status = filters.status
  if (filters.cityCorporation) params.cityCorporation = filters.cityCorporation
  if (filters.area) params.area = filters.area
  if (filters.coverageZone) params.coverageZone = filters.coverageZone
  if (filters.bookingMode) params.bookingMode = filters.bookingMode
  if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus
  if (filters.dateFrom) params.dateFrom = filters.dateFrom
  if (filters.dateTo) params.dateTo = filters.dateTo
  if (filters.phone.trim()) {
    const normalized = normalizeBangladeshPhone(filters.phone.trim())
    params.phone = normalized || filters.phone.trim()
  }
  if (filters.reference.trim()) params.reference = filters.reference.trim()
  if (filters.petCountMin !== '') params.petCountMin = Number(filters.petCountMin)
  if (filters.petCountMax !== '') params.petCountMax = Number(filters.petCountMax)
  return params
}

function filtersToQueryString(filters: FilterState, page: number): string {
  const sp = new URLSearchParams()
  if (page > 1) sp.set('page', String(page))
  for (const [key, value] of Object.entries(filters)) {
    if (value) sp.set(key, value)
  }
  const qs = sp.toString()
  return qs ? `?${qs}` : ''
}

function SummaryCards({ summary }: { summary: CampaignBookingListSummary | null }) {
  if (!summary) return null
  const filtered =
    summary.filteredBookings !== summary.totalBookings ||
    summary.filteredPets !== summary.totalPets

  return (
    <div className="row g-3 mb-3">
      <div className="col-md-6 col-lg-3">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body py-3">
            <div className="text-muted small">Total bookings</div>
            <div className="fs-4 fw-semibold">{summary.totalBookings}</div>
          </div>
        </div>
      </div>
      <div className="col-md-6 col-lg-3">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body py-3">
            <div className="text-muted small">Total pets</div>
            <div className="fs-4 fw-semibold">{summary.totalPets}</div>
          </div>
        </div>
      </div>
      {filtered ? (
        <>
          <div className="col-md-6 col-lg-3">
            <div className="card border-0 shadow-sm h-100 border-primary border-opacity-25">
              <div className="card-body py-3">
                <div className="text-muted small">Filtered bookings</div>
                <div className="fs-4 fw-semibold text-primary">{summary.filteredBookings}</div>
              </div>
            </div>
          </div>
          <div className="col-md-6 col-lg-3">
            <div className="card border-0 shadow-sm h-100 border-primary border-opacity-25">
              <div className="card-body py-3">
                <div className="text-muted small">Filtered pets</div>
                <div className="fs-4 fw-semibold text-primary">{summary.filteredPets}</div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

export default function AdminCampaignBookingsPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const campaignId = Number(params?.id)

  const [items, setItems] = useState<CampaignBookingRow[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [summary, setSummary] = useState<CampaignBookingListSummary | null>(null)
  const [filterOptions, setFilterOptions] = useState<CampaignBookingFilterOptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1)
  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams])

  const listParams = useMemo(() => buildListParams(filters, page), [filters, page])

  const syncUrl = useCallback(
    (nextFilters: FilterState, nextPage = 1) => {
      const qs = filtersToQueryString(nextFilters, nextPage)
      router.replace(`/admin/campaigns/${campaignId}/bookings${qs}`, { scroll: false })
    },
    [router, campaignId]
  )

  const load = useCallback(async () => {
    if (!Number.isFinite(campaignId)) return
    setLoading(true)
    setError('')
    try {
      const res = await campaignAdminBookings(campaignId, listParams)
      setItems(res.items ?? [])
      setTotal(res.total ?? 0)
      setTotalPages(res.totalPages ?? 1)
      setSummary(res.summary ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load bookings')
      setItems([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [campaignId, listParams])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!Number.isFinite(campaignId)) return
    campaignAdminBookingFilterOptions(campaignId)
      .then(setFilterOptions)
      .catch(() => setFilterOptions(null))
  }, [campaignId])

  const patchFilter = (patch: Partial<FilterState>) => {
    syncUrl({ ...filters, ...patch }, 1)
  }

  const resetFilters = () => {
    syncUrl(EMPTY_FILTERS, 1)
  }

  const columns = [
    {
      key: 'ref',
      label: 'Reference',
      render: (r: CampaignBookingRow) => <span className="font-monospace small">{r.bookingRef}</span>,
    },
    { key: 'owner', label: 'Owner', render: (r: CampaignBookingRow) => r.ownerName },
    { key: 'phone', label: 'Phone', render: (r: CampaignBookingRow) => maskPhone(r.ownerPhone) },
    {
      key: 'pets',
      label: 'Pets',
      render: (r: CampaignBookingRow) => r.pets?.length ?? r.petCount ?? '—',
    },
    {
      key: 'location',
      label: 'Location',
      render: (r: CampaignBookingRow) => formatCampaignBookingLocation(r),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r: CampaignBookingRow) => <CampaignStatusBadge status={r.status} />,
    },
  ]

  return (
    <AdminPageShell title="Bookings" breadcrumbs={[{ label: 'Campaigns', href: '/admin/campaigns' }, { label: 'Bookings' }]}>
      <SummaryCards summary={summary} />

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-md-3 col-lg-2">
              <label className="form-label small mb-1">Status</label>
              <select
                className="form-select form-select-sm"
                value={filters.status}
                onChange={(e) => patchFilter({ status: e.target.value })}
              >
                <option value="">All</option>
                <option value="PENDING_ASSIGNMENT">Pending assignment</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CHECKED_IN">Checked in</option>
                <option value="COMPLETED">Completed</option>
                <option value="NO_SHOW">No show</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div className="col-md-3 col-lg-2">
              <label className="form-label small mb-1">City Corporation</label>
              <select
                className="form-select form-select-sm"
                value={filters.cityCorporation}
                onChange={(e) => patchFilter({ cityCorporation: e.target.value })}
              >
                <option value="">All</option>
                {(filterOptions?.cityCorporations ?? ['DNCC', 'DSCC']).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3 col-lg-2">
              <label className="form-label small mb-1">Area</label>
              <select
                className="form-select form-select-sm"
                value={filters.area}
                onChange={(e) => patchFilter({ area: e.target.value })}
              >
                <option value="">All</option>
                {(filterOptions?.areas ?? []).map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3 col-lg-2">
              <label className="form-label small mb-1">Coverage zone</label>
              <select
                className="form-select form-select-sm"
                value={filters.coverageZone}
                onChange={(e) => patchFilter({ coverageZone: e.target.value })}
              >
                <option value="">All</option>
                {(filterOptions?.coverageZones ?? []).map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3 col-lg-2">
              <label className="form-label small mb-1">Booking mode</label>
              <select
                className="form-select form-select-sm"
                value={filters.bookingMode}
                onChange={(e) => patchFilter({ bookingMode: e.target.value })}
              >
                <option value="">All</option>
                <option value="ZONE_INTEREST">Zone interest</option>
                <option value="VENUE">Venue</option>
              </select>
            </div>
            <div className="col-md-3 col-lg-2">
              <label className="form-label small mb-1">Payment status</label>
              <select
                className="form-select form-select-sm"
                value={filters.paymentStatus}
                onChange={(e) => patchFilter({ paymentStatus: e.target.value })}
              >
                <option value="">All</option>
                {(filterOptions?.paymentStatuses ?? []).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2 col-lg-1">
              <label className="form-label small mb-1">Pets min</label>
              <input
                type="number"
                min={1}
                className="form-control form-control-sm"
                value={filters.petCountMin}
                onChange={(e) => patchFilter({ petCountMin: e.target.value })}
              />
            </div>
            <div className="col-md-2 col-lg-1">
              <label className="form-label small mb-1">Pets max</label>
              <input
                type="number"
                min={1}
                className="form-control form-control-sm"
                value={filters.petCountMax}
                onChange={(e) => patchFilter({ petCountMax: e.target.value })}
              />
            </div>
            <div className="col-md-3 col-lg-2">
              <label className="form-label small mb-1">Date from</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filters.dateFrom}
                onChange={(e) => patchFilter({ dateFrom: e.target.value })}
              />
            </div>
            <div className="col-md-3 col-lg-2">
              <label className="form-label small mb-1">Date to</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filters.dateTo}
                onChange={(e) => patchFilter({ dateTo: e.target.value })}
              />
            </div>
            <div className="col-md-3 col-lg-2">
              <label className="form-label small mb-1">Phone</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="01XXXXXXXXX"
                value={filters.phone}
                onChange={(e) => patchFilter({ phone: e.target.value })}
              />
            </div>
            <div className="col-md-3 col-lg-2">
              <label className="form-label small mb-1">Reference</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="VAC-..."
                value={filters.reference}
                onChange={(e) => patchFilter({ reference: e.target.value })}
              />
            </div>
            <div className="col-md-3 col-lg-2">
              <button type="button" className="btn btn-outline-secondary btn-sm w-100" onClick={resetFilters}>
                Reset filters
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-3">
        <CampaignExportButtons
          label="Export filtered bookings"
          onExport={(format: CampaignExportFormat) =>
            campaignAdminExportBookings(campaignId, format, listParams)
          }
        />
      </div>

      {error ? <ErrorState message={error} onRetry={load} /> : null}
      <DataTable columns={columns} rows={items} loading={loading} keyField="id" />
      <PaginationBar
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        totalPages={totalPages}
        onPageChange={(p) => syncUrl(filters, p)}
      />
    </AdminPageShell>
  )
}
