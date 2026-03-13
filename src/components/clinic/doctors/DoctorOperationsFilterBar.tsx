"use client";

import { ReactNode, useState } from "react";
import DoctorSelector from "./DoctorSelector";
import FilterBar from "@/src/components/dashboard/FilterBar";

export type DoctorOperationsFilterBarProps = {
  branchId: string;
  doctorValue: number | undefined;
  onDoctorChange: (memberId: number | undefined) => void;
  doctorPlaceholder?: string;
  enabled?: boolean;
  /** Optional date range inputs (e.g. from/to) - render as children if needed */
  children?: ReactNode;
  onReset?: () => void;
  resetLabel?: string;
  className?: string;
  // Optional unified filters
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  statusFilter?: string;
  onStatusFilterChange?: (v: string) => void;
  statusOptions?: { value: string; label: string }[];
  serviceFilter?: number | string;
  onServiceFilterChange?: (v: number | undefined) => void;
  serviceOptions?: { id: number; name: string }[];
  specialtyFilter?: string;
  onSpecialtyFilterChange?: (v: string) => void;
  specialtyOptions?: { value: string; label: string }[];
  dateFrom?: string;
  dateTo?: string;
  onDateRangeChange?: (from: string, to: string) => void;
  complianceFilter?: string;
  onComplianceFilterChange?: (v: string) => void;
  /** When true, show collapsible "More filters" section */
  showMoreFilters?: boolean;
  onShowMoreFiltersChange?: (v: boolean) => void;
};

const DEFAULT_STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

const COMPLIANCE_OPTIONS = [
  { value: "", label: "All" },
  { value: "all_good", label: "All good" },
  { value: "expiring", label: "Expiring soon" },
  { value: "expired", label: "Expired" },
  { value: "missing", label: "Missing" },
];

/**
 * Reusable filter bar for Doctor Operations pages.
 * Doctor filter is optional (placeholder "All doctors").
 * Optional: search, status, service, specialty, date range, compliance; collapsible "More filters" and filter chips.
 */
export default function DoctorOperationsFilterBar({
  branchId,
  doctorValue,
  onDoctorChange,
  doctorPlaceholder = "All doctors",
  enabled = true,
  children,
  onReset,
  resetLabel = "Reset filters",
  className = "",
  search,
  onSearchChange,
  searchPlaceholder = "Search doctors…",
  statusFilter = "",
  onStatusFilterChange,
  statusOptions = DEFAULT_STATUS_OPTIONS,
  serviceFilter,
  onServiceFilterChange,
  serviceOptions = [],
  specialtyFilter = "",
  onSpecialtyFilterChange,
  specialtyOptions = [],
  dateFrom,
  dateTo,
  onDateRangeChange,
  complianceFilter = "",
  onComplianceFilterChange,
  showMoreFilters: controlledShowMore,
  onShowMoreFiltersChange,
}: DoctorOperationsFilterBarProps) {
  const [internalShowMore, setInternalShowMore] = useState(false);
  const showMore = controlledShowMore ?? internalShowMore;
  const setShowMore = onShowMoreFiltersChange ?? setInternalShowMore;

  const hasOptionalFilters =
    (search != null && search !== "") ||
    (statusFilter != null && statusFilter !== "") ||
    (serviceFilter != null && serviceFilter !== "") ||
    (specialtyFilter != null && specialtyFilter !== "") ||
    (dateFrom != null && dateFrom !== "") ||
    (dateTo != null && dateTo !== "") ||
    (complianceFilter != null && complianceFilter !== "");

  const handleReset = () => {
    onDoctorChange(undefined);
    onSearchChange?.("");
    onStatusFilterChange?.("");
    onServiceFilterChange?.(undefined);
    onSpecialtyFilterChange?.("");
    onDateRangeChange?.("", "");
    onComplianceFilterChange?.("");
    onReset?.();
  };

  return (
    <div className={className}>
      <FilterBar onReset={handleReset} resetLabel={resetLabel}>
        <div className="d-flex flex-wrap align-items-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <label className="form-label mb-0 small fw-medium">Doctor</label>
            <DoctorSelector
              branchId={branchId}
              value={doctorValue}
              onChange={onDoctorChange}
              placeholder={doctorPlaceholder}
              enabled={enabled}
            />
          </div>
          {onSearchChange != null && (
            <div className="d-flex align-items-center gap-2">
              <label className="form-label mb-0 small fw-medium">Search</label>
              <input
                type="search"
                className="form-control form-control-sm"
                placeholder={searchPlaceholder}
                value={search ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                style={{ minWidth: 160 }}
              />
            </div>
          )}
          {onStatusFilterChange != null && (
            <div className="d-flex align-items-center gap-2">
              <label className="form-label mb-0 small fw-medium">Status</label>
              <select
                className="form-select form-select-sm"
                value={statusFilter ?? ""}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                style={{ minWidth: 120 }}
              >
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}
          {onServiceFilterChange != null && serviceOptions.length > 0 && (
            <div className="d-flex align-items-center gap-2">
              <label className="form-label mb-0 small fw-medium">Service</label>
              <select
                className="form-select form-select-sm"
                value={serviceFilter ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  onServiceFilterChange(v === "" ? undefined : Number(v));
                }}
                style={{ minWidth: 140 }}
              >
                <option value="">All services</option>
                {serviceOptions.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          {onSpecialtyFilterChange != null && specialtyOptions.length > 0 && (
            <div className="d-flex align-items-center gap-2">
              <label className="form-label mb-0 small fw-medium">Specialty</label>
              <select
                className="form-select form-select-sm"
                value={specialtyFilter ?? ""}
                onChange={(e) => onSpecialtyFilterChange(e.target.value)}
                style={{ minWidth: 120 }}
              >
                <option value="">All</option>
                {specialtyOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}
          {children}
        </div>
      </FilterBar>

      {/* Collapsible More filters */}
      {(onDateRangeChange != null || onComplianceFilterChange != null) && (
        <>
          <button
            type="button"
            className="btn btn-link btn-sm p-0 mt-2 text-secondary text-decoration-none"
            onClick={() => setShowMore(!showMore)}
          >
            {showMore ? "Hide" : "More filters"}
          </button>
          {showMore && (
            <div className="d-flex flex-wrap align-items-center gap-3 mt-2 pt-2 border-top">
              {onDateRangeChange != null && (
                <>
                  <div className="d-flex align-items-center gap-2">
                    <label className="form-label mb-0 small fw-medium">From</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={dateFrom ?? ""}
                      onChange={(e) => onDateRangeChange(e.target.value, dateTo ?? "")}
                    />
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <label className="form-label mb-0 small fw-medium">To</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={dateTo ?? ""}
                      onChange={(e) => onDateRangeChange(dateFrom ?? "", e.target.value)}
                    />
                  </div>
                </>
              )}
              {onComplianceFilterChange != null && (
                <div className="d-flex align-items-center gap-2">
                  <label className="form-label mb-0 small fw-medium">Compliance</label>
                  <select
                    className="form-select form-select-sm"
                    value={complianceFilter ?? ""}
                    onChange={(e) => onComplianceFilterChange(e.target.value)}
                    style={{ minWidth: 120 }}
                  >
                    {COMPLIANCE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Active filter chips */}
      {hasOptionalFilters && (
        <div className="d-flex flex-wrap align-items-center gap-1 mt-2">
          <span className="small text-muted">Active:</span>
          {search != null && search !== "" && (
            <span className="badge bg-light text-dark radius-8">Search: {search}</span>
          )}
          {statusFilter != null && statusFilter !== "" && (
            <span className="badge bg-light text-dark radius-8">Status: {statusFilter}</span>
          )}
          {serviceFilter != null && serviceFilter !== "" && (
            <span className="badge bg-light text-dark radius-8">Service</span>
          )}
          {specialtyFilter != null && specialtyFilter !== "" && (
            <span className="badge bg-light text-dark radius-8">Specialty</span>
          )}
          {((dateFrom != null && dateFrom !== "") || (dateTo != null && dateTo !== "")) && (
            <span className="badge bg-light text-dark radius-8">Date range</span>
          )}
          {complianceFilter != null && complianceFilter !== "" && (
            <span className="badge bg-light text-dark radius-8">Compliance</span>
          )}
        </div>
      )}
    </div>
  );
}
