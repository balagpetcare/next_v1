"use client";

import Link from "next/link";
import { grnPrintUrl, purchaseOrderPrintUrl, vendorReceiptPrintUrl } from "@/lib/api";
import { staffWarehouseReceivePoQueryPath } from "@/lib/staffInventoryRoutes";
import type { VendorReceiptGrnRow } from "@/src/lib/vendorReceiptTypes";
import { grnRowHasLineDiscrepancy } from "@/src/lib/vendorReceiptTypes";

export function VendorReceiptDocumentsPanel(props: { branchId: string; grn: VendorReceiptGrnRow }) {
  const { branchId, grn } = props;
  const poId = grn.purchaseOrder?.id;
  const hasDisc = grnRowHasLineDiscrepancy(grn);
  const voided = grn.status === "VOIDED";
  const poWorkspace = poId != null ? staffWarehouseReceivePoQueryPath(branchId, { purchaseOrderId: poId }) : null;

  return (
    <div className="card radius-12 border mb-0">
      <div className="card-header py-2 px-3">
        <h6 className="mb-0 fw-semibold">Documents</h6>
      </div>
      <div className="card-body py-3 px-3">
        <div className="d-flex flex-wrap gap-2">
          {poWorkspace ? (
            <Link href={poWorkspace} className="btn btn-sm btn-outline-primary">
              <i className="ri-external-link-line me-1" />
              Linked PO workspace
            </Link>
          ) : null}
          {poId != null ? (
            <a
              href={purchaseOrderPrintUrl(poId, "po")}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-outline-secondary"
            >
              <i className="ri-printer-line me-1" />
              Print PO
            </a>
          ) : null}
          {!voided ? (
            <a
              href={vendorReceiptPrintUrl(grn.id, "grn")}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-outline-secondary"
            >
              <i className="ri-printer-line me-1" />
              Print GRN
            </a>
          ) : null}
          {!voided ? (
            <a
              href={vendorReceiptPrintUrl(grn.id, "delivery-note")}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-outline-secondary"
            >
              <i className="ri-truck-line me-1" />
              Delivery note
            </a>
          ) : null}
          {!voided && hasDisc ? (
            <a
              href={grnPrintUrl(grn.id, "discrepancy")}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-outline-warning"
            >
              <i className="ri-error-warning-line me-1" />
              Discrepancy report
            </a>
          ) : null}
        </div>
        {voided ? <p className="text-muted small mt-3 mb-0">This GRN is voided — print actions are disabled.</p> : null}
      </div>
    </div>
  );
}
