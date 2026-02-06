"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

/**
 * Reusable filter component for entity lists
 * Supports search, status filters, and custom filters
 */
export default function EntityFilters({
  config,
  filters = {},
  onFilterChange,
  searchQuery = "",
  onSearchChange,
  className = "",
}) {
  const searchParams = useSearchParams();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFilterChange = (key, value) => {
    if (onFilterChange) {
      // onFilterChange expects (key, value) signature from useEntityFilters
      onFilterChange(key, value);
    }
  };

  const getFilterUrl = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value === "ALL" || !value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    return `?${params.toString()}`;
  };

  // Status filter options
  const statusOptions = [
    "ALL",
    "DRAFT",
    "SUBMITTED",
    "PENDING_REVIEW",
    "APPROVED",
    "VERIFIED",
    "REJECTED",
    "SUSPENDED",
    "ACTIVE",
    "INACTIVE",
  ];

  return (
    <div className={`card radius-12 ${className}`}>
      <div className="card-body">
        <div className="row g-2 align-items-end">
          {/* Search */}
          <div className="col-12 col-md-5">
            <label className="form-label mb-1">Search</label>
            <div className="input-group">
              <input
                type="text"
                className="form-control radius-12"
                placeholder="Search by name, email, phone, ID..."
                value={searchQuery}
                onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              />
              <span className="input-group-text bg-transparent border-0">
                <i className="ri-search-line" />
              </span>
            </div>
          </div>

          {/* Status Filter */}
          {config?.filters?.includes("status") && (
            <div className="col-12 col-md-3">
              <label className="form-label mb-1">Status</label>
              <select
                className="form-select radius-12"
                value={filters.status || "ALL"}
                onChange={(e) => handleFilterChange("status", e.target.value)}
              >
                {statusOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Verification Status Filter */}
          {config?.filters?.includes("verificationStatus") && (
            <div className="col-12 col-md-3">
              <label className="form-label mb-1">Verification</label>
              <select
                className="form-select radius-12"
                value={filters.verificationStatus || "ALL"}
                onChange={(e) =>
                  handleFilterChange("verificationStatus", e.target.value)
                }
              >
                {statusOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Advanced Filters Toggle */}
          {config?.advancedFilters && (
            <div className="col-12 col-md-1">
              <button
                className="btn btn-outline-secondary radius-12 w-100"
                onClick={() => setShowAdvanced(!showAdvanced)}
                type="button"
              >
                <i className={`ri-${showAdvanced ? "arrow-up" : "arrow-down"}-line`} />
              </button>
            </div>
          )}
        </div>

        {/* Advanced Filters */}
        {showAdvanced && config?.advancedFilters && (
          <div className="mt-3 pt-3 border-top">
            <div className="row g-2">
              {config.advancedFilters.map((filter) => (
                <div key={filter.key} className="col-12 col-md-4">
                  <label className="form-label mb-1">{filter.label}</label>
                  {filter.type === "select" ? (
                    <select
                      className="form-select radius-12"
                      value={filters[filter.key] || ""}
                      onChange={(e) =>
                        handleFilterChange(filter.key, e.target.value)
                      }
                    >
                      <option value="">All</option>
                      {filter.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={filter.type || "text"}
                      className="form-control radius-12"
                      placeholder={filter.placeholder}
                      value={filters[filter.key] || ""}
                      onChange={(e) =>
                        handleFilterChange(filter.key, e.target.value)
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Filter Chips */}
        {config?.quickFilters && (
          <div className="mt-3 d-flex flex-wrap gap-2">
            {config.quickFilters.map((filter, idx) => (
              <Link
                key={`${filter.key}-${filter.value}-${idx}`}
                href={getFilterUrl(filter.key, filter.value)}
                className={`btn btn-sm radius-12 ${
                  filters[filter.key] === filter.value
                    ? "btn-primary"
                    : "btn-light"
                }`}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
