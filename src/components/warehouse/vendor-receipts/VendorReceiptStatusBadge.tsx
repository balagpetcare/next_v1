"use client";

import type { VendorReceiptGrnRow } from "@/src/lib/vendorReceiptTypes";

export function vendorReceiptStatusLabel(grn: VendorReceiptGrnRow): string {
  const sess = grn.vendorReceiveSession?.status;
  if (grn.status === "RECEIVED") return "Confirmed";
  if (grn.status === "VOIDED") return "Voided";
  if (sess === "AWAITING_CONFIRMATION") return "Pending";
  if (sess === "DRAFT" || sess == null) return "Draft";
  return sess || grn.status;
}

export function VendorReceiptStatusBadge({ grn }: { grn: VendorReceiptGrnRow }) {
  const sess = grn.vendorReceiveSession?.status;
  let cls = "bg-secondary";
  if (grn.status === "RECEIVED") cls = "bg-success";
  else if (grn.status === "VOIDED") cls = "bg-danger";
  else if (sess === "AWAITING_CONFIRMATION") cls = "bg-warning text-dark";
  else if (sess === "DRAFT" || sess == null) cls = "bg-secondary";

  return <span className={`badge ${cls}`}>{vendorReceiptStatusLabel(grn)}</span>;
}
