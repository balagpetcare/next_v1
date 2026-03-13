"use client";

import type { DoctorsSummary } from "./types";

const CARDS: { key: keyof DoctorsSummary; label: string; icon: string; filterKey?: string }[] = [
  { key: "totalDoctors", label: "Total Doctors", icon: "ri-user-star-line" },
  { key: "activeDoctors", label: "Active Doctors", icon: "ri-user-follow-line", filterKey: "status" },
  { key: "onDutyToday", label: "On Duty Today", icon: "ri-calendar-check-line" },
  { key: "availableForBooking", label: "Available for Booking", icon: "ri-calendar-event-line" },
  { key: "pendingInvites", label: "Pending Invites", icon: "ri-mail-send-line" },
  { key: "pendingApprovals", label: "Pending Approvals", icon: "ri-checkbox-multiple-line" },
  { key: "onLeave", label: "On Leave", icon: "ri-calendar-event-line" },
  { key: "credentialExpiringSoon", label: "Credential Expiring Soon", icon: "ri-file-warning-line" },
];

export default function DoctorKpiCards({
  summary,
  loading,
  onCardClick,
}: {
  summary: DoctorsSummary | null;
  loading?: boolean;
  onCardClick?: (filterKey: string) => void;
}) {
  return (
    <div className="row g-3 mb-4">
      {CARDS.map(({ key, label, icon, filterKey }) => (
        <div key={key} className="col-6 col-md-4 col-lg-3">
          <div
            className="card radius-12 p-3 h-100 cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => filterKey && onCardClick?.(filterKey)}
            onKeyDown={(e) => filterKey && e.key === "Enter" && onCardClick?.(filterKey)}
          >
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="fw-semibold fs-5">{loading ? "—" : summary?.[key] ?? "—"}</div>
                <small className="text-muted">{label}</small>
              </div>
              <i className={`${icon} fs-4 text-primary`} aria-hidden />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
