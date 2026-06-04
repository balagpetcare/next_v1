"use client";

import Link from "next/link";

export function VendorReceiptEmptyState(props: { branchId: string; tabLabel: string }) {
  const { branchId, tabLabel } = props;
  return (
    <div className="card radius-12 border">
      <div className="card-body text-center py-5 px-4">
        <div className="text-muted mb-4" aria-hidden>
          <i className="ri-inbox-archive-line" style={{ fontSize: "3.25rem", opacity: 0.35 }} />
        </div>
        <h6 className="fw-semibold mb-2">No vendor receipts in {tabLabel}</h6>
        <p className="text-muted small mb-4 mx-auto" style={{ maxWidth: 480 }}>
          Record a purchase receive against a PO, submit for confirmation if required, then post stock from this module.
        </p>
        <ol className="text-start small text-muted mx-auto mb-4 ps-3" style={{ maxWidth: 420 }}>
          <li className="mb-2">
            <strong>Select PO / vendor</strong> — open the receive workspace.
          </li>
          <li className="mb-2">
            <strong>Enter quantities &amp; lots</strong> — save draft or submit for manager confirmation.
          </li>
          <li className="mb-2">
            <strong>Confirm posting</strong> — inventory updates; the GRN appears in History.
          </li>
        </ol>
        <Link href={`/staff/branch/${branchId}/warehouse/receive-po`} className="btn btn-primary btn-sm">
          <i className="ri-add-line me-1" />
          Create new receive
        </Link>
      </div>
    </div>
  );
}
