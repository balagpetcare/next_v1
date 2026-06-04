'use client'

import { useMemo, useState } from 'react'
import type { DemandIntelligenceReport } from '@/lib/campaignApi'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './demandForecast.css'

type HeatmapLevel = 'division' | 'district' | 'upazila' | 'area'

type Props = {
  report: DemandIntelligenceReport
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="demand-forecast__kpi">
      <p className="text-muted small mb-1 mb-0">{label}</p>
      <p className="demand-forecast__kpi-value mb-0">{value}</p>
      {sub ? <p className="text-muted small mt-1 mb-0">{sub}</p> : null}
    </div>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const cls =
    priority === 'critical' || priority === 'high'
      ? 'bg-danger'
      : priority === 'medium'
        ? 'bg-warning text-dark'
        : 'bg-secondary'
  return <span className={`badge ${cls}`}>{priority}</span>
}

type GeoTab = 'division' | 'district' | 'upazila' | 'location'

export default function DemandForecastDashboard({ report }: Props) {
  const [heatmapLevel, setHeatmapLevel] = useState<HeatmapLevel>('district')
  const [geoTab, setGeoTab] = useState<GeoTab>('district')
  const ex = report.executiveSummary
  const geo = report.geographic
  const vf = report.vaccineForecast
  const rp = report.resourcePlanning

  const heatmapPoints = useMemo(() => {
    if (heatmapLevel === 'division') return geo.heatmap.division
    if (heatmapLevel === 'upazila') return geo.heatmap.upazila
    if (heatmapLevel === 'area') return geo.heatmap.area
    return geo.heatmap.district
  }, [geo.heatmap, heatmapLevel])

  const maxHeat = Math.max(1, ...heatmapPoints.map((p) => p.demandScore))

  return (
    <div className="demand-forecast">
      <div className="demand-forecast__hero">
        <p className="small text-white-50 mb-1 mb-0">National vaccination rollout planning</p>
        <h2 className="h4 fw-bold mb-2">{report.campaign.name}</h2>
        <p className="small mb-0 opacity-90">
          Forecast horizon {ex.horizonDays} days · Confidence{' '}
          <span className="badge bg-light text-dark">{ex.forecast.confidence}</span> · Updated{' '}
          {new Date(report.generatedAt).toLocaleString()}
        </p>
      </div>

      {/* A. Executive Summary */}
      <section className="mb-4">
        <h5 className="fw-bold text-secondary mb-3">Executive summary</h5>
        <div className="row g-3">
          <div className="col-6 col-md-4 col-xl-2">
            <KpiCard label="Pre-registrations" value={ex.totalPreRegistrations.toLocaleString()} sub={`${ex.totalPreRegCats} cats`} />
          </div>
          <div className="col-6 col-md-4 col-xl-2">
            <KpiCard label="Bookings" value={ex.totalBookings.toLocaleString()} sub={`${ex.totalBookingCats} cats`} />
          </div>
          <div className="col-6 col-md-4 col-xl-2">
            <KpiCard label="Vaccinated" value={ex.totalVaccinated.toLocaleString()} />
          </div>
          <div className="col-6 col-md-4 col-xl-2">
            <KpiCard label="Conversion rate" value={`${ex.conversionRate}%`} sub="bookings / demand signals" />
          </div>
          <div className="col-6 col-md-4 col-xl-2">
            <KpiCard label="Projected demand" value={ex.projectedDemand.toLocaleString()} sub={`${ex.weeklyVelocityCats}/wk velocity`} />
          </div>
          <div className="col-6 col-md-4 col-xl-2">
            <KpiCard
              label="Projected revenue"
              value={`${report.campaign.currency} ${ex.projectedRevenue.toLocaleString()}`}
            />
          </div>
        </div>
      </section>

      {/* Charts row */}
      <div className="row g-3 mb-4">
        <div className="col-lg-7">
          <div className="demand-forecast__section h-100">
            <div className="demand-forecast__section-head">
              <strong>Demand trend (30 days)</strong>
            </div>
            <div className="demand-forecast__section-body" style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={report.charts.demandTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="preRegCats" stackId="1" stroke="#405189" fill="#40518933" name="Pre-reg cats" />
                  <Area type="monotone" dataKey="bookingCats" stackId="1" stroke="#0ab39c" fill="#0ab39c33" name="Booking cats" />
                  <Line type="monotone" dataKey="vaccinations" stroke="#f06548" name="Vaccinations" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="col-lg-5">
          <div className="demand-forecast__section h-100">
            <div className="demand-forecast__section-head d-flex justify-content-between align-items-center">
              <strong>Bangladesh demand heatmap</strong>
              <div className="btn-group btn-group-sm">
                {(['division', 'district', 'upazila', 'area'] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={`btn ${heatmapLevel === l ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setHeatmapLevel(l)}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="demand-forecast__section-body">
              <div className="d-grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
                {heatmapPoints.slice(0, 28).map((p) => {
                  const intensity = p.demandScore / maxHeat
                  return (
                    <div
                      key={`${heatmapLevel}-${p.id}`}
                      className="demand-forecast__heatmap-cell"
                      style={{ background: `rgba(11, 92, 92, ${0.1 + intensity * 0.75})` }}
                      title={`${p.name}: ${p.demandScore}% · ${p.totalCats} cats`}
                    >
                      <div className="small fw-semibold text-truncate">{p.name}</div>
                      <div className="small opacity-75">{p.demandScore}%</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="demand-forecast__section">
            <div className="demand-forecast__section-head">
              <strong>District comparison</strong>
            </div>
            <div className="demand-forecast__section-body" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.charts.districtComparison} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="totalCats" fill="#0b5c5c" name="Cats" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="demand-forecast__section">
            <div className="demand-forecast__section-head">
              <strong>Vaccine demand by product</strong>
            </div>
            <div className="demand-forecast__section-body" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.charts.vaccineDemand}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="totalRequired" fill="#405189" name="Required" />
                  <Bar dataKey="available" fill="#0ab39c" name="Available" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="demand-forecast__section mb-4">
        <div className="demand-forecast__section-head">
          <strong>Capacity utilization by slot date</strong>
        </div>
        <div className="demand-forecast__section-body" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={report.charts.capacityUtilization}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="utilization" stroke="#f7b84b" name="Utilization %" />
              <Line type="monotone" dataKey="booked" stroke="#0b5c5c" name="Booked" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* B. Geographic */}
      <div className="demand-forecast__section mb-4">
        <div className="demand-forecast__section-head">
          <strong>Geographic intelligence</strong>
        </div>
        <div className="demand-forecast__section-body">
          <div className="btn-group btn-group-sm mb-3 flex-wrap">
            {(
              [
                ['division', 'Division', geo.divisionRanking.length],
                ['district', 'District', geo.districtRanking.length],
                ['upazila', 'Upazila', geo.upazilaRanking.length],
                ['location', 'Locations', geo.locationRanking.length],
              ] as const
            ).map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                className={`btn ${geoTab === key ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setGeoTab(key)}
              >
                {label} ({count})
              </button>
            ))}
          </div>
          {geoTab === 'division' ? (
            <GeoTable rows={geo.divisionRanking} cols={['divisionName', 'totalCats', 'demandScore']} />
          ) : null}
          {geoTab === 'district' ? (
            <GeoTable rows={geo.districtRanking} cols={['districtName', 'preRegCats', 'bookingCats', 'totalCats', 'demandScore']} />
          ) : null}
          {geoTab === 'upazila' ? (
            <GeoTable rows={geo.upazilaRanking} cols={['upazilaName', 'districtName', 'totalCats', 'demandScore']} />
          ) : null}
          {geoTab === 'location' ? (
            <GeoTable
              rows={geo.locationRanking}
              cols={['locationName', 'totalCats', 'utilizationPercent', 'demandScore', 'isActive']}
            />
          ) : null}
        </div>
      </div>

      <div className="row g-3 mb-4">
        {/* C. Vaccine */}
        <div className="col-lg-6">
          <div className="demand-forecast__section h-100">
            <div className="demand-forecast__section-head">
              <strong>Vaccine forecasting</strong>
              {vf.hasShortageWarning ? <span className="badge bg-danger ms-2">Shortage warning</span> : null}
            </div>
            <div className="demand-forecast__section-body">
              <dl className="row small mb-3">
                <dt className="col-6">Required quantity</dt>
                <dd className="col-6">{vf.requiredQuantity.toLocaleString()} doses</dd>
                <dt className="col-6">Buffer ({vf.bufferPercent}%)</dt>
                <dd className="col-6">+{vf.bufferQuantity.toLocaleString()}</dd>
                <dt className="col-6">Total with buffer</dt>
                <dd className="col-6 fw-bold">{vf.totalWithBuffer.toLocaleString()}</dd>
                <dt className="col-6">Available inventory</dt>
                <dd className="col-6">{vf.availableInventory.toLocaleString()}</dd>
                <dt className="col-6">Net shortage</dt>
                <dd className={`col-6 fw-bold ${vf.netShortage > 0 ? 'text-danger' : 'text-success'}`}>
                  {vf.netShortage.toLocaleString()}
                </dd>
              </dl>
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Vaccine</th>
                    <th>Required</th>
                    <th>Available</th>
                    <th>Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {vf.byVaccine.map((v) => (
                    <tr key={v.vaccineId} className={v.hasShortage ? 'table-warning' : undefined}>
                      <td>{v.name}</td>
                      <td>{v.totalRequired.toLocaleString()}</td>
                      <td>{v.availableInventory != null ? v.availableInventory.toLocaleString() : '—'}</td>
                      <td>{v.shortage > 0 ? v.shortage.toLocaleString() : 'OK'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* D. Resource */}
        <div className="col-lg-6">
          <div className="demand-forecast__section h-100">
            <div className="demand-forecast__section-head">
              <strong>Resource planning</strong>
            </div>
            <div className="demand-forecast__section-body">
              <div className="row g-2 mb-3">
                <div className="col-4">
                  <KpiCard label="Doctors (rec.)" value={String(rp.recommendedDoctors)} sub={`${rp.currentStaff.vaccinators} assigned`} />
                </div>
                <div className="col-4">
                  <KpiCard label="Volunteers (rec.)" value={String(rp.recommendedVolunteers)} sub={`${rp.currentStaff.support} assigned`} />
                </div>
                <div className="col-4">
                  <KpiCard label="Slots needed" value={String(rp.requiredSlots)} sub={`${rp.existingSlots} exist`} />
                </div>
              </div>
              <p className="small text-muted mb-2">
                Est. working days: <strong>{rp.estimatedWorkingDays}</strong> · Daily capacity:{' '}
                <strong>{rp.catsPerDayCapacity}</strong> cats · Open slot capacity:{' '}
                <strong>{rp.openSlotCapacity}</strong>
              </p>
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>District</th>
                    <th>Gap</th>
                    <th>Recommended</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rp.capacityByDistrict.slice(0, 8).map((c) => (
                    <tr key={c.districtId}>
                      <td>{c.districtName}</td>
                      <td>{c.capacityGap}</td>
                      <td>{c.recommendedCapacity}</td>
                      <td>
                        <PriorityBadge priority={c.priority} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* E. AI Recommendations */}
      <div className="demand-forecast__section mb-4">
        <div className="demand-forecast__section-head">
          <strong>Planning recommendations</strong>
        </div>
        <div className="demand-forecast__section-body">
          {report.recommendations.length === 0 ? (
            <p className="text-muted small mb-0">No critical actions at this time. Continue monitoring demand velocity.</p>
          ) : (
            report.recommendations.map((r) => (
              <div
                key={r.id}
                className={`demand-forecast__rec-card ${r.priority === 'critical' || r.priority === 'high' ? `demand-forecast__rec-card--${r.priority}` : ''}`}
              >
                <div className="d-flex justify-content-between align-items-start gap-2">
                  <div>
                    <span className="badge bg-light text-dark me-2">{r.category}</span>
                    <PriorityBadge priority={r.priority} />
                    <h6 className="fw-bold mt-2 mb-1">{r.title}</h6>
                    <p className="small text-muted mb-0">{r.detail}</p>
                    {r.actionHint ? <p className="small mb-0 mt-1 text-primary">{r.actionHint}</p> : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function GeoTable({
  rows,
  cols,
}: {
  rows: Array<Record<string, unknown>>
  cols: string[]
}) {
  if (rows.length === 0) return <p className="text-muted small">No data in this dimension yet.</p>
  return (
    <div className="table-responsive">
      <table className="table table-sm table-hover">
        <thead className="table-light">
          <tr>
            <th>#</th>
            {cols.map((c) => (
              <th key={c}>{c.replace(/([A-Z])/g, ' $1')}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 15).map((row) => (
            <tr key={String(row.rank)}>
              <td>{String(row.rank)}</td>
              {cols.map((c) => (
                <td key={c}>
                  {typeof row[c] === 'boolean' ? (row[c] ? 'Yes' : 'No') : String(row[c] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
