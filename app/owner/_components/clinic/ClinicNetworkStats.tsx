"use client";

import type { OwnerClinicNetworkStats } from "@/app/owner/_lib/ownerApi";

type ClinicNetworkStatsProps = {
  stats: OwnerClinicNetworkStats | null;
  loading?: boolean;
};

function fmtCurrency(amount: number): string {
  return `৳${Number(amount || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export default function ClinicNetworkStats({ stats, loading = false }: ClinicNetworkStatsProps) {
  const cards = [
    {
      key: "totalClinics",
      label: "Total Clinics",
      value: stats?.totalClinics ?? 0,
      icon: "ri-hospital-line",
      tone: "primary",
    },
    {
      key: "activeDoctors",
      label: "Active Doctors",
      value: stats?.activeDoctors ?? 0,
      icon: "ri-stethoscope-line",
      tone: "success",
    },
    {
      key: "todayAppointments",
      label: "Today Appointments",
      value: stats?.todayAppointments ?? 0,
      icon: "ri-calendar-check-line",
      tone: "info",
    },
    {
      key: "todayRevenue",
      label: "Revenue Today",
      value: fmtCurrency(stats?.todayRevenue ?? 0),
      icon: "ri-money-dollar-circle-line",
      tone: "warning",
    },
    {
      key: "pendingApprovals",
      label: "Pending Approvals",
      value: stats?.pendingApprovals ?? 0,
      icon: "ri-time-line",
      tone: "secondary",
    },
    {
      key: "lowStockAlerts",
      label: "Low Stock Alerts",
      value: stats?.lowStockAlerts ?? 0,
      icon: "ri-alarm-warning-line",
      tone: "danger",
    },
  ] as const;

  return (
    <div className="row g-4 mb-4">
      {cards.map((card) => (
        <div key={card.key} className="col-12 col-sm-6 col-lg-4 col-xxl-2">
          <div className={`card radius-12 bg-${card.tone}-focus h-100`}>
            <div className="card-body p-20">
              {loading ? (
                <div className="placeholder-glow">
                  <span className="placeholder col-7 mb-2 d-block" />
                  <span className="placeholder col-5 d-block" />
                </div>
              ) : (
                <div className="d-flex align-items-start justify-content-between gap-2">
                  <div>
                    <div className="text-secondary-light small">{card.label}</div>
                    <h5 className={`mb-0 mt-1 text-${card.tone}-main fw-bold`}>{card.value}</h5>
                  </div>
                  <span className={`text-${card.tone}-main fs-5`}>
                    <i className={card.icon} />
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

