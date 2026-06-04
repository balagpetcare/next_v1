"use client";

import { useEffect, useState } from "react";
import type { VendorReceiveGrnDraft } from "@/app/staff/(larkon)/branch/[branchId]/warehouse/receive-po/_components/VendorReceiveGrnCard";
import type { VendorReceiptGrnRow } from "@/src/lib/vendorReceiptTypes";
import { grnRowHasLineDiscrepancy } from "@/src/lib/vendorReceiptTypes";
import { VendorReceiptInfoCards } from "@/src/components/warehouse/vendor-receipts/VendorReceiptInfoCards";
import { VendorReceiptLineItemsTable } from "@/src/components/warehouse/vendor-receipts/VendorReceiptLineItemsTable";
import { VendorReceiptActivityPanel } from "@/src/components/warehouse/vendor-receipts/VendorReceiptActivityPanel";
import { VendorReceiptDocumentsPanel } from "@/src/components/warehouse/vendor-receipts/VendorReceiptDocumentsPanel";
import { VendorReceiptQuantitySummary } from "@/src/components/warehouse/vendor-receipts/VendorReceiptQuantitySummary";

type TabKey = "overview" | "items" | "discrepancies" | "activity" | "documents";

export function VendorReceiptDetailSectionTabs(props: {
  branchId: string;
  grnDraft: VendorReceiveGrnDraft;
  grnRow: VendorReceiptGrnRow;
  initialTab?: TabKey | null;
  focusDiscrepancy?: boolean;
}) {
  const { branchId, grnDraft, grnRow, initialTab, focusDiscrepancy } = props;
  const [tab, setTab] = useState<TabKey>(initialTab && isTab(initialTab) ? initialTab : "overview");

  useEffect(() => {
    if (focusDiscrepancy && grnRowHasLineDiscrepancy(grnRow)) setTab("discrepancies");
  }, [focusDiscrepancy, grnRow]);

  const discLines = grnRow.lines.filter(
    (l) =>
      Number(l.quantityDamaged ?? 0) > 0 ||
      Number(l.quantityShort ?? 0) > 0 ||
      Number(l.quantityExtra ?? 0) > 0 ||
      (l.lineDiscrepancyNote != null && String(l.lineDiscrepancyNote).trim() !== "")
  );
  const discGrn: VendorReceiptGrnRow = { ...grnRow, lines: discLines };

  return (
    <div className="mb-4">
      <ul className="nav nav-tabs nav-bordered mb-3 flex-wrap">
        {(
          [
            ["overview", "Overview"],
            ["items", "Items"],
            ["discrepancies", `Discrepancies${discLines.length ? ` (${discLines.length})` : ""}`],
            ["activity", "Activity"],
            ["documents", "Documents"],
          ] as const
        ).map(([key, label]) => (
          <li className="nav-item" key={key}>
            <button
              type="button"
              className={`nav-link ${tab === key ? "active" : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>

      {tab === "overview" ? (
        <div>
          <VendorReceiptQuantitySummary grn={grnRow} />
          <VendorReceiptInfoCards grn={grnDraft} />
          {grnDraft.notes ? (
            <div className="card radius-12 border mb-0">
              <div className="card-header py-2 px-3">
                <h6 className="mb-0 fw-semibold">Header notes</h6>
              </div>
              <div className="card-body py-3 px-3 small">{grnDraft.notes}</div>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "items" ? <VendorReceiptLineItemsTable grn={grnRow} /> : null}

      {tab === "discrepancies" ? (
        discLines.length > 0 ? (
          <VendorReceiptLineItemsTable grn={discGrn} />
        ) : (
          <div className="card radius-12 border mb-0">
            <div className="card-body py-4 px-3 text-muted small">
              No line discrepancies are recorded on this vendor receipt.
            </div>
          </div>
        )
      ) : null}

      {tab === "activity" ? <VendorReceiptActivityPanel grn={grnRow} /> : null}

      {tab === "documents" ? <VendorReceiptDocumentsPanel branchId={branchId} grn={grnRow} /> : null}
    </div>
  );
}

function isTab(x: string): x is TabKey {
  return x === "overview" || x === "items" || x === "discrepancies" || x === "activity" || x === "documents";
}
