"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { listQuarantineStock } from "@/app/owner/_lib/ownerApi";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

export default function QuarantineStockPage() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listQuarantineStock(orgId);
      const body = res as { data?: { lines?: any[] } } | null;
      setLines(body?.data?.lines ?? []);
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    (async () => {
      const br = await fetch("/api/v1/owner/branches", { credentials: "include" }).then((r) => r.json());
      const rows = (br?.data ?? []) as { org?: { id: number } }[];
      setOrgId(rows[0]?.org?.id ?? null);
    })();
  }, []);

  useEffect(() => {
    if (orgId) load();
  }, [orgId, load]);

  return (
    <div className="container-fluid py-4">
      <PageHeader
        title="Quarantine & hold stock"
        subtitle="Lot balances in QUARANTINE, DAMAGE_AREA, or RETURN_AREA. This stock is excluded from normal FEFO dispatch and network rebalance sourcing."
      />
      {error && <div className="alert alert-danger">{error}</div>}
      <button type="button" className="btn btn-sm btn-outline-secondary mb-3" onClick={() => load()} disabled={loading}>
        Refresh
      </button>
      {loading && <p className="text-muted">Loading…</p>}
      {!orgId && !loading && <div className="alert alert-warning">No organization context — add a branch first.</div>}

      {!loading && orgId != null && (
        <div className="table-responsive card border-0 shadow-sm">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>Location</th>
                <th>SKU</th>
                <th>Lot</th>
                <th>On hand</th>
                <th>Recall</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((ln: any) => (
                <tr key={`${ln.locationId}-${ln.lotId}`}>
                  <td className="small">
                    {ln.locationName} <span className="text-muted">({ln.locationType})</span>
                  </td>
                  <td>
                    <div className="fw-medium">{ln.sku}</div>
                    <div className="small text-muted">{ln.productName}</div>
                  </td>
                  <td className="small">{ln.lotCode}</td>
                  <td>{ln.onHandQty}</td>
                  <td className="small">{ln.recall ? `${ln.recall.status} #${ln.recall.id}` : "—"}</td>
                </tr>
              ))}
              {!lines.length && (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    No quarantine balances found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
