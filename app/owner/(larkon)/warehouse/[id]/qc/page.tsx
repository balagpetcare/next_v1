"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { warehouseById, qcInspectionsList } from "@/lib/api";

function statusBadge(s: string) {
  const u = (s || "").toUpperCase();
  if (u === "PENDING") return "bg-warning text-dark";
  if (u === "PASSED") return "bg-success";
  if (u === "FAILED") return "bg-danger";
  if (u === "PARTIAL") return "bg-info text-dark";
  return "bg-secondary";
}

export default function OwnerWarehouseQcQueuePage() {
  const params = useParams();
  const warehouseId = Number(params?.id);
  const [wh, setWh] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!warehouseId) return;
    setLoading(true);
    setError(null);
    try {
      const w = await warehouseById(warehouseId);
      setWh(w);
      const orgId = (w as any)?.orgId;
      if (!orgId) throw new Error("Missing org on warehouse");
      const q = await qcInspectionsList(orgId, { warehouseId, status: "PENDING", page: 1 });
      setData(q);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => {
    load();
  }, [load]);

  const items = (data as any)?.items ?? [];

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center">
        <div className="spinner-border text-primary" />
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <Link href={`/owner/warehouse/${warehouseId}`} className="text-muted small text-decoration-none">
        ← Warehouse
      </Link>
      <h4 className="mt-2">QC queue</h4>
      <p className="text-muted small">
        {wh?.name} — pending inspections block FEFO until released.{" "}
        <Link href={`/owner/warehouse/${warehouseId}/quarantine`}>Quarantine</Link>
        {" · "}
        <Link href={`/owner/warehouse/${warehouseId}/audit`}>Audit / export</Link>
      </p>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card border">
        <div className="card-body p-0">
          {items.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <p className="mb-0">No pending QC inspections.</p>
              <p className="small mb-0 mt-2">Enable inbound QC on the warehouse and receive a GRN to create rows.</p>
            </div>
          ) : (
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>GRN</th>
                  <th>SKU</th>
                  <th>Lot</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((row: any) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.grnId}</td>
                    <td>{row.variant?.sku || row.variantId}</td>
                    <td className="small">{row.lot?.lotCode || row.lotId}</td>
                    <td>{row.expectedQty}</td>
                    <td>
                      <span className={`badge ${statusBadge(row.status)}`}>{row.status}</span>
                    </td>
                    <td>
                      <Link href={`/owner/warehouse/${warehouseId}/qc/${row.id}`} className="btn btn-sm btn-outline-primary">
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
