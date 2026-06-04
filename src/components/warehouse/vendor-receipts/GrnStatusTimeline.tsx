"use client";

import type { VendorReceiptGrnRow } from "@/src/lib/vendorReceiptTypes";
import { grnRowHasLineDiscrepancy } from "@/src/lib/vendorReceiptTypes";
import { formatVendorReceiptDateTime } from "@/src/lib/vendorReceipt/format";

export function GrnStatusTimeline({ grn }: { grn: VendorReceiptGrnRow }) {
  const sess = grn.vendorReceiveSession;
  const created = grn.createdAt;
  const submitted = sess?.submittedAt ?? null;
  const confirmed = sess?.confirmedAt ?? grn.receivedAt ?? null;
  const isPosted = grn.status === "RECEIVED";
  const isVoid = grn.status === "VOIDED";
  const hasDisc = grnRowHasLineDiscrepancy(grn);
  const discAt =
    hasDisc && submitted ? submitted : hasDisc && !submitted ? created : null;

  const steps: { key: string; label: string; at: string | null; done: boolean; active: boolean; danger?: boolean }[] = [
    { key: "c", label: "Draft created", at: created, done: true, active: !submitted && !isPosted && !isVoid },
    {
      key: "s",
      label: "Submitted / ready",
      at: submitted,
      done: !!submitted || isPosted || isVoid,
      active: !!submitted && !isPosted && !isVoid,
    },
  ];

  if (hasDisc) {
    steps.push({
      key: "d",
      label: "Discrepancy logged",
      at: discAt,
      done: true,
      active: !isPosted && !isVoid && !!submitted,
    });
  }

  steps.push({
    key: "p",
    label: isVoid ? "Voided" : "Finalized / posted",
    at: isVoid ? grn.receivedAt ?? null : confirmed,
    done: isPosted || isVoid,
    active: isPosted && !isVoid,
    danger: isVoid,
  });

  return (
    <div className="card radius-12 border mb-4">
      <div className="card-header py-2 px-3">
        <h6 className="mb-0 fw-semibold">Milestones</h6>
      </div>
      <div className="card-body py-3 px-3">
        <div className="d-flex flex-wrap gap-3 justify-content-between">
          {steps.map((s, i) => (
            <div key={s.key} className="flex-grow-1" style={{ minWidth: 130 }}>
              <div className="d-flex align-items-center gap-2 mb-2">
                <span
                  className={`rounded-circle d-inline-flex align-items-center justify-content-center flex-shrink-0 ${
                    s.done
                      ? s.danger
                        ? "bg-danger text-white"
                        : "bg-success text-white"
                      : "bg-light border text-muted"
                  }`}
                  style={{ width: 28, height: 28, fontSize: 12 }}
                >
                  {s.done ? "\u2713" : i + 1}
                </span>
                <span className={`small fw-semibold ${s.active ? "text-primary" : ""}`}>{s.label}</span>
              </div>
              <div className="text-muted small ps-1" style={{ minHeight: 20 }}>
                {s.at ? formatVendorReceiptDateTime(s.at) : "—"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
