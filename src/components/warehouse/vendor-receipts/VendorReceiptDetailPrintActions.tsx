"use client";

import { grnPrintUrl, vendorReceiptPrintUrl } from "@/lib/api";

export function VendorReceiptDetailPrintActions(props: { grnId: number; hasDiscrepancy: boolean }) {
  const { grnId, hasDiscrepancy } = props;
  return (
    <div className="d-flex flex-wrap gap-2 mb-4">
      <a
        href={vendorReceiptPrintUrl(grnId, "grn")}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-sm btn-outline-secondary"
      >
        <i className="ri-printer-line me-1" />
        Print GRN
      </a>
      <a
        href={vendorReceiptPrintUrl(grnId, "delivery-note")}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-sm btn-outline-secondary"
      >
        <i className="ri-truck-line me-1" />
        Print delivery note
      </a>
      {hasDiscrepancy ? (
        <a
          href={grnPrintUrl(grnId, "discrepancy")}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-sm btn-outline-warning"
        >
          <i className="ri-error-warning-line me-1" />
          Discrepancy report
        </a>
      ) : null}
    </div>
  );
}
