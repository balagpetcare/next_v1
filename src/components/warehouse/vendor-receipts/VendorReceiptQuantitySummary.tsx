"use client";

import type { VendorReceiptGrnRow } from "@/src/lib/vendorReceiptTypes";
import { computeVendorReceiptQtyTotals } from "@/src/lib/vendorReceiptTypes";

export function VendorReceiptQuantitySummary({ grn }: { grn: VendorReceiptGrnRow }) {
  const t = computeVendorReceiptQtyTotals(grn);
  return (
    <div className="card radius-12 border mb-4">
      <div className="card-header py-2 px-3">
        <h6 className="mb-0 fw-semibold">Summary</h6>
      </div>
      <div className="card-body py-3 px-3">
        <div className="row g-3 text-center small">
          <div className="col-6 col-md-3">
            <div className="text-muted text-uppercase fw-medium mb-1" style={{ letterSpacing: "0.04em" }}>
              Total expected
            </div>
            <div className="fs-5 fw-semibold">{t.totalExpected}</div>
          </div>
          <div className="col-6 col-md-3">
            <div className="text-muted text-uppercase fw-medium mb-1" style={{ letterSpacing: "0.04em" }}>
              Total received
            </div>
            <div className="fs-5 fw-semibold text-success">{t.totalReceived}</div>
          </div>
          <div className="col-12 col-md-6">
            <div className="text-muted text-uppercase fw-medium mb-1" style={{ letterSpacing: "0.04em" }}>
              Total discrepancy
            </div>
            <div className="fs-5 fw-semibold text-warning">{t.totalDiscrepancyUnits}</div>
            <p className="text-muted mb-0 mt-2 small">
              Damage {t.totalDamage} · Short {t.totalShort}
              {t.totalExtra > 0 ? ` · Extra ${t.totalExtra}` : ""}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
