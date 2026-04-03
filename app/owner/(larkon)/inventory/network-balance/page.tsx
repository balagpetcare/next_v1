"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import {
  networkBalanceRecompute,
  listNetworkRecommendations,
  getNetworkBalanceSnapshot,
  dismissNetworkRecommendation,
  acceptNetworkRecommendation,
} from "@/app/owner/_lib/ownerApi";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

type BranchRow = { id: number; org?: { id: number } };

export default function NetworkBalancePage() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(null);
  const [reco, setReco] = useState<{ items?: unknown[] } | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const [sn, list] = await Promise.all([
        getNetworkBalanceSnapshot(orgId),
        listNetworkRecommendations({ orgId, status: "OPEN", limit: 50 }),
      ]);
      const snr = sn as { data?: { rollupJson?: Record<string, unknown>; computedAt?: string } } | null;
      const lr = list as { items?: unknown[]; pagination?: unknown } | null;
      const snapRow = snr?.data;
      setSnapshot(
        snapRow
          ? { rollupJson: snapRow.rollupJson, computedAt: snapRow.computedAt }
          : null
      );
      setReco(lr ?? null);
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
    } finally {
      setLoading(false);
    }
  }, [orgId]);

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

  const rollup = snapshot?.rollupJson as Record<string, unknown> | undefined;
  const snapComputedAt = snapshot?.computedAt as string | undefined;

  return (
    <div className="container-fluid py-4">
      <PageHeader
        title="Network supply balance"
        subtitle="Surplus → shortage recommendations across branches and warehouses. Recompute, review, then accept as a transfer order or stock request."
      />
      {error && <div className="alert alert-danger">{error}</div>}
      {!orgId && !loading && <div className="alert alert-warning">No organization context — add a branch first.</div>}

      {orgId != null && (
        <div className="d-flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await networkBalanceRecompute({ orgId });
                await load();
              } catch (e) {
                setError(getMessageFromApiError(e as Error));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Running…" : "Recompute recommendations"}
          </button>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => load()} disabled={loading}>
            Refresh
          </button>
        </div>
      )}

      {orgId != null && (
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small">Last run</div>
                <div className="fw-semibold">{snapComputedAt || (rollup?.computedAt as string) || "—"}</div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small">Recommendations created</div>
                <div className="fs-4 fw-semibold">{String(rollup?.recommendationsCreated ?? "—")}</div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small">Variants considered</div>
                <div className="fs-4 fw-semibold">{String(rollup?.variantsConsidered ?? "—")}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && <p className="text-muted">Loading…</p>}

      {orgId != null && !loading && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white d-flex justify-content-between align-items-center">
            <span className="fw-semibold">Open recommendations</span>
            <Link href="/owner/inventory/planning" className="small">
              Supply planning
            </Link>
          </div>
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Qty</th>
                  <th>Target</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {((reco?.items ?? []) as any[]).map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="fw-medium">{r.variant?.sku}</div>
                      <div className="small text-muted">{r.variant?.product?.name}</div>
                    </td>
                    <td className="small">
                      {r.fromLocation?.name}{" "}
                      <span className="text-muted">({r.fromLocation?.type})</span>
                    </td>
                    <td className="small">
                      {r.toLocation?.name} <span className="text-muted">({r.toLocation?.type})</span>
                    </td>
                    <td>{r.recommendedQty}</td>
                    <td className="small">{r.targetEntityType || "—"}</td>
                    <td className="text-end">
                      <Link href={`/owner/inventory/network-balance/recommendations/${r.id}`} className="btn btn-sm btn-outline-primary me-1">
                        Detail
                      </Link>
                      <button
                        type="button"
                        className="btn btn-sm btn-success me-1"
                        onClick={async () => {
                          if (!orgId) return;
                          const tt = r.targetEntityType as string | null | undefined;
                          if (tt !== "WTO" && tt !== "STOCK_REQUEST") {
                            setError("This row has no WTO/stock-request target — open Detail to review explainability.");
                            return;
                          }
                          if (
                            !confirm(
                              `Accept recommendation #${r.id} as ${tt}? A draft ${tt === "WTO" ? "warehouse transfer" : "stock request"} will be created.`
                            )
                          ) {
                            return;
                          }
                          try {
                            await acceptNetworkRecommendation(r.id, { orgId, target: tt });
                            await load();
                          } catch (e) {
                            setError(getMessageFromApiError(e as Error));
                          }
                        }}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={async () => {
                          if (!orgId) return;
                          if (!confirm(`Dismiss recommendation #${r.id}?`)) return;
                          try {
                            await dismissNetworkRecommendation(r.id, orgId);
                            await load();
                          } catch (e) {
                            setError(getMessageFromApiError(e as Error));
                          }
                        }}
                      >
                        Dismiss
                      </button>
                    </td>
                  </tr>
                ))}
                {(!(reco?.items as any[])?.length || (reco?.items as any[]).length === 0) && (
                  <tr>
                    <td colSpan={6} className="text-muted text-center py-4">
                      No open recommendations. Run recompute after configuring min/max at locations.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
