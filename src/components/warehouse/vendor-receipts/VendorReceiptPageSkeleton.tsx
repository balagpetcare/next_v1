"use client";

import { VendorReceiptTableSkeleton } from "./VendorReceiptTableSkeleton";

export function VendorReceiptPageSkeleton() {
  return (
    <div className="container-fluid py-3">
      <div className="d-flex flex-wrap justify-content-between gap-3 mb-4">
        <div>
          <div className="placeholder-glow mb-2">
            <span className="placeholder col-8 col-md-5 rounded" style={{ height: 14 }} />
          </div>
          <span className="placeholder col-6 col-md-4 rounded mb-2 d-block" style={{ height: 22 }} />
          <span className="placeholder col-10 col-md-6 rounded d-block" style={{ height: 14 }} />
        </div>
        <div className="d-flex gap-2">
          <span className="placeholder rounded" style={{ width: 140, height: 31 }} />
          <span className="placeholder rounded" style={{ width: 130, height: 31 }} />
        </div>
      </div>
      <div className="row g-3 mb-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="col-6 col-xl-3">
            <div className="card radius-12 border h-100">
              <div className="card-body py-3 px-3">
                <span className="placeholder col-9 rounded mb-3 d-block" style={{ height: 12 }} />
                <span className="placeholder col-5 rounded d-block" style={{ height: 30 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="placeholder-glow mb-3">
        <span className="placeholder col-12 rounded" style={{ height: 42 }} />
      </div>
      <div className="card radius-12 border mb-4">
        <div className="card-body py-3 px-3">
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <span className="placeholder col-12 rounded d-block" style={{ height: 31 }} />
            </div>
            <div className="col-6 col-md-3">
              <span className="placeholder col-12 rounded d-block" style={{ height: 31 }} />
            </div>
            <div className="col-6 col-md-3">
              <span className="placeholder col-12 rounded d-block" style={{ height: 31 }} />
            </div>
          </div>
        </div>
      </div>
      <VendorReceiptTableSkeleton />
    </div>
  );
}
