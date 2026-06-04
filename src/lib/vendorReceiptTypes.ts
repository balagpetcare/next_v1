/** GRN list/detail rows used by staff vendor receipts module. */

export type VendorReceiptLine = {
  id: number;
  quantity: number;
  quantityDamaged?: number;
  quantityShort?: number;
  quantityExtra?: number;
  lineDiscrepancyNote?: string | null;
  lineRemarks?: string | null;
  variant?: { sku: string; title: string };
  lot?: { lotCode?: string | null; expDate?: string | null } | null;
  purchaseOrderLine?: { orderedQty: number; unitCost?: number | null; receivedQty?: number | null } | null;
};

export type VendorReceiptGrnRow = {
  id: number;
  status: string;
  createdAt: string;
  receivedAt?: string | null;
  notes?: string | null;
  invoiceNo?: string | null;
  location?: {
    id?: number;
    name?: string;
    branch?: { id?: number; name?: string } | null;
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
  lines: VendorReceiptLine[];
  totalQty?: number;
};

export function isVendorReceiptRow(x: unknown): x is VendorReceiptGrnRow {
  return typeof x === "object" && x != null && "id" in x && "lines" in x;
}

export function grnRowHasLineDiscrepancy(grn: VendorReceiptGrnRow): boolean {
  return grn.lines.some(
    (l) =>
      Number(l.quantityDamaged ?? 0) > 0 ||
      Number(l.quantityShort ?? 0) > 0 ||
      Number(l.quantityExtra ?? 0) > 0 ||
      (l.lineDiscrepancyNote != null && String(l.lineDiscrepancyNote).trim() !== "")
  );
}

export function sumExpectedQty(grn: VendorReceiptGrnRow): number {
  return grn.lines.reduce((s, l) => s + Number(l.purchaseOrderLine?.orderedQty ?? 0), 0);
}

export function sumReceivedQty(grn: VendorReceiptGrnRow): number {
  return grn.lines.reduce((s, l) => s + Number(l.quantity ?? 0) + Number(l.quantityExtra ?? 0), 0);
}

export function asVendorReceiptGrnRow(g: unknown): VendorReceiptGrnRow {
  return g as VendorReceiptGrnRow;
}

export function isGrnNotFoundMessage(msg: string): boolean {
  const m = msg.toLowerCase();
  return m.includes("not found") || m.includes("404");
}

/** Aggregate qtys for vendor receipt summary (expected vs received incl. extra; discrepancy = damage + short + extra). */
export function computeVendorReceiptQtyTotals(grn: VendorReceiptGrnRow): {
  totalExpected: number;
  totalReceived: number;
  totalDamage: number;
  totalShort: number;
  totalExtra: number;
  totalDiscrepancyUnits: number;
} {
  let totalExpected = 0;
  let totalReceived = 0;
  let totalDamage = 0;
  let totalShort = 0;
  let totalExtra = 0;
  for (const l of grn.lines) {
    totalExpected += Number(l.purchaseOrderLine?.orderedQty ?? 0);
    totalReceived += Number(l.quantity ?? 0) + Number(l.quantityExtra ?? 0);
    totalDamage += Number(l.quantityDamaged ?? 0);
    totalShort += Number(l.quantityShort ?? 0);
    totalExtra += Number(l.quantityExtra ?? 0);
  }
  return {
    totalExpected,
    totalReceived,
    totalDamage,
    totalShort,
    totalExtra,
    totalDiscrepancyUnits: totalDamage + totalShort + totalExtra,
  };
}
