'use client'

import { ReactNode } from 'react'

export type AdminFilterConfig = {
  key: string
  label: string
  render: (value: string, onChange: (value: string) => void) => ReactNode
}

type AdminFiltersBarProps = {
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  /** When false, the search input is hidden (e.g. when search is in a separate widget). Default true. */
  showSearch?: boolean
  filters?: AdminFilterConfig[]
  filterValues: Record<string, string>
  onFilterChange: (key: string, value: string) => void
  onReset: () => void
}

export default function AdminFiltersBar({
  searchPlaceholder = 'Search…',
  searchValue = '',
  onSearchChange,
  showSearch = true,
  filters = [],
  filterValues,
  onFilterChange,
  onReset,
}: AdminFiltersBarProps) {
  return (
    <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
      {showSearch && (
        <input
          type="search"
          className="form-control form-control-sm"
          style={{ maxWidth: 260 }}
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          aria-label="Search"
        />
      )}
      {filters.map((f) => (
        <div key={f.key} className="d-flex align-items-center gap-1">
          {f.label ? (
            <label htmlFor={`admin-filter-${f.key}`} className="form-label small text-muted mb-0 me-1">
              {f.label}:
            </label>
          ) : null}
          {f.render(filterValues[f.key] ?? '', (value) => onFilterChange(f.key, value))}
        </div>
      ))}
      <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onReset} aria-label="Reset filters">
        Reset
      </button>
    </div>
  )
}
