"use client";

import type { VendorReceiptGrnRow } from "@/src/lib/vendorReceiptTypes";
import { formatVendorReceiptDateTime } from "@/src/lib/vendorReceipt/format";

/** Compact activity from fields already on the GRN payload (no separate audit API). */
export function VendorReceiptActivityPanel({ grn }: { grn: VendorReceiptGrnRow }) {
  const sess = grn.vendorReceiveSession;
  const events: { label: string; at: string | null; detail?: string }[] = [
    { label: "GRN created", at: grn.createdAt },
    { label: "Session updated", at: sess?.updatedAt ?? null },
    { label: "Submitted for confirmation", at: sess?.submittedAt ?? null },
    { label: "Confirmed / posted", at: sess?.confirmedAt ?? grn.receivedAt ?? null },
  ].filter((e) => e.at);

  if (events.length === 0) {
    return (
      <div className="card radius-12 border mb-0">
        <div className="card-body py-4 px-3 text-muted small">
          No dated activity entries are available on this record. Full user-level audit trails may be added when the API exposes
          them.
        </div>
      </div>
    );
  }

  return (
    <div className="card radius-12 border mb-0">
      <div className="card-header py-2 px-3">
        <h6 className="mb-0 fw-semibold">Activity</h6>
      </div>
      <ul className="list-group list-group-flush small">
        {events.map((e) => (
          <li key={e.label} className="list-group-item py-2 px-3 d-flex justify-content-between gap-3 flex-wrap">
            <span className="fw-medium">{e.label}</span>
            <span className="text-muted">{e.at ? formatVendorReceiptDateTime(e.at) : "—"}</span>
          </li>
        ))}
      </ul>
      <div className="card-footer py-2 px-3 text-muted small border-top-0">
        Submitted/confirmed by user is not shown until staff names are included on the GRN API.
      </div>
    </div>
  );
}
