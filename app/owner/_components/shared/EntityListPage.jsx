"use client";

import { useState, useMemo, cloneElement, isValidElement } from "react";
import Link from "next/link";
import PageHeader from "@/src/bpa/components/ui/PageHeader";
import EntityFilters from "./EntityFilters";
import EntityTable from "./EntityTable";
import EntityStats from "./EntityStats";

/**
 * Base list page component for entities
 * Provides consistent layout with header, filters, stats, and table
 */
export default function EntityListPage({
  title,
  subtitle,
  entityType,
  config,
  data = [],
  loading = false,
  error = null,
  stats = null,
  onCreateHref,
  onCreateLabel = "Create New",
  onRefresh,
  filters = {},
  onFilterChange,
  renderCustomActions,
  renderCustomHeader,
  viewMode = "table", // 'table' | 'card'
  onViewModeChange,
  tableProps = {},
  children, // Custom content before table
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredData = useMemo(() => {
    let result = data;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) => {
        // Search in common fields
        const searchableFields = [
          item.name,
          item.email,
          item.phone,
          item.status,
          item.verificationStatus,
          item.id?.toString(),
        ].filter(Boolean);
        return searchableFields.some((field) =>
          String(field).toLowerCase().includes(query)
        );
      });
    }

    // Apply status filter
    if (filters.status && filters.status !== "ALL") {
      result = result.filter((item) => {
        const itemStatus = String(item.status || "").toUpperCase();
        return itemStatus === String(filters.status).toUpperCase();
      });
    }

    // Apply verification status filter
    if (filters.verificationStatus && filters.verificationStatus !== "ALL") {
      result = result.filter((item) => {
        const itemVerificationStatus = String(
          item.verificationStatus || "DRAFT"
        ).toUpperCase();
        return (
          itemVerificationStatus ===
          String(filters.verificationStatus).toUpperCase()
        );
      });
    }

    return result;
  }, [data, searchQuery, filters]);

  return (
    <div className="dashboard-main-body">
      {/* Page Header */}
      {renderCustomHeader ? (
        renderCustomHeader()
      ) : (
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
          <div>
            <h5 className="mb-1">{title}</h5>
            {subtitle && <p className="text-muted mb-0">{subtitle}</p>}
          </div>
          <div className="d-flex gap-2 flex-wrap">
            {renderCustomActions && renderCustomActions()}
            {onCreateHref && (
              <Link href={onCreateHref} className="btn btn-primary radius-12">
                + {onCreateLabel}
              </Link>
            )}
            {onRefresh && (
              <button
                className="btn btn-outline-secondary radius-12"
                onClick={onRefresh}
                disabled={loading}
              >
                <i className="ri-refresh-line me-1" />
                Refresh
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && <EntityStats stats={stats} className="mb-4" />}

      {/* Filters */}
      {config?.filters && (
        <EntityFilters
          config={config}
          filters={filters}
          onFilterChange={onFilterChange}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          className="mb-4"
        />
      )}

      {/* Custom Content */}
      {children && isValidElement(children)
        ? cloneElement(children, { data: filteredData })
        : children}

      {/* Error Display */}
      {error && (
        <div className="alert alert-danger radius-12 mb-4">{error}</div>
      )}

      {/* Table/Card View */}
      {loading ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <div className="mt-2 text-muted">Loading...</div>
          </div>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="text-muted">
              {searchQuery
                ? "No results found for your search."
                : `No ${config?.plural || entityType} found.`}
            </div>
            {onCreateHref && !searchQuery && (
              <Link
                href={onCreateHref}
                className="btn btn-primary radius-12 mt-3"
              >
                + {onCreateLabel}
              </Link>
            )}
          </div>
        </div>
      ) : (
        <EntityTable
          data={filteredData}
          config={config}
          entityType={entityType}
          viewMode={viewMode}
          {...tableProps}
        />
      )}
    </div>
  );
}
