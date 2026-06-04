"use client";

import { useRouter } from "next/navigation";
import type { VendorReceiptGrnRow } from "@/src/lib/vendorReceiptTypes";
import { grnRowHasLineDiscrepancy, sumExpectedQty, sumReceivedQty } from "@/src/lib/vendorReceiptTypes";
import { VendorReceiptStatusBadge } from "@/src/components/warehouse/vendor-receipts/VendorReceiptStatusBadge";
import { VendorReceiptTableSkeleton } from "@/src/components/warehouse/vendor-receipts/VendorReceiptTableSkeleton";
import { formatVendorReceiptDateTime } from "@/src/lib/vendorReceipt/format";
import { staffVendorReceiptDetailPath } from "@/lib/staffInventoryRoutes";
import { VendorReceiptRowActions } from "@/src/components/warehouse/vendor-receipts/VendorReceiptRowActions";

export function VendorReceiptTable(props: {
  branchId: string;
  items: VendorReceiptGrnRow[];
  loading: boolean;
  search: string;
  tab: "pending" | "draft" | "history";
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (p: number) => void;
  isManager: boolean;
}) {
  const { branchId, items, loading, search, tab, page, totalPages, totalCount, onPageChange, isManager } = props;
  const router = useRouter();
  const q = search.trim().toLowerCase();
  const filtered = !q
    ? items
    : items.filter((g) => {
        const idStr = String(g.id);
        const vendor = (g.vendor?.name ?? "").toLowerCase();
        const po = (g.purchaseOrder?.poNumber ?? "").toLowerCase();
        return idStr.includes(q) || vendor.includes(q) || po.includes(q);
      });

  const detailHref = (id: number) => staffVendorReceiptDetailPath(branchId, id);

  if (loading) {
    return <VendorReceiptTableSkeleton />;
  }

  return (
    <div className="card radius-12 border">
      <div className="table-responsive" style={{ minHeight: 120 }}>
        <table className="table table-hover table-sm align-middle mb-0">
          <caption className="px-3 pt-3 pb-0 text-muted small text-start">
            Vendor receipts (GRN) for this branch warehouse. Use row actions for print and deep links.
          </caption>
          <thead className="table-light">
            <tr>
              <th className="px-3">GRN</th>
              <th className="px-3">Vendor</th>
              <th className="px-3">PO</th>
              <th className="text-end px-3">Lines</th>
              <th className="text-end px-3">Qty</th>
              <th className="px-3">Status</th>
              <th className="px-3">Activity</th>
              <th className="text-center px-3">Δ</th>
              <th className="text-end px-3" style={{ width: 56 }}>
                {" "}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center text-muted py-5 px-3">
                  {q ? (
                    <>
                      <div className="fw-medium text-body mb-1">No rows match your search</div>
                      <div className="small">Try another GRN id, vendor name, or PO number, or clear the search box.</div>
                    </>
                  ) : (
                    "No rows."
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((g) => {
                const exp = sumExpectedQty(g);
                const rec = sumReceivedQty(g);
                const mismatch = exp > 0 && rec !== exp;
                const hasDisc = grnRowHasLineDiscrepancy(g);
                const updatedAt = g.vendorReceiveSession?.updatedAt ?? g.vendorReceiveSession?.createdAt ?? g.createdAt;
                const datePrimary =
                  tab === "history" ? g.receivedAt ?? g.vendorReceiveSession?.confirmedAt ?? g.createdAt : g.createdAt;
                return (
                  <tr
                    key={g.id}
                    className="cursor-pointer"
                    style={{ cursor: "pointer" }}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(detailHref(g.id));
                      }
                    }}
                    onClick={() => router.push(detailHref(g.id))}
                  >
                    <td className="fw-medium px-3">#{g.id}</td>
                    <td className="px-3">
                      <span className="d-block small fw-medium text-truncate" style={{ maxWidth: 200 }} title={g.vendor?.name ?? ""}>
                        {g.vendor?.name ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 small">{g.purchaseOrder?.poNumber ?? "—"}</td>
                    <td className="text-end px-3 small">{g.lines?.length ?? 0}</td>
                    <td className="text-end px-3">
                      <span className="small fw-medium">{rec}</span>
                      {exp > 0 ? (
                        <span className="d-block text-muted" style={{ fontSize: "0.8rem" }}>
                          of {exp} expected
                        </span>
                      ) : (
                        <span className="d-block text-muted" style={{ fontSize: "0.8rem" }}>
                          received
                        </span>
                      )}
                      {mismatch ? (
                        <span className="badge bg-warning text-dark ms-0 mt-1 d-inline-block">Qty diff</span>
                      ) : null}
                    </td>
                    <td className="px-3">
                      <VendorReceiptStatusBadge grn={g} />
                    </td>
                    <td className="small text-muted px-3">
                      <span className="d-block">{formatVendorReceiptDateTime(datePrimary)}</span>
                      {tab !== "history" && updatedAt && updatedAt !== datePrimary ? (
                        <span className="d-block" style={{ fontSize: "0.8rem" }}>
                          Upd {formatVendorReceiptDateTime(updatedAt)}
                        </span>
                      ) : null}
                    </td>
                    <td className="text-center px-3">
                      {hasDisc ? (
                        <span className="badge bg-warning text-dark" title="Line discrepancy">
                          !
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="text-end px-2" onClick={(e) => e.stopPropagation()}>
                      <VendorReceiptRowActions branchId={branchId} grn={g} isManager={isManager} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="card-footer py-2 px-3 d-flex align-items-center justify-content-between border-top">
        {totalPages > 1 ? (
          <>
            <span className="small text-muted">
              Page {page} of {totalPages}
              {totalCount > 0 ? ` · ${totalCount} total` : ""}
            </span>
            <div className="btn-group btn-group-sm">
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                Prev
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <span className="small text-muted" style={{ minHeight: 20 }}>
            {totalCount > 0 ? `${totalCount} result${totalCount === 1 ? "" : "s"}` : ""}
          </span>
        )}
      </div>
    </div>
  );
}
