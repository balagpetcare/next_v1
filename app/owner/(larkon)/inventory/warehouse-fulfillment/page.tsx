"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

type QueueRow = {
  allocationPlanId: number;
  allocationPlanStatus: string;
  pickListId: number | null;
  pickListStatus: string | null;
  linkedDispatchId: number | null;
  linkedDispatchStatus: string | null;
  stockRequestId: number;
  requestReference: string;
  requestIntent: string;
  fulfillmentSegment: string;
  requesterBranchId: number;
  requesterBranchName: string;
  requesterBranchCategory: string;
  derivedEffectiveStatus: string;
  derivedEffectiveStatusDisplay?: { label: string; color: string };
  nextAction: string;
  canonicalRequestSummary?: {
    totalRemainingQty?: number;
    totalDispatchable?: number;
    hasPendingDispatch?: boolean;
  };
};

function badgeClass(color?: string): string {
  const c = (color || "gray").toLowerCase();
  if (c === "yellow") return "bg-warning text-dark";
  if (c === "green") return "bg-success";
  if (c === "red") return "bg-danger";
  if (c === "blue") return "bg-primary";
  return "bg-secondary";
}

function categoryBadge(cat: string): string {
  if (cat === "WAREHOUSE") return "bg-dark";
  if (cat === "DELIVERY_HUB") return "bg-info text-dark";
  return "bg-secondary";
}

export default function OwnerWarehouseFulfillmentQueuePage() {
  const [items, setItems] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [segment, setSegment] = useState<"ALL" | "INTERNAL_TRANSFER" | "PROCUREMENT">("INTERNAL_TRANSFER");
  const [statusQ, setStatusQ] = useState("");
  const [branchQ, setBranchQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await ownerGet<{ data?: { items?: QueueRow[] } }>(
        `/api/v1/owner/warehouse/fulfillment-queue?segment=${encodeURIComponent(segment)}`
      );
      setItems(((res as any)?.data?.items ?? []) as QueueRow[]);
    } catch (e: unknown) {
      setError(getMessageFromApiError(e));
    } finally {
      setLoading(false);
    }
  }, [segment]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const b = branchQ.trim().toLowerCase();
    return items.filter((r) => {
      if (statusQ && String(r.derivedEffectiveStatus || "").toUpperCase() !== statusQ.toUpperCase()) return false;
      if (b) {
        const name = (r.requesterBranchName || "").toLowerCase();
        const idStr = String(r.requesterBranchId);
        if (!name.includes(b) && !idStr.includes(b)) return false;
      }
      return true;
    });
  }, [items, statusQ, branchQ]);

  return (
    <div className="container-fluid py-4">
      <PageHeader
        title="Warehouse fulfillment queue"
        subtitle="Internal transfer work at the DC (canonical queue). Procurement-related plans use a separate segment filter; vendor GRN remains under Receipts / Receive PO."
      />
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <Link href="/owner/inventory" className="btn btn-outline-secondary btn-sm">
          ← Inventory
        </Link>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <label className="small text-muted mb-0">Segment</label>
          <select
            className="form-select form-select-sm"
            style={{ width: "auto", minWidth: 180 }}
            value={segment}
            onChange={(e) => setSegment(e.target.value as typeof segment)}
          >
            <option value="INTERNAL_TRANSFER">Normal transfer (clinic → DC)</option>
            <option value="PROCUREMENT">Procurement / warehouse requester</option>
            <option value="ALL">All (transfer + procurement)</option>
          </select>
          <label className="small text-muted mb-0">Derived status</label>
          <input
            className="form-control form-control-sm"
            style={{ width: 140 }}
            placeholder="Filter"
            value={statusQ}
            onChange={(e) => setStatusQ(e.target.value)}
          />
          <label className="small text-muted mb-0">Branch</label>
          <input
            className="form-control form-control-sm"
            style={{ width: 160 }}
            placeholder="Name or id"
            value={branchQ}
            onChange={(e) => setBranchQ(e.target.value)}
          />
          <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => void load()} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="text-center py-5 text-muted">Loading queue…</div>
      ) : filtered.length === 0 ? (
        <div className="alert alert-light border">No actionable rows for this filter.</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm table-hover align-middle">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Requester branch</th>
                <th>Category</th>
                <th>Intent</th>
                <th>Status</th>
                <th>Remaining</th>
                <th>Dispatchable</th>
                <th>Next</th>
                <th>Links</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const sum = r.canonicalRequestSummary || {};
                const st = r.derivedEffectiveStatusDisplay;
                return (
                  <tr key={`${r.allocationPlanId}-${r.stockRequestId}`}>
                    <td>
                      <span className="fw-semibold">{r.requestReference}</span>
                      <div className="small text-muted">Plan #{r.allocationPlanId}</div>
                    </td>
                    <td>
                      {r.requesterBranchName}
                      <div className="small text-muted">#{r.requesterBranchId}</div>
                    </td>
                    <td>
                      <span className={`badge ${categoryBadge(r.requesterBranchCategory)}`}>{r.requesterBranchCategory}</span>
                    </td>
                    <td>
                      <span
                        className={`badge ${r.fulfillmentSegment === "PROCUREMENT" ? "" : "bg-primary"}`}
                        style={
                          r.fulfillmentSegment === "PROCUREMENT"
                            ? { backgroundColor: "#6f42c1", color: "#fff" }
                            : undefined
                        }
                      >
                        {r.requestIntent}
                      </span>
                    </td>
                    <td>
                      {st ? <span className={`badge ${badgeClass(st.color)}`}>{st.label}</span> : r.derivedEffectiveStatus}
                    </td>
                    <td>{sum.totalRemainingQty ?? "—"}</td>
                    <td>
                      {sum.totalDispatchable ?? "—"}
                      {sum.hasPendingDispatch ? <div className="small text-success">Can dispatch</div> : null}
                    </td>
                    <td>
                      <code className="small">{r.nextAction}</code>
                    </td>
                    <td>
                      <div className="d-flex flex-column gap-1">
                        <Link className="small" href={`/owner/inventory/stock-requests/${r.stockRequestId}`}>
                          Stock request
                        </Link>
                        <Link className="small" href={`/owner/inventory/allocation/${r.allocationPlanId}`}>
                          Allocation / pick
                        </Link>
                        {r.linkedDispatchId ? (
                          <Link className="small" href={`/owner/inventory/stock-requests/${r.stockRequestId}/challan/${r.linkedDispatchId}`}>
                            Dispatch #{r.linkedDispatchId}
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
