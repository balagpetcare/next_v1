"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet, getFinancialIntelligenceSummary, postFinancialIntelligenceRefresh } from "@/app/owner/_lib/ownerApi";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

type BranchRow = { id: number; name?: string; org?: { id: number } };

function pickBranches(resp: unknown): BranchRow[] {
  if (!resp || typeof resp !== "object") return [];
  const r = resp as { data?: unknown };
  return Array.isArray(r.data) ? (r.data as BranchRow[]) : [];
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function FinancialIntelligencePage() {
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [orgId, setOrgId] = useState<number | null>(null);
  const [from, setFrom] = useState(() => isoDate(new Date(Date.now() - 30 * 86400000)));
  const [to, setTo] = useState(() => isoDate(new Date()));
  const [branchId, setBranchId] = useState<number | undefined>(undefined);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const brRes = await ownerGet<{ data?: BranchRow[] }>("/api/v1/owner/branches");
      const brs = pickBranches(brRes);
      setBranches(brs);
      const oid = brs[0]?.org?.id ?? null;
      setOrgId(oid);
      if (oid) {
        const res = await getFinancialIntelligenceSummary({
          orgId: oid,
          from: `${from}T00:00:00.000Z`,
          to: `${to}T23:59:59.999Z`,
          ...(branchId ? { branchId } : {}),
        });
        const payload = (res as { data?: Record<string, unknown> })?.data ?? res;
        setData((payload as Record<string, unknown>) ?? null);
      } else {
        setData(null);
      }
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = data?.totals as { material?: string; allocated?: string } | undefined;
  const topBranches = (data?.topBranches as { branchId?: number; branchName?: string; totalMaterial?: string }[]) ?? [];
  const topVariants = (data?.topVariants as { variantId?: number; branchId?: number; sku?: string; unitCts?: string }[]) ?? [];

  const explain = useMemo(() => data?.explain as { note?: string } | undefined, [data]);

  return (
    <div className="container-fluid py-4">
      <PageHeader
        title="Financial intelligence"
        subtitle="Cost-to-serve rollups from GRN line economics — explainable, not statutory accounting."
      />
      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <p className="text-muted">Loading…</p>}

      {orgId != null && (
        <div className="row g-2 align-items-end mb-3">
          <div className="col-auto">
            <label className="form-label small mb-0">From</label>
            <input type="date" className="form-control form-control-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="col-auto">
            <label className="form-label small mb-0">To</label>
            <input type="date" className="form-control form-control-sm" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="col-auto">
            <label className="form-label small mb-0">Branch</label>
            <select
              className="form-select form-select-sm"
              value={branchId ?? ""}
              onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name ?? b.id}
                </option>
              ))}
            </select>
          </div>
          <div className="col-auto">
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => load()} disabled={loading}>
              Apply
            </button>
          </div>
          <div className="col-auto">
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={refreshing}
              onClick={async () => {
                setRefreshing(true);
                setError(null);
                try {
                  await postFinancialIntelligenceRefresh({
                    orgId,
                    from: `${from}T00:00:00.000Z`,
                    to: `${to}T23:59:59.999Z`,
                  });
                  await load();
                } catch (e) {
                  setError(getMessageFromApiError(e as Error));
                } finally {
                  setRefreshing(false);
                }
              }}
            >
              {refreshing ? "Refreshing…" : "Refresh rollup"}
            </button>
          </div>
        </div>
      )}

      {orgId == null && !loading && <div className="alert alert-warning">No organization context — add a branch first.</div>}

      {orgId != null && !loading && (
        <>
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="text-muted small">Total material (window)</div>
                  <div className="fs-4 fw-semibold">{totals?.material ?? "0"}</div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="text-muted small">Allocated (stub)</div>
                  <div className="fs-4 fw-semibold">{totals?.allocated ?? "0"}</div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="text-muted small">Method</div>
                  <div className="small">{explain?.note ?? "—"}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white">Top branches by material</div>
                <div className="table-responsive">
                  <table className="table table-sm mb-0">
                    <thead>
                      <tr>
                        <th>Branch</th>
                        <th className="text-end">Material</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topBranches.length === 0 && (
                        <tr>
                          <td colSpan={2} className="text-muted small">
                            No CTS rows — run Refresh rollup after GRNs exist in the window.
                          </td>
                        </tr>
                      )}
                      {topBranches.map((b) => (
                        <tr key={b.branchId}>
                          <td>{b.branchName ?? b.branchId}</td>
                          <td className="text-end">{b.totalMaterial}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white">Top variants (unit CTS)</div>
                <div className="table-responsive">
                  <table className="table table-sm mb-0">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Unit CTS</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {topVariants.length === 0 && (
                        <tr>
                          <td colSpan={3} className="text-muted small">
                            No rows yet.
                          </td>
                        </tr>
                      )}
                      {topVariants.map((v) => (
                        <tr key={`${v.variantId}-${v.branchId}`}>
                          <td>{v.sku ?? v.variantId}</td>
                          <td>{v.unitCts ?? "—"}</td>
                          <td>
                            {v.variantId != null && v.branchId != null ? (
                              <Link
                                className="btn btn-link btn-sm p-0"
                                href={`/owner/inventory/financial-intelligence/cts/${v.variantId}?branchId=${v.branchId}&from=${from}&to=${to}`}
                              >
                                Detail
                              </Link>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
