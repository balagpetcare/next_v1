"use client";

import { DoctorClinicSwitcher } from "../../appointments/_components/DoctorClinicSwitcher";

type BranchOption = { branchId: number; branchName: string };

export function DoctorGreetingStrip(props: {
  doctorName?: string | null;
  currentDate?: string | null;
  activeBranchName?: string | null;
  selectedBranchId: string;
  branches: BranchOption[];
  onBranchChange: (branchId: string) => void;
  syncStatus?: "connected" | "reconnecting" | "offline";
  unreadCount?: number;
}) {
  const {
    doctorName,
    currentDate,
    activeBranchName,
    selectedBranchId,
    branches,
    onBranchChange,
    syncStatus = "offline",
    unreadCount = 0,
  } = props;

  const dateLabel = currentDate
    ? new Date(currentDate).toLocaleString()
    : new Date().toLocaleString();

  const syncBadgeClass =
    syncStatus === "connected"
      ? "bg-success"
      : syncStatus === "reconnecting"
        ? "bg-warning text-dark"
        : "bg-secondary";

  return (
    <div className="card radius-12 mb-3">
      <div className="card-body d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div>
          <h6 className="mb-1">
            Doctor Console{doctorName ? ` - ${doctorName}` : ""}
          </h6>
          <div className="small text-muted d-flex flex-wrap align-items-center gap-2">
            <span>{dateLabel}</span>
            {activeBranchName ? <span>Clinic: {activeBranchName}</span> : null}
            <span className={`badge ${syncBadgeClass}`}>Live: {syncStatus}</span>
            {unreadCount > 0 ? (
              <span className="badge bg-danger">Alerts: {unreadCount}</span>
            ) : null}
          </div>
        </div>

        <DoctorClinicSwitcher
          branches={branches}
          value={selectedBranchId}
          onChange={onBranchChange}
          className="radius-12"
        />
      </div>
    </div>
  );
}
