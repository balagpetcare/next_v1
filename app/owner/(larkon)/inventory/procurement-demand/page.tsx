"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { listProcurementDemands } from "@/app/owner/_lib/ownerApi";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

type BranchRow = { id: number; org?: { id: number } };

type DemandRow = {
  id: number;
  demandQty: number;
  fulfilledQty: number;
  status: string;
  variant?: { sku?: string; title?: string };
  stockRequest?: { id: number; branch?: { name?: string } };
  purchaseOrder?: { id: number; poNumber?: string };
};

export default function ProcurementDemandListPage() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [rows, setRows] = useState<DemandRow[]>([]);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const res: any = await listProcurementDemands({
        orgId,
        status: statusFilter || undefined,
        limit: 100,
      });
      const data = res?.data ?? res;
      setRows((data?.items ?? []) as DemandRow[]);
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
    } finally {
      setLoading(false);
    }
  }, [orgId, statusFilter]);

  useEffect(() => {
    (async () => {
      const br = await fetch("/api/v1/owner/branches", { credentials: "include" }).then((r) => r.json());
      const rows = (br?.data ?? []) as BranchRow[];
      setOrgId(rows[0]?.org?.id ?? null);
    })();
  }, []);

  useEffect(() => {
    if (orgId) load();
  }, [orgId, load]);

  return (
    <div className="container-fluid py-4">
      <PageHeader
        title="Procurement demand"
        subtitle="Shortages from warehouse allocation confirm → link to purchase orders and receive via GRN."
      />
      {error && <div className="alert alert-danger">{error}</div>}
      {!orgId && !loading && <div className="alert alert-warning">No organization context.</div>}

      {orgId != null && (
        <>
          <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
            <label className="small text-muted mb-0">Status</label>
            <select
              className="form-select form-select-sm w-auto"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All open</option>
              <option value="PENDING">PENDING</option>
              <option value="PO_LINKED">PO_LINKED</option>
              <option value="PARTIALLY_RECEIVED">PARTIALLY_RECEIVED</option>
              <option value="FULFILLED">FULFILLED</option>
              <option value="DISPATCHED">DISPATCHED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => load()} disabled={loading}>
              Refresh
            </button>
          </div>

          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Variant</th>
                  <th>Qty</th>
                  <th>Received</th>
                  <th>Status</th>
                  <th>Stock request</th>
                  <th>PO</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-secondary">
                      Loading…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-secondary">
                      No lines.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>
                        <span className="small">{r.variant?.sku ?? "—"}</span>
                        <div className="small text-muted">{r.variant?.title ?? ""}</div>
                      </td>
                      <td>{r.demandQty}</td>
                      <td>{r.fulfilledQty}</td>
                      <td>
                        <span className="badge bg-light text-dark">{r.status}</span>
                      </td>
                      <td>
                        {r.stockRequest?.id != null ? (
                          <Link href={`/owner/inventory/stock-requests/${r.stockRequest.id}`}>#{r.stockRequest.id}</Link>
                        ) : (
                          "—"
                        )}
                        <div className="small text-muted">{r.stockRequest?.branch?.name ?? ""}</div>
                      </td>
                      <td>
                        {r.purchaseOrder?.id != null ? (
                          <Link href={`/owner/inventory/purchase-orders/${r.purchaseOrder.id}`}>
                            {r.purchaseOrder.poNumber ?? `#${r.purchaseOrder.id}`}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <Link className="btn btn-link btn-sm" href={`/owner/inventory/procurement-demand/${r.id}`}>
                          Detail
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
