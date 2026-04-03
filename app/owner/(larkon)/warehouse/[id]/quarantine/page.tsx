"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { warehouseById, qcInspectionQuarantineList, qcQuarantineRelease, qcQuarantineDispose } from "@/lib/api";

export default function OwnerWarehouseQuarantinePage() {
  const params = useParams();
  const warehouseId = Number(params?.id);
  const [wh, setWh] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetById, setTargetById] = useState<Record<number, string>>({});
  const [qtyById, setQtyById] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!warehouseId) return;
    setLoading(true);
    setError(null);
    try {
      const w = await warehouseById(warehouseId);
      const orgId = (w as any)?.orgId;
      if (!orgId) throw new Error("Missing org");
      setWh(w);
      const q = await qcInspectionQuarantineList(orgId, { warehouseId, page: 1 });
      setData(q);
    } catch (e: any) {
      setError(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => {
    load();
  }, [load]);

  const items = (data as any)?.items ?? [];
  const orgId = wh?.orgId;

  async function doRelease(id: number) {
    if (!orgId) return;
    const qty = Number(qtyById[id] ?? 0);
    const target = Number(targetById[id] ?? 0);
    if (!qty || !target) {
      alert("Enter quantity and target storage location ID");
      return;
    }
    setBusy(id);
    try {
      await qcQuarantineRelease(id, orgId, { quantity: qty, targetLocationId: target });
      await load();
    } catch (e: any) {
      alert(e?.message || "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function doDispose(id: number) {
    if (!orgId) return;
    const qty = Number(qtyById[id] ?? 0);
    if (!qty) {
      alert("Enter quantity");
      return;
    }
    if (!confirm("Dispose (ledger LOSS) this quantity from quarantine?")) return;
    setBusy(id);
    try {
      await qcQuarantineDispose(id, orgId, { quantity: qty });
      await load();
    } catch (e: any) {
      alert(e?.message || "Failed");
    } finally {
      setBusy(null);
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
      <h4 className="mt-2">Quarantine</h4>
      <p className="text-muted small">Open QC holds with remaining quarantine quantity.</p>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card border">
        <div className="card-body p-0">
          {items.length === 0 ? (
            <div className="text-center py-5 text-muted">No active quarantine lines.</div>
          ) : (
            <table className="table table-sm mb-0">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>SKU / Lot</th>
                  <th>Remaining</th>
                  <th>Quarantine loc</th>
                  <th>Qty</th>
                  <th>Target loc</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((r: any) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td className="small">
                      {r.variant?.sku} / {r.lot?.lotCode}
                    </td>
                    <td>{r.quarantineRemainingQty}</td>
                    <td className="small">{r.quarantineLocation?.name || r.quarantineLocationId}</td>
                    <td style={{ maxWidth: 90 }}>
                      <input
                        className="form-control form-control-sm"
                        placeholder="Qty"
                        value={qtyById[r.id] ?? ""}
                        onChange={(e) => setQtyById((m) => ({ ...m, [r.id]: e.target.value }))}
                      />
                    </td>
                    <td style={{ maxWidth: 100 }}>
                      <input
                        className="form-control form-control-sm"
                        placeholder="To loc #"
                        value={targetById[r.id] ?? ""}
                        onChange={(e) => setTargetById((m) => ({ ...m, [r.id]: e.target.value }))}
                      />
                    </td>
                    <td className="text-nowrap">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary me-1"
                        disabled={busy === r.id}
                        onClick={() => doRelease(r.id)}
                      >
                        Release
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        disabled={busy === r.id}
                        onClick={() => doDispose(r.id)}
                      >
                        Dispose
                      </button>
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
