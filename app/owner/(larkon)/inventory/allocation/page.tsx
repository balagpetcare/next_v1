"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { allocationPlansList } from "@/lib/api";
import { formatAllocationApiError } from "./_utils/allocationErrors";

type PlanRow = {
  id: number;
  status?: string;
  stockRequestId?: number | null;
  medicineRequisitionId?: number | null;
  totalDemandQty?: number | null;
  totalAllocatedQty?: number | null;
  shortageQty?: number | null;
  version?: number | null;
  fromLocation?: { id?: number; name?: string | null; branch?: { name?: string | null } | null } | null;
  _count?: { lines?: number };
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "ALLOCATED", label: "Allocated" },
  { value: "PARTIALLY_ALLOCATED", label: "Partial" },
  { value: "FAILED", label: "Failed" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PICKING", label: "Picking" },
  { value: "PICKED", label: "Picked" },
  { value: "DISPATCHED", label: "Dispatched" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "ON_HOLD", label: "On hold" },
];

function statusBadgeClass(status: string): string {
  const s = (status || "").toUpperCase();
  if (s === "ALLOCATED" || s === "CONFIRMED" || s === "PICKED") return "bg-success";
  if (s === "PARTIALLY_ALLOCATED" || s === "PICKING" || s === "ON_HOLD") return "bg-warning text-dark";
  if (s === "FAILED" || s === "CANCELLED") return "bg-danger";
  if (s === "DISPATCHED") return "bg-primary";
  return "bg-secondary";
}

export default function OwnerAllocationBoardPage() {
  const [items, setItems] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await allocationPlansList({
        status: statusFilter || undefined,
      });
      setItems((res.items || []) as PlanRow[]);
    } catch (e: unknown) {
      setError(formatAllocationApiError(e, "list"));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="container-fluid py-4">
      <PageHeader
        title="Allocation & picking"
        subtitle="Plans, FEFO lines, reservations, pick lists, and dispatch handoff."
      />
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <Link href="/owner/inventory" className="btn btn-outline-secondary btn-sm">
          ← Inventory
        </Link>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <label className="small text-muted mb-0">Status</label>
          <select
            className="form-select form-select-sm"
            style={{ width: "auto", minWidth: 160 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Link href="/owner/inventory/stock-requests" className="btn btn-outline-primary btn-sm">
            Stock requests
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : items.length === 0 ? (
        <div className="alert alert-info mb-0">
          No allocation plans match this filter. Create a plan from a stock request (fulfillment start) or medicine
          requisition API, then open a row to run allocation and picking.
        </div>
      ) : (
        <div className="card border">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Demand</th>
                  <th>Allocated</th>
                  <th>Shortage</th>
                  <th>Lines</th>
                  <th>Source</th>
                  <th>Req</th>
                  <th className="text-end"> </th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => {
                  const st = (p.status || "").toUpperCase();
                  const shortQty = p.shortageQty ?? null;
                  const hasShort = shortQty != null && shortQty > 0;
                  return (
                    <tr key={p.id}>
                      <td>{p.id}</td>
                      <td>
                        <span className={`badge ${statusBadgeClass(st)}`}>{p.status || "—"}</span>
                      </td>
                      <td>{p.totalDemandQty ?? "—"}</td>
                      <td>{p.totalAllocatedQty ?? "—"}</td>
                      <td>
                        {hasShort ? (
                          <span className="badge bg-warning text-dark">{shortQty}</span>
                        ) : (
                          <span className="text-muted">0</span>
                        )}
                      </td>
                      <td>{p._count?.lines ?? 0}</td>
                      <td className="small text-muted">
                        {p.fromLocation?.name || "—"}
                        {p.fromLocation?.branch?.name ? ` · ${p.fromLocation.branch.name}` : ""}
                      </td>
                      <td className="small">
                        {p.stockRequestId ? (
                          <Link href={`/owner/inventory/stock-requests/${p.stockRequestId}`}>SR #{p.stockRequestId}</Link>
                        ) : p.medicineRequisitionId ? (
                          <span>Med #{p.medicineRequisitionId}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="text-end">
                        <Link href={`/owner/inventory/allocation/${p.id}`} className="btn btn-sm btn-outline-primary">
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
