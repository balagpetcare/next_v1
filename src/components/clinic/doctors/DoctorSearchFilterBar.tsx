"use client";

type Props = {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (v: string) => void;
  onReset?: () => void;
  onSavePreset?: () => void;
  className?: string;
};

export default function DoctorSearchFilterBar({
  search,
  onSearchChange,
  statusFilter = "",
  onStatusFilterChange,
  onReset,
  onSavePreset,
  className = "",
}: Props) {
  return (
    <div className={`card radius-12 mb-3 ${className}`}>
      <div className="card-body p-24">
        <div className="row align-items-center g-2 flex-wrap">
          <div className="col-12 col-md-4 col-lg-3">
            <input
              type="search"
              className="form-control form-control-sm radius-8"
              placeholder="Search by name, phone, doctor code..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Search doctors"
            />
          </div>
          <div className="col-12 col-md-3 col-lg-2">
            <select
              className="form-select form-select-sm radius-8 w-auto"
              value={statusFilter}
              onChange={(e) => onStatusFilterChange?.(e.target.value)}
              aria-label="Status filter"
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div className="col-12 col-md d-flex gap-2 flex-wrap">
            {onReset && (
              <button type="button" className="btn btn-outline-secondary btn-sm radius-8" onClick={onReset}>
                Reset filters
              </button>
            )}
            {onSavePreset && (
              <button type="button" className="btn btn-outline-primary btn-sm radius-8" onClick={onSavePreset}>
                Save filter preset
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
