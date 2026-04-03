"use client";

import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

export default function NetworkCommandInboundPage() {
  return (
    <>
      <PageHeader
        title="Inbound & supplier"
        subtitle="Purchase order backlog and recent GRN velocity — explainable counts only."
      />
      <div className="row g-3">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Open purchase orders</h5>
              <Link
                href="/owner/inventory/network-command/drilldown?kpiKey=INBOUND_OPEN_PURCHASE_ORDERS"
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
              <h5 className="card-title">Receipts</h5>
              <p className="text-muted small">Use receipts workflow for GRN detail.</p>
              <Link href="/owner/inventory/receipts" className="btn btn-outline-primary btn-sm">
                Open receipts
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
