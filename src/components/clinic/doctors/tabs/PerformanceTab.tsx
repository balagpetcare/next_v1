"use client";

import { useState, useEffect, useCallback } from "react";
import { staffDoctorPerformance } from "@/lib/api";

type Props = {
  branchId: string;
  memberId: number;
  performance: any;
  loading?: boolean;
  permissions: string[];
};

const RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

export default function PerformanceTab({
  branchId,
  memberId,
  performance,
  loading,
}: Props) {
  const [rangeDays, setRangeDays] = useState(7);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [data, setData] = useState<any>(null);

  const fetchPerf = useCallback(
    (from: string, to: string) => {
      if (!branchId || !memberId) return;
      staffDoctorPerformance(branchId, memberId, { from, to })
        .then(setData)
        .catch(() => setData(null));
    },
    [branchId, memberId]
  );

  useEffect(() => {
    if (useCustomRange && customFrom && customTo) {
      fetchPerf(customFrom, customTo);
      return;
    }
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - rangeDays);
    fetchPerf(from.toISOString().slice(0, 10), to.toISOString().slice(0, 10));
  }, [branchId, memberId, rangeDays, useCustomRange, customFrom, customTo, fetchPerf]);

  const perf = data ?? performance;
  const total = perf?.appointmentsTotal ?? 0;
  const completed = perf?.appointmentsCompleted ?? 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const utilizationRate = perf?.utilizationRate ?? (total > 0 ? Math.round((completed / total) * 100) : null);

  if (loading && !perf) {
    return (
      <div className="card radius-12">
        <div className="card-body text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="text-muted mt-2 mb-0">Loading performance...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        {!useCustomRange ? (
          <select className="form-select form-select-sm" style={{ width: "auto" }} value={rangeDays} onChange={(e) => setRangeDays(Number(e.target.value))}>
            {RANGES.map((r) => (
              <option key={r.days} value={r.days}>{r.label}</option>
            ))}
          </select>
        ) : (
          <>
            <input type="date" className="form-control form-control-sm" style={{ width: "auto" }} value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            <span className="text-muted small">to</span>
            <input type="date" className="form-control form-control-sm" style={{ width: "auto" }} value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </>
        )}
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm radius-8"
          onClick={() => { setUseCustomRange(!useCustomRange); if (!useCustomRange) { const t = new Date(); const f = new Date(t); f.setDate(f.getDate() - 30); setCustomFrom(f.toISOString().slice(0, 10)); setCustomTo(t.toISOString().slice(0, 10)); } }}
        >
          {useCustomRange ? "Preset range" : "Custom range"}
        </button>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-6 col-md-4">
          <div className="card radius-12 h-100">
            <div className="card-body text-center">
              <div className="fw-semibold fs-4">{completed}</div>
              <div className="text-muted small">Completed</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-4">
          <div className="card radius-12 h-100">
            <div className="card-body text-center">
              <div className="fw-semibold fs-4">{total}</div>
              <div className="text-muted small">Total appointments</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-4">
          <div className="card radius-12 h-100">
            <div className="card-body text-center">
              <div className="fw-semibold fs-4">{completionRate}%</div>
              <div className="text-muted small">Completion rate</div>
            </div>
          </div>
        </div>
        {utilizationRate != null && (
          <div className="col-6 col-md-4">
            <div className="card radius-12 h-100">
              <div className="card-body text-center">
                <div className="fw-semibold fs-4">{utilizationRate}%</div>
                <div className="text-muted small">Utilization</div>
              </div>
            </div>
          </div>
        )}
        <div className="col-6 col-md-4">
          <div className="card radius-12 h-100">
            <div className="card-body text-center">
              <div className="fw-semibold fs-4">{perf?.cancellationRate ?? 0}%</div>
              <div className="text-muted small">Cancellation rate</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-4">
          <div className="card radius-12 h-100">
            <div className="card-body text-center">
              <div className="fw-semibold fs-4">{perf?.noShowRate ?? 0}%</div>
              <div className="text-muted small">No-show rate</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-4">
          <div className="card radius-12 h-100">
            <div className="card-body text-center">
              <div className="fw-semibold fs-4">{perf?.revenueContribution != null ? `BDT ${perf.revenueContribution}` : "—"}</div>
              <div className="text-muted small">Revenue (period)</div>
            </div>
          </div>
        </div>
      </div>

      {perf?.topServices?.length > 0 && (
        <div className="card radius-12">
          <div className="card-body">
            <h6 className="mb-3">Top services</h6>
            <ul className="list-unstyled mb-0">
              {perf.topServices.map((s: any, i: number) => (
                <li key={i} className="d-flex justify-content-between mb-2">
                  <span>{s.serviceName ?? `Service #${s.serviceId}`}</span>
                  <span className="text-muted">{s.count} visits</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {!perf && !loading && (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <p className="text-muted small mb-0">No performance data for this period.</p>
          </div>
        </div>
      )}
    </>
  );
}
