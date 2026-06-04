"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { grnSubmitForConfirmation, grnPrintUrl, purchaseOrderPrintUrl, vendorReceiptPrintUrl } from "@/lib/api";
import { staffVendorReceiptDetailPath } from "@/lib/staffInventoryRoutes";
import { useToast } from "@/src/hooks/useToast";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";
import { ManagerReceiveEditor } from "./ManagerReceiveEditor";
import { canConfirmGrn } from "@/src/lib/vendorReceipt/permissions";

export { canExecuteVendorReceive, canConfirmGrn } from "@/src/lib/vendorReceipt/permissions";

export type VendorReceiveGrnDraft = {
  id: number;
  status: string;
  invoiceNo?: string | null;
  invoiceDate?: string | null;
  notes?: string | null;
  createdAt: string;
  receivedAt?: string | null;
  totalQty?: number;
  location?: {
    id?: number;
    name?: string;
    branch?: { name?: string; id?: number } | null;
    warehouse?: { name?: string } | null;
  } | null;
  vendor?: { name: string } | null;
  purchaseOrder?: { id: number; poNumber: string; status?: string } | null;
  vendorReceiveSession?: {
    status: string;
    submittedAt?: string | null;
    confirmedAt?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  } | null;
  lines: Array<{
    id: number;
    quantity: number;
    quantityDamaged: number;
    quantityShort: number;
    quantityExtra?: number;
    lineDiscrepancyNote?: string | null;
    lineRemarks?: string | null;
    variant: { sku: string; title: string };
    lot?: { lotCode?: string; expDate?: string | null } | null;
    purchaseOrderLine?: { orderedQty: number; unitCost?: number | null } | null;
  }>;
};

export function VendorReceiveGrnCard({
  grn,
  perms,
  onRefresh,
  highlight,
  branchId,
  initialOpenManagerEditor,
  hideLinesTable,
  hideVendorReceiptPrints,
  suppressManagerConfirmToast,
}: {
  grn: VendorReceiveGrnDraft;
  perms: string[];
  onRefresh: () => void | Promise<void>;
  highlight?: boolean;
  /** When set, GRN title links to dedicated staff review URL for this branch */
  branchId?: string;
  /** Open manager editor on mount (e.g. queue URL `?grnId=` deep link). */
  initialOpenManagerEditor?: boolean;
  /** Hide embedded lines table when parent page renders its own line breakdown. */
  hideLinesTable?: boolean;
  /** Hide GRN / delivery note / discrepancy print buttons (e.g. detail page provides its own). */
  hideVendorReceiptPrints?: boolean;
  /** Parent shows success toast after confirm (e.g. vendor receipt detail + redirect). */
  suppressManagerConfirmToast?: boolean;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [managerEditorOpen, setManagerEditorOpen] = useState(false);
  const didAutoOpenManagerRef = useRef(false);
  const isManager = canConfirmGrn(perms);
  const sess = grn.vendorReceiveSession;
  const sessStatus = sess?.status;

  useEffect(() => {
    if (didAutoOpenManagerRef.current) return;
    if (
      initialOpenManagerEditor &&
      isManager &&
      grn.status === "DRAFT" &&
      sessStatus !== "POSTED" &&
      sessStatus !== "CANCELLED"
    ) {
      setManagerEditorOpen(true);
      didAutoOpenManagerRef.current = true;
    }
  }, [initialOpenManagerEditor, isManager, grn.status, sessStatus]);

  const handleSubmit = async () => {
    setBusy(true);
    try {
      await grnSubmitForConfirmation(grn.id);
      toast.success("Submitted for manager confirmation.");
      onRefresh();
    } catch (e: unknown) {
      toast.error(getMessageFromApiError(e as Error));
    } finally {
      setBusy(false);
    }
  };

  const hasDiscrepancy = grn.lines.some(
    (l) => l.quantityDamaged > 0 || l.quantityShort > 0 || (l.quantityExtra ?? 0) > 0
  );

  const lineQtySum =
    grn.totalQty != null
      ? grn.totalQty
      : grn.lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0);

  const titleBadges = (
    <span className="d-inline-flex align-items-center flex-wrap gap-1">
      <span className="fw-semibold">GRN #{grn.id}</span>
      <span className={`badge ${grn.status === "DRAFT" ? "bg-secondary" : grn.status === "RECEIVED" ? "bg-success" : "bg-danger"}`}>
        {grn.status}
      </span>
      {sessStatus && (
        <span
          className={`badge ${
            sessStatus === "AWAITING_CONFIRMATION"
              ? "bg-warning text-dark"
              : sessStatus === "POSTED"
                ? "bg-success"
                : "bg-secondary"
          }`}
        >
          {sessStatus === "AWAITING_CONFIRMATION" ? "Awaiting confirmation" : sessStatus}
        </span>
      )}
    </span>
  );

  return (
    <div
      className={`card radius-12 mb-3 ${highlight ? "border-warning border-2 shadow-sm" : ""}`}
      id={`grn-card-${grn.id}`}
    >
      <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          {branchId ? (
            <Link href={staffVendorReceiptDetailPath(branchId, grn.id)} className="text-decoration-none text-body">
              {titleBadges}
            </Link>
          ) : (
            titleBadges
          )}
        </div>
        <div className="d-flex gap-2 flex-wrap">
          {!hideVendorReceiptPrints ? (
            <>
              <a
                href={vendorReceiptPrintUrl(grn.id, "grn")}
                target="_blank"
                rel="noopener"
                className="btn btn-outline-secondary btn-sm"
              >
                <i className="ri-printer-line me-1" />
                GRN
              </a>
              <a
                href={vendorReceiptPrintUrl(grn.id, "delivery-note")}
                target="_blank"
                rel="noopener"
                className="btn btn-outline-secondary btn-sm"
              >
                <i className="ri-truck-line me-1" />
                Delivery note
              </a>
              {hasDiscrepancy && (
                <a
                  href={grnPrintUrl(grn.id, "discrepancy")}
                  target="_blank"
                  rel="noopener"
                  className="btn btn-outline-warning btn-sm"
                >
                  <i className="ri-error-warning-line me-1" />
                  Discrepancy
                </a>
              )}
            </>
          ) : null}
          {grn.purchaseOrder && (
            <>
              <a
                href={purchaseOrderPrintUrl(grn.purchaseOrder.id, "po")}
                target="_blank"
                rel="noopener"
                className="btn btn-outline-secondary btn-sm"
              >
                <i className="ri-file-text-line me-1" />
                PO
              </a>
              <a
                href={purchaseOrderPrintUrl(grn.purchaseOrder.id, "worksheet")}
                target="_blank"
                rel="noopener"
                className="btn btn-outline-secondary btn-sm"
              >
                <i className="ri-file-list-3-line me-1" />
                Worksheet
              </a>
            </>
          )}
        </div>
      </div>
      <div className="card-body">
        <div className="row mb-2 small">
          <div className="col-md-3">
            <strong>Vendor:</strong> {grn.vendor?.name ?? "—"}
          </div>
          <div className="col-md-3">
            <strong>PO:</strong> {grn.purchaseOrder?.poNumber ?? "—"}
          </div>
          <div className="col-md-3">
            <strong>Invoice:</strong> {grn.invoiceNo ?? "—"}
          </div>
          <div className="col-md-3">
            <strong>Location:</strong> {grn.location?.name ?? "—"}
          </div>
          <div className="col-md-3">
            <strong>Created:</strong> {new Date(grn.createdAt).toLocaleString()}
          </div>
          <div className="col-md-3">
            <strong>Submitted:</strong>{" "}
            {grn.vendorReceiveSession?.submittedAt ? new Date(grn.vendorReceiveSession.submittedAt).toLocaleString() : "—"}
          </div>
          <div className="col-md-3">
            <strong>Lines / Qty:</strong> {grn.lines.length} / {lineQtySum}
          </div>
        </div>
        {!hideLinesTable && (
          <div className="table-responsive">
            <table className="table table-sm table-bordered mb-0">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th className="text-end">Ordered</th>
                  <th className="text-end">Accepted</th>
                  <th className="text-end">Damaged</th>
                  <th className="text-end">Short</th>
                  <th className="text-end">Extra</th>
                  <th>Batch</th>
                  <th>Expiry</th>
                </tr>
              </thead>
              <tbody>
                {grn.lines.map((l) => {
                  const disc = l.quantityDamaged > 0 || l.quantityShort > 0 || (l.quantityExtra ?? 0) > 0;
                  return (
                    <tr key={l.id} className={disc ? "table-warning" : ""}>
                      <td>{l.variant.sku}</td>
                      <td>{l.variant.title}</td>
                      <td className="text-end">{l.purchaseOrderLine?.orderedQty ?? "—"}</td>
                      <td className="text-end">{l.quantity}</td>
                      <td className="text-end">{l.quantityDamaged || "—"}</td>
                      <td className="text-end">{l.quantityShort || "—"}</td>
                      <td className="text-end">{l.quantityExtra ?? "—"}</td>
                      <td>{l.lot?.lotCode ?? "—"}</td>
                      <td>{l.lot?.expDate ? new Date(l.lot.expDate).toLocaleDateString() : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {isManager &&
          managerEditorOpen &&
          grn.status === "DRAFT" &&
          sessStatus !== "POSTED" &&
          sessStatus !== "CANCELLED" && (
            <div className="mt-3 pt-3 border-top">
              <ManagerReceiveEditor
                grn={grn}
                suppressSuccessToast={suppressManagerConfirmToast}
                onDraftSaved={() => void onRefresh()}
                onDone={() => {
                  setManagerEditorOpen(false);
                  void onRefresh();
                }}
              />
            </div>
          )}
      </div>
      {grn.status === "DRAFT" && (
        <div className="card-footer d-flex gap-2 flex-wrap">
          {sessStatus !== "AWAITING_CONFIRMATION" && sessStatus !== "POSTED" && sessStatus !== "CANCELLED" && (
            <button className="btn btn-warning btn-sm" disabled={busy} onClick={handleSubmit}>
              {busy ? "Submitting…" : "Submit for manager confirmation"}
            </button>
          )}
          {isManager && sessStatus !== "POSTED" && sessStatus !== "CANCELLED" && (
            <>
              {managerEditorOpen ? (
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled={busy}
                  onClick={() => setManagerEditorOpen(false)}
                >
                  Hide editor
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  disabled={busy}
                  onClick={() => setManagerEditorOpen(true)}
                >
                  {sessStatus === "AWAITING_CONFIRMATION" ? "Review & confirm" : "Confirm & post stock"}
                </button>
              )}
            </>
          )}
          {!isManager && sessStatus === "AWAITING_CONFIRMATION" && (
            <span className="badge bg-warning text-dark align-self-center">Awaiting warehouse manager confirmation</span>
          )}
        </div>
      )}
      {grn.status === "RECEIVED" && (
        <div className="card-footer">
          <span className="badge bg-success">Stock posted</span>
        </div>
      )}
    </div>
  );
}
