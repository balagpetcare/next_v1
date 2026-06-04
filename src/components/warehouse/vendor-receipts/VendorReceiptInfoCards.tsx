"use client";

import type { VendorReceiveGrnDraft } from "@/app/staff/(larkon)/branch/[branchId]/warehouse/receive-po/_components/VendorReceiveGrnCard";

export function VendorReceiptInfoCards({ grn }: { grn: VendorReceiveGrnDraft }) {
  const whName = grn.location?.warehouse?.name;
  return (
    <div className="row g-3 mb-4">
      <div className="col-md-4">
        <div className="card radius-12 border h-100">
          <div className="card-header py-2 px-3">
            <h6 className="mb-0 fw-semibold">Vendor</h6>
          </div>
          <div className="card-body small px-3 py-3">
            <p className="mb-1">
              <span className="text-muted d-block mb-1">Name</span>
              <span className="fw-medium">{grn.vendor?.name ?? "—"}</span>
            </p>
            <p className="mb-0 text-muted">Invoice: {grn.invoiceNo ?? "—"}</p>
          </div>
        </div>
      </div>
      <div className="col-md-4">
        <div className="card radius-12 border h-100">
          <div className="card-header py-2 px-3">
            <h6 className="mb-0 fw-semibold">Branch / warehouse</h6>
          </div>
          <div className="card-body small px-3 py-3">
            <p className="mb-1">
              <span className="text-muted d-block mb-1">Branch</span>
              <span className="fw-medium">{grn.location?.branch?.name ?? "—"}</span>
            </p>
            <p className="mb-1">
              <span className="text-muted d-block mb-1">Receiving location</span>
              <span>{grn.location?.name ?? "—"}</span>
            </p>
            {whName ? (
              <p className="mb-0 text-muted">
                Warehouse: <span className="text-body">{whName}</span>
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="col-md-4">
        <div className="card radius-12 border h-100">
          <div className="card-header py-2 px-3">
            <h6 className="mb-0 fw-semibold">Purchase order</h6>
          </div>
          <div className="card-body small px-3 py-3">
            <p className="mb-1">
              <span className="text-muted d-block mb-1">PO number</span>
              <span className="fw-medium">{grn.purchaseOrder?.poNumber ?? "—"}</span>
            </p>
            <p className="mb-0 text-muted">Created: {new Date(grn.createdAt).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
