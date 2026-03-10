"use client";

import { LiveSyncIndicator } from "./LiveSyncIndicator";
import { DoctorClinicSwitcher } from "./DoctorClinicSwitcher";

const TODAY = new Date().toISOString().slice(0, 10);
const TOMORROW = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

function getWeekStartEnd(): { start: string; end: string } {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export interface BranchOption {
  branchId: number;
  branchName: string;
}

export interface DoctorAppointmentHeaderProps {
  date: string;
  onDateChange: (date: string) => void;
  branchId: string;
  onBranchIdChange: (branchId: string) => void;
  branches: BranchOption[];
  search: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  syncStatus?: "connected" | "reconnecting" | "offline";
}

export function DoctorAppointmentHeader({
  date,
  onDateChange,
  branchId,
  onBranchIdChange,
  branches,
  search,
  onSearchChange,
  onRefresh,
  syncStatus = "connected",
}: DoctorAppointmentHeaderProps) {
  const week = getWeekStartEnd();
  const isWeek = date >= week.start && date <= week.end && date !== TODAY && date !== TOMORROW;

  return (
    <div className="card radius-12 mb-3">
      <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
        <h6 className="mb-0">Doctor Work Console — Appointments</h6>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="d-flex gap-1">
            <button
              type="button"
              className={`btn btn-sm ${date === TODAY ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => onDateChange(TODAY)}
            >
              Today
            </button>
            <button
              type="button"
              className={`btn btn-sm ${date === TOMORROW ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => onDateChange(TOMORROW)}
            >
              Tomorrow
            </button>
            <button
              type="button"
              className={`btn btn-sm ${isWeek ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => onDateChange(week.start)}
            >
              This Week
            </button>
            <input
              type="date"
              className="form-control form-control-sm"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              style={{ width: "150px" }}
              aria-label="Date"
            />
          </div>
          <DoctorClinicSwitcher
            branches={branches}
            value={branchId}
            onChange={onBranchIdChange}
          />
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Search owner, phone, pet, token..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ width: "180px" }}
            aria-label="Search"
          />
          <LiveSyncIndicator status={syncStatus} />
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onRefresh}>
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
