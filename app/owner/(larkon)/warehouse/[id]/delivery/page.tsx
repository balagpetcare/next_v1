"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { warehouseDeliveryAssignments } from "@/lib/api";

export default function OwnerWarehouseDeliveryPage() {
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
        const data = await warehouseDeliveryAssignments(warehouseId, { take: 200 });
        if (!cancelled) setRows(data as any[]);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load delivery assignments");
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
        <h4 className="mb-0 mt-1">Delivery assignments</h4>
        <p className="text-muted small mb-0">Runs for dispatches originating from this warehouse</p>
      </div>

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      )}
      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && rows.length === 0 && (
        <div className="card border"><div className="card-body text-muted">No delivery assignments yet.</div></div>
      )}

      {!loading && rows.length > 0 && (
        <div className="card border">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Assignment</th>
                  <th>Dispatch</th>
                  <th>Route</th>
                  <th>Assignee</th>
                  <th>Status</th>
                  <th>Assigned</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const d = a.dispatch || {};
                  return (
                    <tr key={a.id}>
                      <td className="fw-medium">{a.id}</td>
                      <td>{d.id ?? "—"}</td>
                      <td className="small">
                        {d.fromLocation?.name || `Loc#${d.fromLocationId}`}
                        <span className="text-muted mx-1">→</span>
                        {d.toLocation?.name || `Loc#${d.toLocationId}`}
                      </td>
                      <td className="small">
                        {a.assignedTo?.profile?.displayName || a.assignedTo?.auth?.email || "—"}
                      </td>
                      <td><span className="badge bg-secondary">{a.status}</span></td>
                      <td className="text-muted small">
                        {a.assignedAt ? new Date(a.assignedAt).toLocaleString() : "—"}
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
