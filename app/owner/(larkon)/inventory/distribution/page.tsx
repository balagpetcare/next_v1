"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet, ownerPost } from "@/app/owner/_lib/ownerApi";
import { useToast } from "@/src/hooks/useToast";

function pickArray(resp: unknown): unknown[] {
  if (!resp) return [];
  const r = resp as Record<string, unknown>;
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(r.data)) return r.data as unknown[];
  if (Array.isArray(r.items)) return r.items as unknown[];
  const d = r.data as Record<string, unknown> | undefined;
  if (d && Array.isArray(d.items)) return d.items as unknown[];
  return [];
}

type Reco = {
  id: number;
  status: string;
  recommendedQty: number;
  variant?: { sku?: string; title?: string };
  fromLocation?: { name?: string; branchId?: number };
  toLocation?: { name?: string; branchId?: number };
};

export default function OwnerDistributionRecommendationsPage() {
  const toast = useToast();
  const [orgId, setOrgId] = useState<number | null>(null);
  const [rows, setRows] = useState<Reco[]>([]);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [err, setErr] = useState("");
  const [execId, setExecId] = useState<number | null>(null);
  const [targets, setTargets] = useState<Record<number, "STOCK_REQUEST" | "WTO">>({});

  const loadOrg = useCallback(async () => {
    try {
      const orgsRes = await ownerGet("/api/v1/owner/organizations").catch(() => ({ data: [] }));
      const orgRows = pickArray(orgsRes) as { id?: number }[];
      const oid = orgRows[0]?.id != null ? Number(orgRows[0].id) : null;
      setOrgId(oid && Number.isFinite(oid) ? oid : null);
    } catch {
      setOrgId(null);
    }
  }, []);

  const loadReco = useCallback(async () => {
    if (!orgId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const res = await ownerGet(`/api/v1/network-balance/recommendations?orgId=${orgId}&status=OPEN&limit=100`);
      const items =
        (res as { items?: Reco[] })?.items ??
        (res as { data?: { items?: Reco[] } })?.data?.items ??
        [];
      setRows(Array.isArray(items) ? items : []);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadOrg();
  }, [loadOrg]);

  useEffect(() => {
    loadReco();
  }, [loadReco]);

  async function handleAccept(row: Reco) {
    if (!orgId) return;
    const target = targets[row.id] ?? "STOCK_REQUEST";
    setExecId(row.id);
    setErr("");
    try {
      await ownerPost(`/api/v1/network-balance/recommendations/${row.id}/accept?orgId=${orgId}`, {
        target,
      });
      toast.success(target === "WTO" ? "Warehouse transfer order created" : "Stock request created");
      await loadReco();
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : "Accept failed";
      setErr(m);
      toast.error(m);
    } finally {
      setExecId(null);
    }
  }

  async function handleRecompute() {
    if (!orgId) return;
    setRecomputing(true);
    setErr("");
    try {
      await ownerPost(`/api/v1/network-balance/recompute?orgId=${orgId}`, {});
      await loadReco();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Recompute failed");
    } finally {
      setRecomputing(false);
    }
  }

  return (
    <div className="container-fluid py-4">
      <PageHeader title="Distribution recommendations" subtitle="DC → branch transfer suggestions (network balance)" />
      <nav aria-label="breadcrumb" className="mb-2">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link href="/owner/inventory">Inventory</Link>
          </li>
          <li className="breadcrumb-item active">Distribution</li>
        </ol>
      </nav>

      <div className="d-flex gap-2 mb-3 flex-wrap">
        <button type="button" className="btn btn-primary btn-sm" disabled={!orgId || recomputing} onClick={handleRecompute}>
          {recomputing ? "…" : "Regenerate suggestions"}
        </button>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
        </div>
      ) : (
        <div className="table-responsive card border radius-12">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>ID</th>
                <th>Variant</th>
                <th className="text-end">Qty</th>
                <th>From</th>
                <th>To</th>
                <th>Status</th>
                <th>Execute</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>
                    <span className="small text-muted d-block">{r.variant?.sku}</span>
                    {r.variant?.title}
                  </td>
                  <td className="text-end">{r.recommendedQty}</td>
                  <td className="small">{r.fromLocation?.name ?? "—"}</td>
                  <td className="small">{r.toLocation?.name ?? "—"}</td>
                  <td>{r.status}</td>
                  <td>
                    <div className="d-flex flex-wrap gap-1 align-items-center">
                      <select
                        className="form-select form-select-sm"
                        style={{ width: 140 }}
                        value={targets[r.id] ?? "STOCK_REQUEST"}
                        onChange={(e) =>
                          setTargets((s) => ({
                            ...s,
                            [r.id]: e.target.value === "WTO" ? "WTO" : "STOCK_REQUEST",
                          }))
                        }
                      >
                        <option value="STOCK_REQUEST">Stock request</option>
                        <option value="WTO">WTO</option>
                      </select>
                      <button
                        type="button"
                        className="btn btn-sm btn-success"
                        disabled={!orgId || execId === r.id}
                        onClick={() => handleAccept(r)}
                      >
                        {execId === r.id ? "…" : "Execute"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    No open recommendations. Run regeneration after receiving stock at the DC.
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
