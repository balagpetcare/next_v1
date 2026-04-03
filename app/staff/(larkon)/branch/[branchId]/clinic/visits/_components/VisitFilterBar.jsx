"use client";

/**
 * Filters for clinic visits list — mirrors appointments filter bar patterns (WowDash).
 */
export default function VisitFilterBar({
  search,
  onSearchChange,
  fromDate,
  toDate,
  onFromChange,
  onToChange,
  doctorId,
  doctors,
  onDoctorChange,
  hasAppointment,
  onHasAppointmentChange,
  treatmentCode,
  onTreatmentCodeChange,
  sortField,
  sortDir,
  onSortFieldChange,
  onSortDirChange,
  onApply,
  onExportCsv,
  exporting,
}) {
  return (
    <div className="card radius-12 mb-3">
      <div className="card-body py-3">
        <div className="row g-2 align-items-end">
          <div className="col-12 col-md-4 col-lg-3">
            <label className="form-label small mb-1">Search</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Pet, owner, treatment #"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <div className="col-6 col-md-2 col-lg-2">
            <label className="form-label small mb-1">From</label>
            <input type="date" className="form-control form-control-sm" value={fromDate} onChange={(e) => onFromChange(e.target.value)} />
          </div>
          <div className="col-6 col-md-2 col-lg-2">
            <label className="form-label small mb-1">To</label>
            <input type="date" className="form-control form-control-sm" value={toDate} onChange={(e) => onToChange(e.target.value)} />
          </div>
          <div className="col-12 col-md-4 col-lg-2">
            <label className="form-label small mb-1">Doctor</label>
            <select className="form-select form-select-sm" value={doctorId} onChange={(e) => onDoctorChange(e.target.value)}>
              <option value="">All doctors</option>
              {(doctors ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-4 col-lg-2">
            <label className="form-label small mb-1">Appointment</label>
            <select className="form-select form-select-sm" value={hasAppointment} onChange={(e) => onHasAppointmentChange(e.target.value)}>
              <option value="">All</option>
              <option value="yes">Scheduled (has appt)</option>
              <option value="no">Walk-in (no appt)</option>
            </select>
          </div>
          <div className="col-6 col-md-2 col-lg-1">
            <label className="form-label small mb-1">Sort</label>
            <select className="form-select form-select-sm" value={sortField} onChange={(e) => onSortFieldChange(e.target.value)}>
              <option value="createdAt">Created</option>
              <option value="startedAt">Started</option>
              <option value="completedAt">Completed</option>
            </select>
          </div>
          <div className="col-6 col-md-2 col-lg-1">
            <label className="form-label small mb-1">Dir</label>
            <select className="form-select form-select-sm" value={sortDir} onChange={(e) => onSortDirChange(e.target.value)}>
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>
          <div className="col-12 col-md-4 col-lg-2">
            <label className="form-label small mb-1">Treatment #</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="TRT-…"
              value={treatmentCode}
              onChange={(e) => onTreatmentCodeChange(e.target.value)}
            />
          </div>
          <div className="col-12 d-flex flex-wrap gap-2 mt-2">
            <button type="button" className="btn btn-primary btn-sm" onClick={onApply}>
              Apply filters
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={exporting}
              onClick={onExportCsv}
            >
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
