"use client";

import type { OwnerClinicDashboardStats } from "@/app/owner/_lib/ownerApi";

type ClinicDashboardChartsProps = {
  stats: OwnerClinicDashboardStats | null;
  loading?: boolean;
};

function maxValue(values: number[]): number {
  const max = Math.max(...values, 0);
  return max > 0 ? max : 1;
}

export default function ClinicDashboardCharts({ stats, loading = false }: ClinicDashboardChartsProps) {
  const patientFlow = stats?.patientFlowData ?? [];
  const doctorPerformance = stats?.doctorPerformanceData ?? [];
  const revenueTrend = stats?.revenueTrendData ?? [];

  const maxAppointments = maxValue(patientFlow.map((row) => row.appointments));
  const maxRevenue = maxValue(revenueTrend.map((row) => row.revenue));
  const maxDoctorVisits = maxValue(doctorPerformance.map((row) => row.completedVisits));

  return (
    <div className="row g-4">
      <div className="col-12 col-xl-7">
        <div className="card radius-12 h-100">
          <div className="card-body p-24">
            <h6 className="mb-3 fw-semibold">
              <i className="ri-line-chart-line me-2 text-primary" />
              Patient Flow (Last 7 Days)
            </h6>
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status" />
              </div>
            ) : patientFlow.length === 0 ? (
              <p className="text-muted mb-0">No patient flow data available.</p>
            ) : (
              <div className="d-flex flex-column gap-3">
                {patientFlow.map((row) => {
                  const pct = Math.min(100, Math.round((row.appointments / maxAppointments) * 100));
                  return (
                    <div key={row.date}>
                      <div className="d-flex justify-content-between small mb-1">
                        <span>{row.date}</span>
                        <span>
                          {row.appointments} appointments / {row.visits} visits
                        </span>
                      </div>
                      <div className="progress" role="progressbar" aria-label={`Appointments on ${row.date}`}>
                        <div className="progress-bar bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="col-12 col-xl-5">
        <div className="card radius-12 h-100">
          <div className="card-body p-24">
            <h6 className="mb-3 fw-semibold">
              <i className="ri-money-dollar-circle-line me-2 text-success" />
              Revenue Trend (Last 7 Days)
            </h6>
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-success" role="status" />
              </div>
            ) : revenueTrend.length === 0 ? (
              <p className="text-muted mb-0">No revenue trend data available.</p>
            ) : (
              <div className="d-flex flex-column gap-3">
                {revenueTrend.map((row) => {
                  const pct = Math.min(100, Math.round((row.revenue / maxRevenue) * 100));
                  return (
                    <div key={row.date}>
                      <div className="d-flex justify-content-between small mb-1">
                        <span>{row.date}</span>
                        <span>৳{Number(row.revenue || 0).toLocaleString("en-BD")}</span>
                      </div>
                      <div className="progress" role="progressbar" aria-label={`Revenue on ${row.date}`}>
                        <div className="progress-bar bg-success" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="col-12">
        <div className="card radius-12">
          <div className="card-body p-24">
            <h6 className="mb-3 fw-semibold">
              <i className="ri-bar-chart-box-line me-2 text-info" />
              Doctor Performance (Completed Visits)
            </h6>
            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-info" role="status" />
              </div>
            ) : doctorPerformance.length === 0 ? (
              <p className="text-muted mb-0">No doctor performance data available.</p>
            ) : (
              <div className="d-flex flex-column gap-3">
                {doctorPerformance.map((doctor) => {
                  const pct = Math.min(
                    100,
                    Math.round((doctor.completedVisits / maxDoctorVisits) * 100)
                  );
                  return (
                    <div key={doctor.doctorId}>
                      <div className="d-flex justify-content-between small mb-1">
                        <span className="fw-semibold">{doctor.doctorName}</span>
                        <span>
                          {doctor.completedVisits} completed / {doctor.appointments} appointments
                        </span>
                      </div>
                      <div className="progress" role="progressbar" aria-label={`Performance of ${doctor.doctorName}`}>
                        <div className="progress-bar bg-info" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

