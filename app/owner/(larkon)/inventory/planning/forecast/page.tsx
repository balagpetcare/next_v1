"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import { getAiForecast, getAiDemandTrend } from "@/app/owner/_lib/ownerApi";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

type BranchRow = { id: number; name?: string; org?: { id: number } };

type ForecastRow = {
  snapshot?: Record<string, unknown>;
  explain?: { method?: string; factors?: { name: string; value: number | string; description: string }[] };
};

export default function PlanningForecastPage() {
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [branchId, setBranchId] = useState<number | "">("");
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [productId, setProductId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [rows, setRows] = useState<ForecastRow[]>([]);
  const [detailVariant, setDetailVariant] = useState<{ id: number; sku?: string } | null>(null);
  const [trend, setTrend] = useState<{ date: string; units: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ownerGet<{ data?: BranchRow[] }>("/api/v1/owner/branches").then((r) => {
      const list = Array.isArray(r?.data) ? r!.data! : [];
      setBranches(list);
      if (list[0]?.id) setBranchId(list[0].id);
    });
  }, []);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getAiForecast({
        branchId: Number(branchId),
        ...(productId.trim() ? { productId: Number(productId) } : {}),
        ...(categoryId.trim() ? { categoryId: Number(categoryId) } : {}),
        ...(warehouseId.trim() ? { warehouseId: Number(warehouseId), planningScope: "WAREHOUSE" as const } : {}),
      });
      const data = (res as { data?: ForecastRow[] })?.data;
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [branchId, warehouseId, productId, categoryId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    async function t() {
      if (!branchId || !detailVariant?.id) {
        setTrend([]);
        return;
      }
      try {
        const r = await getAiDemandTrend({
          branchId: Number(branchId),
          variantId: detailVariant.id,
          windowDays: 90,
          ...(warehouseId.trim() ? { warehouseId: Number(warehouseId) } : {}),
        });
        const series = (r as { data?: { series?: { date: string; units: number }[] } })?.data?.series;
        setTrend(Array.isArray(series) ? series : []);
      } catch {
        setTrend([]);
      }
    }
    t();
  }, [branchId, detailVariant, warehouseId]);

  return (
    <div className="container-fluid py-4">
      <PageHeader title="Demand forecast" subtitle="Historical ledger demand, projected horizon units, and explainability factors." />
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-2 align-items-end mb-3">
        <div className="col-md-3">
          <label className="form-label small text-muted">Branch</label>
          <select
            className="form-select form-select-sm"
            value={branchId === "" ? "" : String(branchId)}
            onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : "")}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name ?? `Branch ${b.id}`}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-2">
          <label className="form-label small text-muted">Warehouse id (optional)</label>
          <input
            className="form-control form-control-sm"
            placeholder="All branch locs"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
          />
        </div>
        <div className="col-md-2">
          <label className="form-label small text-muted">Product id</label>
          <input className="form-control form-control-sm" value={productId} onChange={(e) => setProductId(e.target.value)} />
        </div>
        <div className="col-md-2">
          <label className="form-label small text-muted">Category id</label>
          <input className="form-control form-control-sm" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} />
        </div>
        <div className="col-md-2">
          <button type="button" className="btn btn-sm btn-outline-primary w-100" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Apply filters"}
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-sm table-hover align-middle">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th>Scope</th>
              <th className="text-end">Forecast units</th>
              <th className="text-end">Avg/day</th>
              <th className="text-end">Confidence</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="text-muted">
                  {loading ? "Loading…" : "No snapshots — run the daily forecast job or pick another branch."}
                </td>
              </tr>
            )}
            {rows.map((r, i) => {
              const s = r.snapshot ?? {};
              const v = s.variant as { sku?: string; title?: string; product?: { name?: string } } | undefined;
              return (
                <tr key={`${s.id ?? i}`}>
                  <td>{v?.sku ?? "—"}</td>
                  <td>{v?.product?.name ?? "—"}</td>
                  <td>
                    <span className="badge bg-secondary-subtle text-secondary">
                      {String(s.planningScope ?? "BRANCH")}
                      {Number(s.scopeWarehouseId) > 0 ? ` · WH ${String(s.scopeWarehouseId)}` : ""}
                    </span>
                  </td>
                  <td className="text-end">{Number(s.forecastUnits ?? 0).toFixed(1)}</td>
                  <td className="text-end">{Number(s.avgDailyDemand ?? 0).toFixed(3)}</td>
                  <td className="text-end">{((Number(s.confidence) || 0) * 100).toFixed(0)}%</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() =>
                        setDetailVariant({ id: Number(s.variantId), sku: v?.sku })
                      }
                    >
                      Explain
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {detailVariant && (
        <div className="card border-0 shadow-sm mt-4">
          <div className="card-header d-flex justify-content-between align-items-center">
            <span>
              Explanation — variant {detailVariant.sku ?? detailVariant.id}
            </span>
            <button type="button" className="btn-close" aria-label="Close" onClick={() => setDetailVariant(null)} />
          </div>
          <div className="card-body">
            <p className="small text-muted mb-2">Daily demand trend (UTC days)</p>
            <div className="small" style={{ maxHeight: 120, overflow: "auto" }}>
              {trend.length === 0 ? (
                <span className="text-muted">No trend points</span>
              ) : (
                trend.slice(-14).map((p) => (
                  <span key={p.date} className="me-2 d-inline-block">
                    {p.date}: <strong>{p.units}</strong>
                  </span>
                ))
              )}
            </div>
            <hr />
            <ul className="small mb-0">
              {(
                rows.find((x) => Number((x.snapshot as { variantId?: number })?.variantId) === detailVariant.id)
                  ?.explain?.factors ?? []
              ).map((f, j) => (
                <li key={j}>
                  <strong>{f.name}</strong>: {typeof f.value === "number" ? f.value.toFixed(4) : f.value} — {f.description}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
