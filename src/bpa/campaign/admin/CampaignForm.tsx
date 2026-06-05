'use client'

import { useState } from 'react'

export type CampaignFormValues = {
  name: string
  slug: string
  description: string
  startDate: string
  endDate: string
  bookingStartAt: string
  bookingEndAt: string
  countdownEnabled: boolean
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
  pricingType: 'FREE' | 'PAID' | 'DONATION'
  priceAmount: string
  vaccineCost: string
  serviceCharge: string
  packageFeaturesText: string
  maxPetsPerBooking: number
  minAdvanceHours: number
  allowWalkIns: boolean
  walkInQuotaPercent: number
  // Config engine switches
  bookingEnabled: boolean
  onlinePaymentEnabled: boolean
  payAtVenueEnabled: boolean
  approvalRequired: boolean
  slotRequired: boolean
  autoCloseWhenFull: boolean
  showRemainingSlots: boolean
  lateBookingAllowed: boolean
  maxCapacity: number
}

const defaults: CampaignFormValues = {
  name: '',
  slug: '',
  description: '',
  startDate: '',
  endDate: '',
  bookingStartAt: '',
  bookingEndAt: '',
  countdownEnabled: false,
  status: 'DRAFT',
  pricingType: 'FREE',
  priceAmount: '0',
  vaccineCost: '0',
  serviceCharge: '0',
  packageFeaturesText: '',
  maxPetsPerBooking: 5,
  minAdvanceHours: 24,
  allowWalkIns: true,
  walkInQuotaPercent: 20,
  bookingEnabled: true,
  onlinePaymentEnabled: false,
  payAtVenueEnabled: false,
  approvalRequired: false,
  slotRequired: true,
  autoCloseWhenFull: true,
  showRemainingSlots: true,
  lateBookingAllowed: false,
  maxCapacity: 0,
}

type Props = {
  initial?: Partial<CampaignFormValues>
  submitLabel?: string
  onSubmit: (values: CampaignFormValues) => Promise<void>
  onCancel?: () => void
}

export default function CampaignForm({ initial, submitLabel = 'Save', onSubmit, onCancel }: Props) {
  const [values, setValues] = useState<CampaignFormValues>({ ...defaults, ...initial })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function patch<K extends keyof CampaignFormValues>(key: K, val: CampaignFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await onSubmit(values)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card border-0 shadow-sm">
      <div className="card-body">
        {error ? <div className="alert alert-danger">{error}</div> : null}
        <div className="row g-3">
          <div className="col-md-8">
            <label className="form-label">Campaign name *</label>
            <input
              className="form-control"
              value={values.name}
              onChange={(e) => patch('name', e.target.value)}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">URL slug *</label>
            <input
              className="form-control font-monospace"
              value={values.slug}
              onChange={(e) => patch('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              required
              disabled={!!initial?.slug}
            />
          </div>
          <div className="col-12">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              rows={3}
              value={values.description}
              onChange={(e) => patch('description', e.target.value)}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Start date *</label>
            <input
              type="date"
              className="form-control"
              value={values.startDate}
              onChange={(e) => patch('startDate', e.target.value)}
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">End date *</label>
            <input
              type="date"
              className="form-control"
              value={values.endDate}
              onChange={(e) => patch('endDate', e.target.value)}
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Booking open date</label>
            <input
              type="datetime-local"
              className="form-control"
              value={values.bookingStartAt}
              onChange={(e) => patch('bookingStartAt', e.target.value)}
            />
            <div className="form-text">Countdown starts from this backend-controlled date/time.</div>
          </div>
          <div className="col-md-6">
            <label className="form-label">Booking close date</label>
            <input
              type="datetime-local"
              className="form-control"
              value={values.bookingEndAt}
              onChange={(e) => patch('bookingEndAt', e.target.value)}
            />
            <div className="form-text">Booking CTA hides after this date/time.</div>
          </div>
          <div className="col-md-6">
            <label className="form-label">Campaign status</label>
            <select
              className="form-select"
              value={values.status}
              onChange={(e) => patch('status', e.target.value as CampaignFormValues['status'])}
            >
              {(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'] as const).map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-6 d-flex align-items-end">
            <label className="form-check mb-2">
              <input
                type="checkbox"
                className="form-check-input"
                checked={values.countdownEnabled}
                onChange={(e) => patch('countdownEnabled', e.target.checked)}
              />
              <span className="form-check-label">Enable public countdown</span>
            </label>
          </div>
          <div className="col-12">
            <label className="form-label d-block">Pricing</label>
            <div className="d-flex flex-wrap gap-3">
              {(['FREE', 'PAID', 'DONATION'] as const).map((p) => (
                <label key={p} className="form-check">
                  <input
                    type="radio"
                    className="form-check-input"
                    checked={values.pricingType === p}
                    onChange={() => patch('pricingType', p)}
                  />
                  <span className="form-check-label">{p}</span>
                </label>
              ))}
            </div>
          </div>
          {values.pricingType === 'PAID' ? (
            <>
              <div className="col-md-4">
                <label className="form-label">Vaccine cost (BDT per cat)</label>
                <input
                  type="number"
                  min={0}
                  className="form-control"
                  value={values.vaccineCost}
                  onChange={(e) => {
                    const vaccineCost = e.target.value
                    const serviceCharge = values.serviceCharge
                    const total =
                      Number(vaccineCost || 0) + Number(serviceCharge || 0)
                    patch('vaccineCost', vaccineCost)
                    patch('priceAmount', String(total))
                  }}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Service charge (BDT per cat)</label>
                <input
                  type="number"
                  min={0}
                  className="form-control"
                  value={values.serviceCharge}
                  onChange={(e) => {
                    const serviceCharge = e.target.value
                    const vaccineCost = values.vaccineCost
                    const total =
                      Number(vaccineCost || 0) + Number(serviceCharge || 0)
                    patch('serviceCharge', serviceCharge)
                    patch('priceAmount', String(total))
                  }}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Total campaign fee (BDT)</label>
                <input
                  type="number"
                  min={0}
                  className="form-control"
                  value={values.priceAmount}
                  readOnly
                  aria-readonly="true"
                />
                <div className="form-text">Auto-calculated: vaccine + service (used for checkout).</div>
              </div>
              <div className="col-12">
                <label className="form-label">Package features (landing checklist)</label>
                <textarea
                  className="form-control font-monospace"
                  rows={4}
                  value={values.packageFeaturesText}
                  onChange={(e) => patch('packageFeaturesText', e.target.value)}
                  placeholder={'Injection Administration\nSyringe & Consumables\nBPA Digital Certificate\nQR Verification'}
                />
                <div className="form-text">
                  One per line. Vaccine names are added automatically from &quot;Vaccines included&quot;.
                </div>
              </div>
            </>
          ) : null}
          <div className="col-md-4">
            <label className="form-label">Max pets per booking</label>
            <input
              type="number"
              min={1}
              max={10}
              className="form-control"
              value={values.maxPetsPerBooking}
              onChange={(e) => patch('maxPetsPerBooking', Number(e.target.value))}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Min advance (hours)</label>
            <input
              type="number"
              min={0}
              className="form-control"
              value={values.minAdvanceHours}
              onChange={(e) => patch('minAdvanceHours', Number(e.target.value))}
            />
          </div>
          <div className="col-12">
            <label className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                checked={values.allowWalkIns}
                onChange={(e) => patch('allowWalkIns', e.target.checked)}
              />
              <span className="form-check-label">Allow walk-ins</span>
            </label>
          </div>

          {/* Campaign Configuration Engine */}
          <div className="col-12 mt-4">
            <h6 className="border-bottom pb-2 mb-3">Campaign Configuration</h6>
          </div>

          <div className="col-md-6">
            <div className="form-check form-switch mb-2">
              <input className="form-check-input" type="checkbox" role="switch" id="sw-booking" checked={values.bookingEnabled} onChange={(e) => patch('bookingEnabled', e.target.checked)} />
              <label className="form-check-label" htmlFor="sw-booking">Booking Open</label>
            </div>
            <div className="form-check form-switch mb-2">
              <input className="form-check-input" type="checkbox" role="switch" id="sw-online" checked={values.onlinePaymentEnabled} onChange={(e) => patch('onlinePaymentEnabled', e.target.checked)} />
              <label className="form-check-label" htmlFor="sw-online">Online Payment</label>
            </div>
            <div className="form-check form-switch mb-2">
              <input className="form-check-input" type="checkbox" role="switch" id="sw-venue" checked={values.payAtVenueEnabled} onChange={(e) => patch('payAtVenueEnabled', e.target.checked)} />
              <label className="form-check-label" htmlFor="sw-venue">Pay At Venue</label>
            </div>
            <div className="form-check form-switch mb-2">
              <input className="form-check-input" type="checkbox" role="switch" id="sw-walkin" checked={values.allowWalkIns} onChange={(e) => patch('allowWalkIns', e.target.checked)} />
              <label className="form-check-label" htmlFor="sw-walkin">Walk-In</label>
            </div>
          </div>
          <div className="col-md-6">
            <div className="form-check form-switch mb-2">
              <input className="form-check-input" type="checkbox" role="switch" id="sw-approval" checked={values.approvalRequired} onChange={(e) => patch('approvalRequired', e.target.checked)} />
              <label className="form-check-label" htmlFor="sw-approval">Approval Required</label>
            </div>
            <div className="form-check form-switch mb-2">
              <input className="form-check-input" type="checkbox" role="switch" id="sw-slot" checked={values.slotRequired} onChange={(e) => patch('slotRequired', e.target.checked)} />
              <label className="form-check-label" htmlFor="sw-slot">Slot Required</label>
            </div>
            <div className="form-check form-switch mb-2">
              <input className="form-check-input" type="checkbox" role="switch" id="sw-autoclose" checked={values.autoCloseWhenFull} onChange={(e) => patch('autoCloseWhenFull', e.target.checked)} />
              <label className="form-check-label" htmlFor="sw-autoclose">Auto Close</label>
            </div>
            <div className="form-check form-switch mb-2">
              <input className="form-check-input" type="checkbox" role="switch" id="sw-remaining" checked={values.showRemainingSlots} onChange={(e) => patch('showRemainingSlots', e.target.checked)} />
              <label className="form-check-label" htmlFor="sw-remaining">Show Remaining Slots</label>
            </div>
          </div>

          {!values.onlinePaymentEnabled && !values.payAtVenueEnabled && values.bookingEnabled ? (
            <div className="col-12">
              <div className="alert alert-warning mb-0 small">
                Both payment options are disabled. Booking will only work for free campaigns.
              </div>
            </div>
          ) : null}

          <div className="col-md-4">
            <label className="form-label">Max Capacity (0 = unlimited)</label>
            <input type="number" min={0} className="form-control" value={values.maxCapacity} onChange={(e) => patch('maxCapacity', Number(e.target.value))} />
          </div>
        </div>
      </div>
      <div className="card-footer d-flex justify-content-end gap-2">
        {onCancel ? (
          <button type="button" className="btn btn-light" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

export function campaignFormToPayload(v: CampaignFormValues) {
  return {
    name: v.name.trim(),
    slug: v.slug.trim(),
    description: v.description.trim() || undefined,
    startDate: v.startDate,
    endDate: v.endDate,
    bookingStartAt: v.bookingStartAt || undefined,
    bookingEndAt: v.bookingEndAt || undefined,
    countdownEnabled: v.countdownEnabled,
    status: v.status,
    pricingType: v.pricingType,
    priceAmount: v.pricingType === 'PAID' ? Number(v.priceAmount) : undefined,
    vaccineCost: v.pricingType === 'PAID' ? Number(v.vaccineCost) : undefined,
    serviceCharge: v.pricingType === 'PAID' ? Number(v.serviceCharge) : undefined,
    packageFeatures:
      v.pricingType === 'PAID'
        ? v.packageFeaturesText
            .split(/\n/)
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
    maxPetsPerBooking: v.maxPetsPerBooking,
    minAdvanceHours: v.minAdvanceHours,
    allowWalkIns: v.allowWalkIns,
    walkInQuotaPercent: v.walkInQuotaPercent,
    config: {
      bookingEnabled: v.bookingEnabled,
      onlinePaymentEnabled: v.onlinePaymentEnabled,
      payAtVenueEnabled: v.payAtVenueEnabled,
      walkInAllowed: v.allowWalkIns,
      approvalRequired: v.approvalRequired,
      slotRequired: v.slotRequired,
      autoCloseWhenFull: v.autoCloseWhenFull,
      showRemainingSlots: v.showRemainingSlots,
      lateBookingAllowed: v.lateBookingAllowed,
      maxCapacity: v.maxCapacity,
      maxCatsPerBooking: v.maxPetsPerBooking,
    },
  }
}

export function campaignToFormValues(c: {
  name: string
  slug: string
  description?: string | null
  startDate: string
  endDate: string
  bookingStartAt?: string | null
  bookingEndAt?: string | null
  countdownEnabled?: boolean
  status?: string
  pricingType: string
  priceAmount?: number | string | null
  vaccineCost?: number | string | null
  serviceCharge?: number | string | null
  packageFeatures?: string[] | unknown
  pricing?: { packageFeatures?: string[]; vaccineCost?: number | string | null; serviceCharge?: number | string | null }
  maxPetsPerBooking?: number
  minAdvanceHours?: number
  allowWalkIns?: boolean
  walkInQuotaPercent?: number
  config?: {
    bookingEnabled?: boolean
    onlinePaymentEnabled?: boolean
    payAtVenueEnabled?: boolean
    walkInAllowed?: boolean
    approvalRequired?: boolean
    slotRequired?: boolean
    autoCloseWhenFull?: boolean
    showRemainingSlots?: boolean
    lateBookingAllowed?: boolean
    maxCapacity?: number
    maxCatsPerBooking?: number
  } | null
}): CampaignFormValues {
  const sd = c.startDate ? new Date(c.startDate).toISOString().slice(0, 10) : ''
  const ed = c.endDate ? new Date(c.endDate).toISOString().slice(0, 10) : ''
  const bs = c.bookingStartAt ? new Date(c.bookingStartAt).toISOString().slice(0, 16) : ''
  const be = c.bookingEndAt ? new Date(c.bookingEndAt).toISOString().slice(0, 16) : ''
  const cfg = c.config
  return {
    name: c.name,
    slug: c.slug,
    description: c.description ?? '',
    startDate: sd,
    endDate: ed,
    bookingStartAt: bs,
    bookingEndAt: be,
    countdownEnabled: c.countdownEnabled ?? false,
    status: (c.status as CampaignFormValues['status']) || 'DRAFT',
    pricingType: (c.pricingType as CampaignFormValues['pricingType']) || 'FREE',
    priceAmount: String(c.priceAmount ?? 0),
    vaccineCost: String(
      c.vaccineCost ?? c.pricing?.vaccineCost ?? c.priceAmount ?? 0
    ),
    serviceCharge: String(c.serviceCharge ?? c.pricing?.serviceCharge ?? 0),
    packageFeaturesText: (() => {
      const raw = c.packageFeatures ?? c.pricing?.packageFeatures
      return Array.isArray(raw) ? raw.join('\n') : ''
    })(),
    maxPetsPerBooking: c.maxPetsPerBooking ?? 5,
    minAdvanceHours: c.minAdvanceHours ?? 24,
    allowWalkIns: c.allowWalkIns ?? cfg?.walkInAllowed ?? true,
    walkInQuotaPercent: c.walkInQuotaPercent ?? 20,
    bookingEnabled: cfg?.bookingEnabled ?? true,
    onlinePaymentEnabled: cfg?.onlinePaymentEnabled ?? false,
    payAtVenueEnabled: cfg?.payAtVenueEnabled ?? false,
    approvalRequired: cfg?.approvalRequired ?? false,
    slotRequired: cfg?.slotRequired ?? true,
    autoCloseWhenFull: cfg?.autoCloseWhenFull ?? true,
    showRemainingSlots: cfg?.showRemainingSlots ?? true,
    lateBookingAllowed: cfg?.lateBookingAllowed ?? false,
    maxCapacity: cfg?.maxCapacity ?? 0,
  }
}
