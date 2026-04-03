"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import { getAiProcurementRecommendations, getAiProcurementPriceHistory, getAiProcurementLeadTimeHistory } from "@/app/owner/_lib/ownerApi";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

type BranchRow = { id: number; name?: string };

type VendorRank = {
  vendorId: number;
  vendorName: string;
  score: number;
  unitPrice: number | null;
  reasonCodes?: string[];
  avgLeadTimeDays?: number | null;
  delayedReceiveCount?: number;
};

type RecRow = {
  id: number;
  variantId: number;
  variant?: { sku?: string; title?: string; product?: { name?: string } };
  rankedVendors?: VendorRank[];
  scores?: Record<string, unknown>;
  weights?: Record<string, number>;
};

export default function PlanningProcurementPage() {
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [branchId, setBranchId] = useState<number | "">("");
  const [rows, setRows] = useState<RecRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceHist, setPriceHist] = useState<unknown[] | null>(null);
  const [leadHist, setLeadHist] = useState<unknown[] | null>(null);
  const [detail, setDetail] = useState<{ variantId: number; vendorId: number; sku?: string } | null>(null);

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
      const res = await getAiProcurementRecommendations({ branchId: Number(branchId) });
      const data = (res as { data?: RecRow[] })?.data;
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    async function h() {
      if (!branchId || !detail) {
        setPriceHist(null);
        setLeadHist(null);
        return;
      }
      try {
        const [p, l] = await Promise.all([
          getAiProcurementPriceHistory({
            branchId: Number(branchId),
            variantId: detail.variantId,
            vendorId: detail.vendorId,
          }),
          getAiProcurementLeadTimeHistory({ branchId: Number(branchId), vendorId: detail.vendorId }),
        ]);
        setPriceHist((p as { data?: unknown[] })?.data ?? []);
        setLeadHist((l as { data?: unknown[] })?.data ?? []);
      } catch {
        setPriceHist([]);
        setLeadHist([]);
      }
    }
    h();
  }, [branchId, detail]);

  return (
    <div className="container-fluid py-4">
      <PageHeader
        title="Procurement intelligence"
        subtitle="Ranked vendors per SKU from listings and GRN history. No automatic purchase orders."
      />
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-2 align-items-end mb-3">
        <div className="col-md-4">
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
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th>Top vendor</th>
              <th className="text-end">Score</th>
              <th className="text-end">Ref. price</th>
              <th>Shortage context</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="text-muted">
                  {loading ? "Loading…" : "No procurement rows — run procurement sync job or ensure vendor listings exist."}
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const top = r.rankedVendors?.[0];
              const shortage = (r.scores as { shortageRiskAtBranch?: number })?.shortageRiskAtBranch;
              return (
                <tr key={r.id}>
                  <td>{r.variant?.sku ?? r.variantId}</td>
                  <td>{r.variant?.product?.name ?? "—"}</td>
                  <td>{top?.vendorName ?? "—"}</td>
                  <td className="text-end">{top ? (top.score * 100).toFixed(1) : "—"}%</td>
                  <td className="text-end">{top?.unitPrice != null ? top.unitPrice.toFixed(2) : "—"}</td>
                  <td>
                    {shortage != null && shortage > 0.5 ? (
                      <span className="badge bg-danger-subtle text-danger">Branch shortage signal</span>
                    ) : (
                      <span className="text-muted small">—</span>
                    )}
                  </td>
                  <td>
                    {top && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() =>
                          setDetail({ variantId: r.variantId, vendorId: top.vendorId, sku: r.variant?.sku })
                        }
                      >
                        History
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="card border-0 shadow-sm mt-3">
          <div className="card-header d-flex justify-content-between">
            <span>
              GRN price & lead-time history — {detail.sku ?? detail.variantId} / vendor {detail.vendorId}
            </span>
            <button type="button" className="btn-close" aria-label="Close" onClick={() => setDetail(null)} />
          </div>
          <div className="card-body row g-3">
            <div className="col-md-6">
              <h6 className="small text-muted">Recent unit costs (GRN)</h6>
              <div className="small" style={{ maxHeight: 160, overflow: "auto" }}>
                {(priceHist ?? []).slice(0, 12).map((p: any, i: number) => (
                  <div key={i}>
                    {p.receivedAt?.slice?.(0, 10) ?? "—"} — {p.unitCost ?? "—"} × {p.quantity ?? "—"}
                  </div>
                ))}
                {(!priceHist || priceHist.length === 0) && <span className="text-muted">No rows</span>}
              </div>
            </div>
            <div className="col-md-6">
              <h6 className="small text-muted">Receive lead times vs PO date</h6>
              <div className="small" style={{ maxHeight: 160, overflow: "auto" }}>
                {(leadHist ?? []).slice(0, 12).map((p: any, i: number) => (
                  <div key={i}>
                    GRN {p.grnId}: {p.leadTimeDays != null ? `${p.leadTimeDays.toFixed(1)}d` : "—"}{" "}
                    {p.delayedVsPo ? <span className="text-warning">late vs PO</span> : ""}
                  </div>
                ))}
                {(!leadHist || leadHist.length === 0) && <span className="text-muted">No rows</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
