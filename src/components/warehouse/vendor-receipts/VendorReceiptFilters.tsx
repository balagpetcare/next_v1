"use client";

export function VendorReceiptFilters(props: {
  search: string;
  onSearchChange: (v: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onClearDates: () => void;
  vendorNames: string[];
  vendorFilter: string;
  onVendorFilterChange: (v: string) => void;
}) {
  const {
    search,
    onSearchChange,
    dateFrom,
    dateTo,
    onDateFromChange,
    onDateToChange,
    onClearDates,
    vendorNames,
    vendorFilter,
    onVendorFilterChange,
  } = props;
  return (
    <div className="card radius-12 border mb-4">
      <div className="card-body py-3 px-3">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-4 col-lg-3">
            <label className="form-label small text-muted mb-1 d-block">Search</label>
            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="GRN #, vendor, PO…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              autoComplete="off"
            />
          </div>
          {vendorNames.length > 0 ? (
            <div className="col-12 col-md-4 col-lg-3">
              <label className="form-label small text-muted mb-1 d-block">Vendor</label>
              <select
                className="form-select form-select-sm"
                value={vendorFilter}
                onChange={(e) => onVendorFilterChange(e.target.value)}
              >
                <option value="">All vendors (this page)</option>
                {vendorNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="col-6 col-md-3 col-lg-2">
            <label className="form-label small text-muted mb-1 d-block">From</label>
            <input type="date" className="form-control form-control-sm" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} />
          </div>
          <div className="col-6 col-md-3 col-lg-2">
            <label className="form-label small text-muted mb-1 d-block">To</label>
            <input type="date" className="form-control form-control-sm" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} />
          </div>
          <div className="col-12 col-md-2 col-lg-2">
            <button type="button" className="btn btn-outline-secondary btn-sm w-100" onClick={onClearDates}>
              Clear dates
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
