"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import {
  grnPrintUrl,
  purchaseOrderPrintUrl,
  vendorReceiptPrintUrl,
} from "@/lib/api";
import {
  staffVendorReceiptDetailPath,
  staffWarehouseReceivePoQueryPath,
} from "@/lib/staffInventoryRoutes";
import type { VendorReceiptGrnRow } from "@/src/lib/vendorReceiptTypes";
import { grnRowHasLineDiscrepancy } from "@/src/lib/vendorReceiptTypes";
import { useToast } from "@/src/hooks/useToast";

export function VendorReceiptRowActions(props: {
  branchId: string;
  grn: VendorReceiptGrnRow;
  isManager: boolean;
}) {
  const { branchId, grn, isManager } = props;
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const poId = grn.purchaseOrder?.id;
  const voided = grn.status === "VOIDED";
  const posted = grn.status === "RECEIVED";
  const sess = grn.vendorReceiveSession?.status;
  const awaiting = sess === "AWAITING_CONFIRMATION";
  const draftSess = sess === "DRAFT" || sess == null;
  const hasDisc = grnRowHasLineDiscrepancy(grn);

  const receivePoHref =
    poId != null
      ? staffWarehouseReceivePoQueryPath(branchId, { purchaseOrderId: poId })
      : `/staff/branch/${branchId}/warehouse/receive-po`;

  const detailHref = staffVendorReceiptDetailPath(branchId, grn.id);
  const detailConfirmHref = staffVendorReceiptDetailPath(branchId, grn.id, { focus: "confirm" });
  const detailDiscHref = staffVendorReceiptDetailPath(branchId, grn.id, { focus: "discrepancy" });

  const copyRef = async () => {
    const line = [`GRN #${grn.id}`, poId != null ? `PO #${grn.purchaseOrder?.poNumber ?? poId}` : null]
      .filter(Boolean)
      .join(" · ");
    try {
      await navigator.clipboard.writeText(line);
      toast.success("Reference copied.");
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const openPrint = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="dropdown" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary radius-8 dropdown-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Row actions"
      >
        <i className="ri-more-2-fill" aria-hidden />
      </button>
      {open ? (
        <ul className="dropdown-menu dropdown-menu-end show radius-8 shadow-sm" style={{ zIndex: 1080 }}>
          <li>
            <Link className="dropdown-item" href={detailHref} onClick={() => setOpen(false)}>
              View details
            </Link>
          </li>
          {!voided && !posted && (draftSess || awaiting) ? (
            <li>
              <Link
                className="dropdown-item"
                href={poId != null ? receivePoHref : detailHref}
                onClick={() => setOpen(false)}
              >
                Continue receive
              </Link>
            </li>
          ) : null}
          {!voided && awaiting ? (
            <li>
              <Link className="dropdown-item" href={detailConfirmHref} onClick={() => setOpen(false)}>
                Review / confirm
              </Link>
            </li>
          ) : null}
          {poId != null ? (
            <li>
              <Link className="dropdown-item" href={receivePoHref} onClick={() => setOpen(false)}>
                View linked PO (receive workspace)
              </Link>
            </li>
          ) : null}
          {poId != null ? (
            <li>
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  openPrint(purchaseOrderPrintUrl(poId, "po"));
                  setOpen(false);
                }}
              >
                Print purchase order
              </button>
            </li>
          ) : null}
          {!voided ? (
            <li>
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  openPrint(vendorReceiptPrintUrl(grn.id, "grn"));
                  setOpen(false);
                }}
              >
                Print GRN
              </button>
            </li>
          ) : null}
          {!voided ? (
            <li>
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  openPrint(vendorReceiptPrintUrl(grn.id, "delivery-note"));
                  setOpen(false);
                }}
              >
                Print delivery note
              </button>
            </li>
          ) : null}
          {!voided && hasDisc ? (
            <li>
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  openPrint(grnPrintUrl(grn.id, "discrepancy"));
                  setOpen(false);
                }}
              >
                Print discrepancy report
              </button>
            </li>
          ) : null}
          {isManager && awaiting && hasDisc ? (
            <li>
              <Link className="dropdown-item" href={detailDiscHref} onClick={() => setOpen(false)}>
                Reconcile discrepancy
              </Link>
            </li>
          ) : null}
          <li>
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                void copyRef();
                setOpen(false);
              }}
            >
              Copy GRN / PO reference
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
