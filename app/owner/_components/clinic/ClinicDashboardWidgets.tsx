"use client";

import type { OwnerClinicDashboardStats } from "@/app/owner/_lib/ownerApi";

type ClinicDashboardWidgetsProps = {
  stats: OwnerClinicDashboardStats | null;
  loading?: boolean;
};

export default function ClinicDashboardWidgets({
  stats,
  loading = false,
}: ClinicDashboardWidgetsProps) {
  const cards = [
    {
      key: "appointments",
      label: "Appointments Today",
      value: stats?.todayAppointments ?? 0,
      icon: "ri-calendar-check-line",
      tone: "primary",
    },
    {
      key: "walkins",
      label: "Walk-in Patients",
      value: stats?.walkIns ?? 0,
      icon: "ri-user-location-line",
      tone: "info",
    },
    {
      key: "surgeries",
      label: "Surgeries Today",
      value: stats?.surgeriesToday ?? 0,
      icon: "ri-heart-pulse-line",
      tone: "warning",
    },
    {
      key: "doctors",
      label: "Doctors On Duty",
      value: stats?.doctorsOnDuty ?? 0,
      icon: "ri-stethoscope-line",
      tone: "success",
    },
    {
      key: "alerts",
      label: "Medicine Alerts",
      value: stats?.medicineAlerts ?? 0,
      icon: "ri-alarm-warning-line",
      tone: "danger",
    },
    {
      key: "revenue",
      label: "Revenue Today",
      value: `৳${Number(stats?.todayRevenue || 0).toLocaleString("en-BD")}`,
      icon: "ri-money-dollar-circle-line",
      tone: "secondary",
    },
  ] as const;

  return (
    <div className="row g-4 mb-4">
      {cards.map((card) => (
        <div key={card.key} className="col-12 col-sm-6 col-xl-4">
          <div className={`card radius-12 h-100 bg-${card.tone}-focus`}>
            <div className="card-body p-20">
              {loading ? (
                <div className="placeholder-glow">
                  <span className="placeholder col-6 mb-2 d-block" />
                  <span className="placeholder col-5 d-block" />
                </div>
              ) : (
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className="text-muted small">{card.label}</div>
                    <h5 className={`mb-0 mt-1 text-${card.tone}-main fw-bold`}>{card.value}</h5>
                  </div>
                  <i className={`${card.icon} fs-4 text-${card.tone}-main`} />
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

