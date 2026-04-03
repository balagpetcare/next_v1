"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { warehouseById, warehouseAuditExportCsvPath, qcInspectionEscalationsList, inventoryListRecalls, inventoryRecallReleaseAllocation } from "@/lib/api";

export default function OwnerWarehouseAuditPage() {
  const params = useParams();
  const warehouseId = Number(params?.id);
  const [wh, setWh] = useState<any>(null);
  const [escalations, setEscalations] = useState<any[]>([]);
  const [recalls, setRecalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyRecall, setBusyRecall] = useState<number | null>(null);

  useEffect(() => {
    if (!warehouseId) return;
    let cancelled = false;
    (async () => {
      try {
        const w = await warehouseById(warehouseId);
        const orgId = (w as any)?.orgId;
        if (!orgId) throw new Error("Missing org");
        const [esc, rec] = await Promise.all([
          qcInspectionEscalationsList(orgId, { warehouseId }),
          inventoryListRecalls(orgId, { status: "ACTIVE", limit: 50 }) as Promise<any>,
        ]);
        if (cancelled) return;
        setWh(w);
        setEscalations(esc);
        setRecalls(Array.isArray(rec?.items) ? rec.items : Array.isArray(rec) ? rec : []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [warehouseId]);

  const csvHref = warehouseAuditExportCsvPath(warehouseId, {
    categories: ["QC", "QUARANTINE", "RECALL", "ZONE", "ESCALATION"],
  });
  const orgId = wh?.orgId;

  async function releaseRecall(recallId: number) {
    if (!orgId) return;
    if (!confirm("Release allocation freeze for this recall? Stock can be allocated/dispatched again while recall stays ACTIVE.")) return;
    setBusyRecall(recallId);
    try {
      await inventoryRecallReleaseAllocation(recallId, orgId);
      const rec = (await inventoryListRecalls(orgId, { status: "ACTIVE", limit: 50 })) as any;
      setRecalls(Array.isArray(rec?.items) ? rec.items : []);
    } catch (e: any) {
      alert(e?.message || "Failed");
    } finally {
      setBusyRecall(null);
    }
  }

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
      <h4 className="mt-2">Audit & recalls</h4>
      <p className="text-muted small">
        CSV export includes QC, quarantine, recall, zone, and escalation events scoped to this warehouse.
      </p>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card border mb-3">
        <div className="card-body d-flex flex-wrap gap-2 align-items-center">
          <a className="btn btn-primary btn-sm" href={csvHref} target="_blank" rel="noreferrer">
            Download audit CSV
          </a>
          <span className="text-muted small">Opens API export (same-origin session).</span>
        </div>
      </div>

      <div className="card border mb-3">
        <div className="card-header">
          <h6 className="mb-0">QC escalations (threshold hits)</h6>
        </div>
        <div className="card-body p-0">
          {escalations.length === 0 ? (
            <div className="p-3 text-muted small">None.</div>
          ) : (
            <ul className="list-group list-group-flush">
              {escalations.map((e) => (
                <li key={e.id} className="list-group-item small">
                  Inspection #{e.id} — {e.variant?.sku} / {e.lot?.lotCode} — failed {e.failedQty}{" "}
                  <span className="badge bg-warning text-dark">escalation</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card border">
        <div className="card-header">
          <h6 className="mb-0">Active recalls (allocation freeze)</h6>
        </div>
        <div className="card-body p-0">
          {recalls.length === 0 ? (
            <div className="p-3 text-muted small">No active recalls.</div>
          ) : (
            <table className="table table-sm mb-0">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>Lot</th>
                  <th>Released?</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {recalls.map((r: any) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td className="small">{r.lotCode || r.lotId}</td>
                    <td>{r.allocationReleasedAt ? <span className="badge bg-success">Yes</span> : <span className="badge bg-danger">Frozen</span>}</td>
                    <td>
                      {!r.allocationReleasedAt && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-warning"
                          disabled={busyRecall === r.id}
                          onClick={() => releaseRecall(r.id)}
                        >
                          Release allocation
                        </button>
                      )}
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
