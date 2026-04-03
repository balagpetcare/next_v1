"use client";

import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

export default function NetworkCommandFulfillmentPage() {
  return (
    <>
      <PageHeader
        title="Fulfillment pulse"
        subtitle="Stock requests, dispatches, and warehouse transfer pipeline — drill into live rows (read-only)."
      />
      <div className="row g-3">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Open stock requests</h5>
              <p className="text-muted small">Non-terminal stock request statuses across the org.</p>
              <Link
                href="/owner/inventory/network-command/drilldown?kpiKey=FULFILLMENT_OPEN_STOCK_REQUESTS"
                className="btn btn-primary btn-sm"
              >
                Drill down
              </Link>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Dispatch discrepancies</h5>
              <p className="text-muted small">Pending receive/short/damage investigations.</p>
              <Link
                href="/owner/inventory/network-command/drilldown?kpiKey=SLA_DISPATCH_DISCREPANCY_OPEN"
                className="btn btn-primary btn-sm"
              >
                Drill down
              </Link>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 small text-muted">
        Dispatches in flight and WTO pipeline counts appear on the overview. Operational changes still use stock request / dispatch screens.
      </p>
    </>
  );
}
