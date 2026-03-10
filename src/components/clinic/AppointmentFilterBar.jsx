"use client";

import { useState, useEffect, useCallback } from "react";

const DATE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "last7", label: "Last 7 Days" },
  { value: "next7", label: "Next 7 Days" },
  { value: "last30", label: "Last 30 Days" },
  { value: "next30", label: "Next 30 Days" },
  { value: "thisWeek", label: "This Week" },
  { value: "nextWeek", label: "Next Week" },
  { value: "thisMonth", label: "This Month" },
  { value: "nextMonth", label: "Next Month" },
];

const STATUS_OPTIONS = [
  "DRAFT", "PRE_BOOKED", "BOOKED", "CONFIRMED", "CHECKED_IN",
  "IN_QUEUE", "CALLED", "IN_CONSULT", "COMPLETED", "CANCELLED", "NO_SHOW",
];

const VISIT_TYPES = [
  { value: "WALK_IN", label: "Walk-in" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "EMERGENCY", label: "Emergency" },
];

const PAYMENT_OPTIONS = [
  { value: "UNPAID", label: "Unpaid" },
  { value: "PARTIAL", label: "Partially Paid" },
  { value: "PAID", label: "Paid" },
  { value: "WAIVED", label: "Waived" },
];

const SOURCE_OPTIONS = [
  { value: "COUNTER", label: "Counter" },
  { value: "PHONE", label: "Phone" },
  { value: "ONLINE", label: "Online" },
];

const PRIORITY_OPTIONS = [
  { value: "NORMAL", label: "Normal" },
  { value: "VIP", label: "VIP" },
  { value: "EMERGENCY", label: "Emergency" },
];

/**
 * Advanced filter + search panel for Appointment Operations Dashboard.
 * Date presets, status/doctor/service/visit/payment/source/priority filters, debounced search.
 */
export default function AppointmentFilterBar({
  datePreset,
  fromDate,
  toDate,
  onDatePresetChange,
  onDateRangeChange,
  statuses,
  onStatusesChange,
  doctorId,
  onDoctorIdChange,
  serviceId,
  onServiceIdChange,
  visitType,
  onVisitTypeChange,
  paymentStatus,
  onPaymentStatusChange,
  source,
  onSourceChange,
  priority,
  onPriorityChange,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  doctors = [],
  services = [],
  canManage,
  onCreateWalkIn,
  onCreatePhone,
  onCreateOnline,
  onExport,
  showMoreFilters,
  onShowMoreFiltersChange,
}) {
  const [searchInput, setSearchInput] = useState(searchQuery ?? "");
  const [customRangeOpen, setCustomRangeOpen] = useState(false);

  useEffect(() => {
    setSearchInput(searchQuery ?? "");
  }, [searchQuery]);

  const debounceMs = 500;
  useEffect(() => {
    if (typeof onSearchChange !== "function") return;
    const t = setTimeout(() => {
      if (searchInput.trim() !== (searchQuery ?? "").trim()) {
        onSearchChange(searchInput.trim());
      }
    }, debounceMs);
    return () => clearTimeout(t);
  }, [searchInput, debounceMs]);

  const toggleStatus = useCallback((s) => {
    const next = statuses?.includes(s) ? statuses.filter((x) => x !== s) : [...(statuses ?? []), s];
    onStatusesChange?.(next);
  }, [statuses, onStatusesChange]);

  return (
    <div className="mb-3">
      {/* Date presets */}
      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <span className="text-secondary small me-1">Date:</span>
        <div className="btn-group btn-group-sm flex-wrap">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              className={`btn ${datePreset === p.value ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => onDatePresetChange?.(p.value)}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            className={`btn ${datePreset === "custom" || customRangeOpen ? "btn-primary" : "btn-outline-secondary"}`}
            onClick={() => {
              setCustomRangeOpen(!customRangeOpen);
              if (!customRangeOpen) onDatePresetChange?.("custom");
            }}
          >
            Custom
          </button>
        </div>
        {customRangeOpen && (
          <div className="d-flex align-items-center gap-2">
            <input
              type="date"
              className="form-control form-control-sm"
              style={{ width: 140 }}
              value={fromDate ?? ""}
              onChange={(e) => onDateRangeChange?.({ fromDate: e.target.value || undefined, toDate })}
            />
            <span className="text-muted">to</span>
            <input
              type="date"
              className="form-control form-control-sm"
              style={{ width: 140 }}
              value={toDate ?? ""}
              onChange={(e) => onDateRangeChange?.({ fromDate, toDate: e.target.value || undefined })}
            />
          </div>
        )}
      </div>

      {/* Search + primary filters row */}
      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <div className="d-flex gap-1">
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Search by ID, token, phone, name…"
            style={{ width: 240 }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onSearchSubmit?.())}
          />
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => onSearchSubmit?.()} disabled={!searchInput.trim()}>
            Search
          </button>
          {searchInput && (
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => { setSearchInput(""); onSearchChange?.(""); }}>
              Clear
            </button>
          )}
        </div>
        <select
          className="form-select form-select-sm"
          style={{ width: 150 }}
          value={doctorId ?? ""}
          onChange={(e) => onDoctorIdChange?.(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">All doctors</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>{d.displayName ?? d.name}</option>
          ))}
        </select>
        <select
          className="form-select form-select-sm"
          style={{ width: 150 }}
          value={serviceId ?? ""}
          onChange={(e) => onServiceIdChange?.(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">All services</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => onShowMoreFiltersChange?.(!showMoreFilters)}
        >
          {showMoreFilters ? "Hide filters" : "More filters"}
        </button>
        {onExport && (
          <button type="button" className="btn btn-outline-success btn-sm" onClick={onExport}>
            Export CSV
          </button>
        )}
        {canManage && (
          <div className="d-flex gap-2 ms-auto">
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={onCreateWalkIn}>Walk-in</button>
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={onCreatePhone}>Phone</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={onCreateOnline}>New appointment</button>
          </div>
        )}
      </div>

      {/* Collapsible more filters */}
      {showMoreFilters && (
        <div className="border rounded p-2 mb-2 bg-light">
          <div className="small text-secondary mb-2">Status (multi-select)</div>
          <div className="d-flex flex-wrap gap-1 mb-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                className={`btn btn-sm ${statuses?.includes(s) ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => toggleStatus(s)}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="d-flex flex-wrap gap-3 align-items-center">
            <div>
              <label className="small text-secondary me-1">Visit type</label>
              <select
                className="form-select form-select-sm"
                style={{ width: 120 }}
                value={visitType ?? ""}
                onChange={(e) => onVisitTypeChange?.(e.target.value || undefined)}
              >
                <option value="">Any</option>
                {VISIT_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="small text-secondary me-1">Payment</label>
              <select
                className="form-select form-select-sm"
                style={{ width: 120 }}
                value={paymentStatus ?? ""}
                onChange={(e) => onPaymentStatusChange?.(e.target.value || undefined)}
              >
                <option value="">Any</option>
                {PAYMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="small text-secondary me-1">Source</label>
              <select
                className="form-select form-select-sm"
                style={{ width: 120 }}
                value={source ?? ""}
                onChange={(e) => onSourceChange?.(e.target.value || undefined)}
              >
                <option value="">Any</option>
                {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="small text-secondary me-1">Priority</label>
              <select
                className="form-select form-select-sm"
                style={{ width: 120 }}
                value={priority ?? ""}
                onChange={(e) => onPriorityChange?.(e.target.value || undefined)}
              >
                <option value="">Any</option>
                {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
