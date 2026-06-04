"use client";

import type { VendorReceiptGrnRow } from "@/src/lib/vendorReceiptTypes";

function formatUnitCost(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

export function VendorReceiptLineItemsTable({ grn }: { grn: VendorReceiptGrnRow }) {
  return (
    <div className="card radius-12 border mb-4">
      <div className="card-header py-2 px-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
        <h6 className="mb-0 fw-semibold">Line items</h6>
        <span className="badge bg-light text-dark border">{grn.lines.length} lines</span>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-sm table-bordered mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th className="px-2 text-muted small">#</th>
                <th className="px-2">SKU</th>
                <th className="px-2">Product</th>
                <th className="px-2 text-center">UOM</th>
                <th className="text-end px-2">Expected</th>
                <th className="text-end px-2">Received</th>
                <th className="text-end px-2">Accepted</th>
                <th className="text-end px-2">Damaged</th>
                <th className="text-end px-2">Short</th>
                <th className="text-end px-2">Excess</th>
                <th className="text-end px-2">Unit cost</th>
                <th className="px-2">Status</th>
                <th className="px-2">Notes</th>
                <th className="px-2">Batch / expiry</th>
              </tr>
            </thead>
            <tbody>
              {grn.lines.map((l, idx) => {
                const ordered = l.purchaseOrderLine?.orderedQty;
                const extra = Number(l.quantityExtra ?? 0);
                const recv = Number(l.quantity ?? 0) + extra;
                const accepted = Number(l.quantity ?? 0);
                const damaged = Number(l.quantityDamaged ?? 0);
                const short = Number(l.quantityShort ?? 0);
                const disc =
                  damaged > 0 || short > 0 || extra > 0 || (l.lineDiscrepancyNote != null && String(l.lineDiscrepancyNote).trim() !== "");
                const noteParts = [l.lineDiscrepancyNote, l.lineRemarks].filter((x) => x != null && String(x).trim() !== "");
                const note = noteParts.length ? noteParts.map((x) => String(x).trim()).join(" · ") : "—";
                const exp = l.lot?.expDate ? String(l.lot.expDate).slice(0, 10) : null;
                const batch = l.lot?.lotCode ?? "—";
                return (
                  <tr key={l.id} className={disc ? "table-warning" : undefined}>
                    <td className="px-2 small text-muted">{idx + 1}</td>
                    <td className="small px-2 text-nowrap">{l.variant?.sku ?? "—"}</td>
                    <td className="small px-2">{l.variant?.title ?? "—"}</td>
                    <td className="small px-2 text-center text-muted">—</td>
                    <td className="text-end small px-2">{ordered != null ? ordered : "—"}</td>
                    <td className="text-end small px-2 fw-medium">
                      {recv}
                      {extra > 0 ? (
                        <span className="d-block text-muted fw-normal" style={{ fontSize: "0.85em" }}>
                          incl. excess {extra}
                        </span>
                      ) : null}
                    </td>
                    <td className="text-end small px-2">{accepted}</td>
                    <td className="text-end small px-2">{damaged}</td>
                    <td className="text-end small px-2">{short}</td>
                    <td className="text-end small px-2">{extra}</td>
                    <td className="text-end small px-2 text-nowrap">{formatUnitCost(l.purchaseOrderLine?.unitCost)}</td>
                    <td className="small px-2">
                      {disc ? <span className="badge bg-warning text-dark">Attention</span> : <span className="badge bg-light text-dark border">OK</span>}
                    </td>
                    <td className="small px-2" style={{ maxWidth: 220 }}>
                      <span className="d-inline-block text-truncate w-100" title={note !== "—" ? note : undefined}>
                        {note}
                      </span>
                    </td>
                    <td className="small px-2 text-nowrap">
                      <span className="d-block">{batch}</span>
                      {exp ? <span className="text-muted">Exp {exp}</span> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-3 py-2 border-top bg-light small text-muted">
          Accepted is posting quantity before manager adjustments; received includes extras counted toward inventory posting rules.
        </div>
      </div>
    </div>
  );
}
