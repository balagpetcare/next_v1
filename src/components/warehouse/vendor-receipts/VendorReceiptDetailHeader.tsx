"use client";

import Link from "next/link";
import { purchaseOrderPrintUrl, vendorReceiptPrintUrl } from "@/lib/api";
import { staffWarehouseReceivePoQueryPath } from "@/lib/staffInventoryRoutes";
import type { VendorReceiveGrnDraft } from "@/app/staff/(larkon)/branch/[branchId]/warehouse/receive-po/_components/VendorReceiveGrnCard";
import { VendorReceiptStatusBadge } from "./VendorReceiptStatusBadge";
import { asVendorReceiptGrnRow } from "@/src/lib/vendorReceiptTypes";
import { formatVendorReceiptDateTime } from "@/src/lib/vendorReceipt/format";
import { useToast } from "@/src/hooks/useToast";

export function VendorReceiptDetailHeader(props: {
  branchId: string;
  grnId: number;
  listHref: string;
  grn: VendorReceiveGrnDraft | null;
}) {
  const { branchId, grnId, listHref, grn } = props;
  const toast = useToast();
  const row = grn ? asVendorReceiptGrnRow(grn) : null;
  const poId = grn?.purchaseOrder?.id;
  const poHref = poId != null ? staffWarehouseReceivePoQueryPath(branchId, { purchaseOrderId: poId }) : null;
  const voided = grn?.status === "VOIDED";

  const copyIds = async () => {
    const parts = [`GRN #${grnId}`, poId != null ? `PO ${grn?.purchaseOrder?.poNumber ?? poId}` : null].filter(Boolean);
    try {
      await navigator.clipboard.writeText(parts.join(" · "));
      toast.success("Copied GRN / PO reference.");
    } catch {
      toast.error("Could not copy.");
    }
  };

  return (
    <div className="mb-4">
      <nav aria-label="breadcrumb" className="mb-2">
        <ol className="breadcrumb mb-0 small">
          <li className="breadcrumb-item">
            <Link href="/staff">Staff</Link>
          </li>
          <li className="breadcrumb-item">
            <Link href={`/staff/branch/${branchId}/warehouse`}>Warehouse</Link>
          </li>
          <li className="breadcrumb-item">
            <Link href={listHref}>Vendor receipts</Link>
          </li>
          <li className="breadcrumb-item active">GRN #{grnId}</li>
        </ol>
      </nav>

      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
        <div className="flex-grow-1" style={{ minWidth: 240 }}>
          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <Link href={listHref} className="btn btn-sm btn-outline-secondary">
              ← Back
            </Link>
            <h4 className="mb-0 fw-semibold">Vendor receipt · GRN #{grnId}</h4>
            {row ? <VendorReceiptStatusBadge grn={row} /> : null}
          </div>
          {grn ? (
            <>
              <p className="mb-1 fw-medium">{grn.vendor?.name ?? "Vendor —"}</p>
              <p className="text-muted small mb-1">
                PO {grn.purchaseOrder?.poNumber ?? "—"}
                {grn.purchaseOrder?.status ? ` · ${grn.purchaseOrder.status}` : null}
              </p>
              <p className="text-muted small mb-0">
                <span className="me-3">Branch: {grn.location?.branch?.name ?? "—"}</span>
                <span className="me-3">Location: {grn.location?.name ?? "—"}</span>
              </p>
              <p className="text-muted small mt-2 mb-0">
                <span className="me-3">Created {formatVendorReceiptDateTime(grn.createdAt)}</span>
                {grn.receivedAt ? <span>Posted {formatVendorReceiptDateTime(grn.receivedAt)}</span> : null}
              </p>
            </>
          ) : (
            <p className="text-muted small mb-0">Loading record…</p>
          )}
        </div>

        <div className="d-flex flex-wrap gap-2 align-items-center justify-content-end">
          {poHref ? (
            <Link href={poHref} className="btn btn-sm btn-primary">
              <i className="ri-external-link-line me-1" />
              PO workspace
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
          {!voided && grn ? (
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
          <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => void copyIds()}>
            <i className="ri-file-copy-line me-1" />
            Copy IDs
          </button>
        </div>
      </div>
    </div>
  );
}
