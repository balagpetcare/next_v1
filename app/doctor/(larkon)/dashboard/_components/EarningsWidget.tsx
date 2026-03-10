"use client";

import Link from "next/link";

export function EarningsWidget({
  todayEarnings,
  settlement,
}: {
  todayEarnings: number;
  settlement: { pendingAmount?: number; pendingCount?: number } | null;
}) {
  return (
    <div className="card radius-12 h-100">
      <div className="card-header d-flex align-items-center justify-content-between">
        <h6 className="mb-0">Earnings Snapshot</h6>
        <Link href="/doctor/settlement" className="btn btn-sm btn-outline-primary radius-12">
          Settlement
        </Link>
      </div>
      <div className="card-body">
        <div className="row g-3">
          <div className="col-6">
            <div className="border rounded-3 p-3">
              <div className="small text-muted">Today's Earnings</div>
              <div className="h5 text-success mb-0">BDT {Number(todayEarnings || 0).toFixed(2)}</div>
            </div>
          </div>
          <div className="col-6">
            <div className="border rounded-3 p-3">
              <div className="small text-muted">Pending Settlement</div>
              <div className="h5 text-warning mb-0">BDT {Number(settlement?.pendingAmount || 0).toFixed(2)}</div>
              <div className="small text-muted">{settlement?.pendingCount ?? 0} entries</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
