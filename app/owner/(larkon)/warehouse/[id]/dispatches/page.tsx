"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { warehouseDispatches } from "@/lib/api";

export default function OwnerWarehouseDispatchesPage() {
  const params = useParams();
  const warehouseId = Number(params?.id);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!warehouseId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await warehouseDispatches(warehouseId, { take: 150 });
        if (!cancelled) setRows(data as any[]);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load dispatches");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [warehouseId]);

  if (!warehouseId) {
    return <div className="container-fluid py-4"><div className="alert alert-warning">Invalid warehouse</div></div>;
  }

  return (
    <div className="container-fluid py-4">
      <div className="mb-3">
        <Link href={`/owner/warehouse/${warehouseId}`} className="text-muted text-decoration-none small">
          ← Warehouse overview
        </Link>
        <h4 className="mb-0 mt-1">Dispatches</h4>
        <p className="text-muted small mb-0">Stock dispatches touching linked warehouse locations</p>
      </div>

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      )}
      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && rows.length === 0 && (
        <div className="card border"><div className="card-body text-muted">No dispatches yet. Link hub locations and create transfers from inventory.</div></div>
      )}

      {!loading && rows.length > 0 && (
        <div className="card border">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Items</th>
                  <th>Delivery</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id}>
                    <td className="fw-medium">{d.id}</td>
                    <td><span className="badge bg-secondary">{d.status}</span></td>
                    <td className="small">{d.fromLocation?.name || `#${d.fromLocationId}`}</td>
                    <td className="small">{d.toLocation?.name || `#${d.toLocationId}`}</td>
                    <td>{d._count?.items ?? "—"}</td>
                    <td className="small">
                      {(d.deliveryAssignments || []).length === 0 ? (
                        <span className="text-muted">—</span>
                      ) : (
                        (d.deliveryAssignments || []).map((a: any) => (
                          <span key={a.id} className="badge bg-info text-dark me-1">{a.status}</span>
                        ))
                      )}
                    </td>
                    <td className="text-muted small">
                      {d.createdAt ? new Date(d.createdAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
