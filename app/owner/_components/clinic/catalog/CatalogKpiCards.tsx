"use client";

import type { CatalogKpiStats } from "./catalogConstants";

type CatalogKpiCardsProps = {
  stats: CatalogKpiStats;
};

export default function CatalogKpiCards({ stats }: CatalogKpiCardsProps) {
  return (
    <div className="row g-3 mb-4">
      <div className="col-6 col-md-4 col-lg-2">
        <div className="card radius-12 p-3 h-100">
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <div className="fw-semibold fs-5">{stats.total}</div>
              <small className="text-muted">Total items</small>
            </div>
            <i className="ri-archive-line fs-4 text-primary" aria-hidden />
          </div>
        </div>
      </div>
      <div className="col-6 col-md-4 col-lg-2">
        <div className="card radius-12 p-3 h-100">
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <div className="fw-semibold fs-5">{stats.active}</div>
              <small className="text-muted">Active</small>
            </div>
            <i className="ri-checkbox-circle-line fs-4 text-success" aria-hidden />
          </div>
        </div>
      </div>
      <div className="col-6 col-md-4 col-lg-2">
        <div className="card radius-12 p-3 h-100">
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <div className="fw-semibold fs-5">{stats.procedureLinked}</div>
              <small className="text-muted">Procedure-linked</small>
            </div>
            <i className="ri-link fs-4 text-info" aria-hidden />
          </div>
        </div>
      </div>
      <div className="col-6 col-md-4 col-lg-2">
        <div className="card radius-12 p-3 h-100">
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <div className="fw-semibold fs-5">{stats.sterile}</div>
              <small className="text-muted">Sterile</small>
            </div>
            <i className="ri-temp-cold-line fs-4 text-info" aria-hidden />
          </div>
        </div>
      </div>
      <div className="col-6 col-md-4 col-lg-2">
        <div className="card radius-12 p-3 h-100">
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <div className="fw-semibold fs-5">{stats.wastageTracked}</div>
              <small className="text-muted">Wastage-tracked</small>
            </div>
            <i className="ri-error-warning-line fs-4 text-warning" aria-hidden />
          </div>
        </div>
      </div>
      <div className="col-6 col-md-4 col-lg-2">
        <div className="card radius-12 p-3 h-100">
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <div className="fw-semibold fs-5">{stats.incompleteOrAlerts}</div>
              <small className="text-muted">Incomplete / Alerts</small>
            </div>
            <i className="ri-alert-line fs-4 text-warning" aria-hidden />
          </div>
        </div>
      </div>
    </div>
  );
}
