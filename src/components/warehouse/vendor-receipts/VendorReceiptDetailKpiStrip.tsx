"use client";

import Link from "next/link";
import type { VendorReceiptGrnRow } from "@/src/lib/vendorReceiptTypes";
import { computeVendorReceiptQtyTotals, grnRowHasLineDiscrepancy } from "@/src/lib/vendorReceiptTypes";
import { vendorReceiptStatusLabel } from "@/src/components/warehouse/vendor-receipts/VendorReceiptStatusBadge";
import { staffWarehouseReceivePoQueryPath } from "@/lib/staffInventoryRoutes";

export function VendorReceiptDetailKpiStrip(props: { branchId: string; grn: VendorReceiptGrnRow }) {
  const { branchId, grn } = props;
  const t = computeVendorReceiptQtyTotals(grn);
  const disc = grnRowHasLineDiscrepancy(grn);
  const poId = grn.purchaseOrder?.id;
  const poHref = poId != null ? staffWarehouseReceivePoQueryPath(branchId, { purchaseOrderId: poId }) : null;
  const stage = vendorReceiptStatusLabel(grn);

  const cards: { label: string; value: string; hint?: string }[] = [
    { label: "SKU lines", value: String(grn.lines?.length ?? 0) },
    {
      label: "Expected qty",
      value: t.totalExpected > 0 ? String(t.totalExpected) : "—",
      hint: t.totalExpected > 0 ? "From PO lines" : undefined,
    },
    {
      label: "Received qty",
      value: String(t.totalReceived),
      hint: "Incl. extras counted toward posting",
    },
    {
      label: "Discrepancy lines",
      value: disc ? "Yes" : "None",
      hint: disc ? "Damage, short, excess, or notes" : undefined,
    },
    { label: "Receive stage", value: stage },
  ];

  return (
    <div className="row g-3 mb-4">
      {cards.map((c) => (
        <div key={c.label} className="col-6 col-md-4 col-xl-2">
          <div className="card radius-12 border h-100">
            <div className="card-body py-3 px-3">
              <div className="text-muted text-uppercase small mb-1" style={{ fontSize: "0.68rem", letterSpacing: "0.04em" }}>
                {c.label}
              </div>
              <div className="fw-semibold fs-6 mb-0">{c.value}</div>
              {c.hint ? <div className="small text-muted mt-1 mb-0">{c.hint}</div> : null}
            </div>
          </div>
        </div>
      ))}
      {poHref ? (
        <div className="col-6 col-md-4 col-xl-2">
          <div className="card radius-12 border h-100">
            <div className="card-body py-3 px-3 d-flex flex-column justify-content-between">
              <div className="text-muted text-uppercase small mb-1" style={{ fontSize: "0.68rem", letterSpacing: "0.04em" }}>
                Linked PO
              </div>
              <div className="fw-semibold mb-2">{grn.purchaseOrder?.poNumber ?? `#${poId}`}</div>
              <Link href={poHref} className="btn btn-sm btn-outline-primary align-self-start">
                Open receive workspace
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
