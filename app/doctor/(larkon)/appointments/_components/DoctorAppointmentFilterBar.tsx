"use client";

import { useState } from "react";
import { DoctorClinicSwitcher } from "./DoctorClinicSwitcher";
import { LiveSyncIndicator } from "./LiveSyncIndicator";
import {
  DATE_WINDOW_LABELS,
  type DateWindowPreset,
  getDateWindowRange,
} from "../_lib/dateWindow";
import type { DoctorAppointmentFilterState } from "../_lib/filterState";
import { getActiveFilterCount } from "../_lib/filterState";

const VISIT_TYPE_OPTIONS = [
  { value: "", label: "Any" },
  { value: "WALK_IN", label: "Walk-in" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "EMERGENCY", label: "Emergency" },
];

const APPOINTMENT_TYPE_OPTIONS = [
  { value: "", label: "Any" },
  { value: "CONSULTATION", label: "Consultation" },
  { value: "SERVICE", label: "Service" },
  { value: "PACKAGE", label: "Package" },
  { value: "SURGERY", label: "Surgery" },
  { value: "FOLLOW_UP", label: "Follow-up" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Any" },
  { value: "BOOKED", label: "Booked" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CHECKED_IN", label: "Checked in" },
  { value: "IN_QUEUE", label: "In queue" },
  { value: "CALLED", label: "Called" },
  { value: "IN_CONSULT", label: "In consultation" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No-show" },
];

export interface BranchOption {
  branchId: number;
  branchName: string;
}

export interface DoctorAppointmentFilterBarProps {
  filter: DoctorAppointmentFilterState;
  onFilterChange: (patch: Partial<DoctorAppointmentFilterState>) => void;
  branches: BranchOption[];
  total: number;
  loading?: boolean;
  syncStatus?: "connected" | "reconnecting" | "offline";
  onRefresh: () => void;
}

export function DoctorAppointmentFilterBar({
  filter,
  onFilterChange,
  branches,
  total,
  loading = false,
  syncStatus = "connected",
  onRefresh,
}: DoctorAppointmentFilterBarProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const activeAdvanced = getActiveFilterCount(filter);
  const range = getDateWindowRange(filter.dateWindow);
  const summaryLabel =
    range.date != null
      ? DATE_WINDOW_LABELS[filter.dateWindow as DateWindowPreset]
      : range.fromDate && range.toDate
        ? `${range.fromDate} to ${range.toDate}`
        : DATE_WINDOW_LABELS[filter.dateWindow as DateWindowPreset];

  const handleClearFilters = () => {
    onFilterChange({
      dateWindow: "today",
      fromDate: undefined,
      toDate: undefined,
      statuses: undefined,
      search: "",
      visitType: undefined,
      appointmentType: undefined,
      priority: undefined,
      offset: 0,
    });
    setAdvancedOpen(false);
  };

  return (
    <div className="card radius-12 shadow-sm mb-3">
      <div className="card-body p-3">
        {/* Date window chips */}
        <div className="d-flex flex-wrap gap-1 mb-2">
          {(Object.keys(DATE_WINDOW_LABELS) as DateWindowPreset[]).map(
            (preset) => {
              const isActive = filter.dateWindow === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  className={`btn btn-sm ${isActive ? "btn-primary" : "btn-outline-secondary"}`}
                  onClick={() =>
                    onFilterChange({
                      dateWindow: preset,
                      fromDate: undefined,
                      toDate: undefined,
                      offset: 0,
                    })
                  }
                >
                  {DATE_WINDOW_LABELS[preset]}
                </button>
              );
            }
          )}
        </div>

        {/* Toolbar: search, branch, refresh, advanced, clear */}
        <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Search owner, phone, pet, token..."
            value={filter.search}
            onChange={(e) =>
              onFilterChange({ search: e.target.value, offset: 0 })
            }
            style={{ width: "200px", maxWidth: "100%" }}
            aria-label="Search"
          />
          <DoctorClinicSwitcher
            branches={branches}
            value={filter.branchId}
            onChange={(branchId) =>
              onFilterChange({ branchId, offset: 0 })
            }
          />
          <LiveSyncIndicator status={syncStatus} />
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={onRefresh}
            disabled={loading}
          >
            Refresh
          </button>
          <button
            type="button"
            className={`btn btn-sm ${advancedOpen ? "btn-outline-primary" : "btn-outline-secondary"}`}
            onClick={() => setAdvancedOpen((o) => !o)}
          >
            Advanced {activeAdvanced > 0 ? `(${activeAdvanced})` : ""}
          </button>
          {(filter.dateWindow !== "today" ||
            filter.search ||
            filter.statuses ||
            activeAdvanced > 0) && (
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={handleClearFilters}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Advanced filters */}
        {advancedOpen && (
          <div className="border rounded p-2 mb-2 bg-light">
            <div className="row g-2">
              <div className="col-md-2">
                <label className="form-label small mb-0">From date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={filter.fromDate ?? ""}
                  onChange={(e) =>
                    onFilterChange({
                      fromDate: e.target.value || undefined,
                      offset: 0,
                    })
                  }
                />
              </div>
              <div className="col-md-2">
                <label className="form-label small mb-0">To date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={filter.toDate ?? ""}
                  onChange={(e) =>
                    onFilterChange({
                      toDate: e.target.value || undefined,
                      offset: 0,
                    })
                  }
                />
              </div>
              <div className="col-md-2">
                <label className="form-label small mb-0">Status</label>
                <select
                  className="form-select form-select-sm"
                  value={filter.statuses ?? ""}
                  onChange={(e) =>
                    onFilterChange({
                      statuses: e.target.value || undefined,
                      offset: 0,
                    })
                  }
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value || "any"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label small mb-0">Visit type</label>
                <select
                  className="form-select form-select-sm"
                  value={filter.visitType ?? ""}
                  onChange={(e) =>
                    onFilterChange({
                      visitType: e.target.value || undefined,
                      offset: 0,
                    })
                  }
                >
                  {VISIT_TYPE_OPTIONS.map((o) => (
                    <option key={o.value || "any"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label small mb-0">Appointment type</label>
                <select
                  className="form-select form-select-sm"
                  value={filter.appointmentType ?? ""}
                  onChange={(e) =>
                    onFilterChange({
                      appointmentType: e.target.value || undefined,
                      offset: 0,
                    })
                  }
                >
                  {APPOINTMENT_TYPE_OPTIONS.map((o) => (
                    <option key={o.value || "any"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label small mb-0">Priority</label>
                <select
                  className="form-select form-select-sm"
                  value={filter.priority ?? ""}
                  onChange={(e) =>
                    onFilterChange({
                      priority: e.target.value || undefined,
                      offset: 0,
                    })
                  }
                >
                  <option value="">Any</option>
                  <option value="NORMAL">Normal</option>
                  <option value="EMERGENCY">Emergency</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Filter summary */}
        <div className="small text-muted">
          {loading
            ? "Loading…"
            : `Showing ${total} appointment${total !== 1 ? "s" : ""} for ${summaryLabel}${filter.search ? ` matching "${filter.search}"` : ""}${activeAdvanced > 0 ? " + advanced filters" : ""}`}
        </div>
      </div>
    </div>
  );
}
