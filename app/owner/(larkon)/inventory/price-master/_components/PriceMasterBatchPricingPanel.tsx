"use client";

import { useCallback, useEffect, useState } from "react";
import type { BranchOption } from "../_lib/priceMasterTypes";

type LotRow = { id: number; lotCode: string; expDate: string; mfgDate: string };
type RuleRow = {
  id: number;
  lotId: number;
  variantId: number;
  branchId?: number | null;
  promoPrice?: unknown;
  recommendedSellPrice?: unknown;
  liquidationReason?: string | null;
  validFrom?: string;
  validTo?: string | null;
  status: string;
  lot?: { lotCode?: string; expDate?: string };
  branch?: { id: number; name: string } | null;
};

type Props = {
  orgId: number;
  variantId: number;
  branches: BranchOption[];
  canWrite: boolean;
  ownerGet: <T>(path: string) => Promise<T | null>;
  ownerPost: (path: string, body: unknown) => Promise<unknown>;
  onClose: () => void;
};

export function PriceMasterBatchPricingPanel({ orgId, variantId, branches, canWrite, ownerGet, ownerPost, onClose }: Props) {
  const [lots, setLots] = useState<LotRow[]>([]);
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [form, setForm] = useState({
    id: "" as string,
    lotId: "",
    branchId: "",
    promoPrice: "",
    recommendedSellPrice: "",
    liquidationReason: "",
    validFrom: "",
    validTo: "",
    status: "ACTIVE",
  });

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const [lr, rr] = await Promise.all([
        ownerGet<{ data?: LotRow[] }>(`/api/v1/pricing/stock-lots?orgId=${orgId}&variantId=${variantId}`),
        ownerGet<{ data?: RuleRow[] }>(`/api/v1/pricing/batch-rules?orgId=${orgId}&variantId=${variantId}`),
      ]);
      setLots(Array.isArray((lr as { data?: LotRow[] })?.data) ? (lr as { data: LotRow[] }).data : []);
      setRules(Array.isArray((rr as { data?: RuleRow[] })?.data) ? (rr as { data: RuleRow[] }).data : []);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [orgId, variantId, ownerGet]);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(r: RuleRow) {
    setForm({
      id: String(r.id),
      lotId: String(r.lotId),
      branchId: r.branchId != null ? String(r.branchId) : "",
      promoPrice: r.promoPrice != null ? String(r.promoPrice) : "",
      recommendedSellPrice: r.recommendedSellPrice != null ? String(r.recommendedSellPrice) : "",
      liquidationReason: r.liquidationReason ?? "",
      validFrom: r.validFrom ? r.validFrom.slice(0, 16) : "",
      validTo: r.validTo ? r.validTo.slice(0, 16) : "",
      status: r.status || "ACTIVE",
    });
  }

  function resetNew() {
    setForm({
      id: "",
      lotId: "",
      branchId: "",
      promoPrice: "",
      recommendedSellPrice: "",
      liquidationReason: "",
      validFrom: "",
      validTo: "",
      status: "ACTIVE",
    });
  }

  async function save() {
    if (!canWrite) return;
    const lotId = parseInt(form.lotId, 10);
    if (!Number.isFinite(lotId)) {
      setErr("Select or enter a valid stock lot.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const body: Record<string, unknown> = {
        orgId,
        variantId,
        lotId,
        promoPrice: form.promoPrice.trim() === "" ? null : parseFloat(form.promoPrice),
        recommendedSellPrice: form.recommendedSellPrice.trim() === "" ? null : parseFloat(form.recommendedSellPrice),
        liquidationReason: form.liquidationReason.trim() || null,
        status: form.status,
      };
      if (form.branchId.trim()) {
        const b = parseInt(form.branchId, 10);
        if (Number.isFinite(b)) body.branchId = b;
      } else body.branchId = null;
      if (form.validFrom.trim()) body.validFrom = new Date(form.validFrom).toISOString();
      if (form.validTo.trim()) body.validTo = new Date(form.validTo).toISOString();
      else body.validTo = null;
      if (form.id.trim()) body.id = parseInt(form.id, 10);
      await ownerPost("/api/v1/pricing/batch-rules", body);
      resetNew();
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function downloadBatchCsv() {
    setErr(null);
    setImportSummary(null);
    try {
      const res = await ownerGet<{ success?: boolean; data?: { csv?: string; filename?: string }; message?: string }>(
        `/api/v1/pricing/batch-rules/export?orgId=${orgId}&variantId=${variantId}`
      );
      if (res == null) {
        throw new Error("Not authorized or unable to load export (check pricing permissions).");
      }
      if (res.success === false) {
        throw new Error(res.message || "Export failed");
      }
      const csv = res.data?.csv;
      if (csv == null || csv === "") {
        throw new Error(res.message || "Server returned no CSV (empty rules still include a header—contact support if this persists).");
      }
      const filename = res.data?.filename ?? `batch-pricing-variant-${variantId}.csv`;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Export failed");
    }
  }

  async function onImportCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !canWrite) return;
    setImportBusy(true);
    setErr(null);
    setImportSummary(null);
    try {
      const text = await file.text();
      const res = await ownerPost(
        "/api/v1/pricing/batch-rules/import-csv",
        { orgId, csv: text }
      ) as { success?: boolean; data?: { created?: number; updated?: number; failed?: number; results?: unknown[] } };
      const d = res?.data;
      if (d) {
        setImportSummary(
          `Created ${d.created ?? 0}, updated ${d.updated ?? 0}, failed ${d.failed ?? 0}. See row results in console or re-export to verify.`
        );
      }
      await load();
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : "Import failed");
    } finally {
      setImportBusy(false);
    }
  }

  return (
    <div className="border rounded-3 p-3 mb-3 bg-light">
      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
        <div>
          <h6 className="mb-1">Batch / lot pricing</h6>
          <p className="small text-muted mb-0">
            Contextual promo or recommended sell for a <strong>stock lot</strong>. Does not change catalog MRP in Price Master.
            Requires governance <strong>batch pricing</strong> enabled for resolution to pick promos at the branch shop.
          </p>
          <div className="d-flex flex-wrap gap-2 mt-2">
            <button type="button" className="btn btn-outline-secondary btn-sm" disabled={loading} onClick={() => void downloadBatchCsv()}>
              Export CSV (this SKU)
            </button>
            {canWrite && (
              <>
                <label className="btn btn-outline-primary btn-sm mb-0">
                  {importBusy ? "Importing…" : "Import CSV"}
                  <input type="file" accept=".csv,text/csv" className="d-none" disabled={importBusy} onChange={(ev) => void onImportCsvFile(ev)} />
                </label>
              </>
            )}
          </div>
          {importSummary && <p className="small text-success mb-0 mt-2">{importSummary}</p>}
        </div>
        <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
      </div>

      {loading && <p className="small text-muted">Loading lots and rules…</p>}
      {err && <div className="alert alert-danger py-2 small">{err}</div>}

      {!loading && (
        <>
          <div className="table-responsive mb-3">
            <table className="table table-sm align-middle mb-0 bg-white">
              <thead className="table-light">
                <tr>
                  <th className="small">Lot</th>
                  <th className="small">Branch</th>
                  <th className="small">Promo</th>
                  <th className="small">Rec.</th>
                  <th className="small">Status</th>
                  <th className="small text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id}>
                    <td className="small">
                      {r.lot?.lotCode ?? `#${r.lotId}`}
                      <div className="text-muted">{r.lot?.expDate?.slice?.(0, 10) ?? ""}</div>
                    </td>
                    <td className="small">{r.branch?.name ?? "All branches"}</td>
                    <td className="small">{r.promoPrice != null ? String(r.promoPrice) : "—"}</td>
                    <td className="small">{r.recommendedSellPrice != null ? String(r.recommendedSellPrice) : "—"}</td>
                    <td className="small">{r.status}</td>
                    <td className="text-end">
                      {canWrite && (
                        <button type="button" className="btn btn-link btn-sm p-0" onClick={() => startEdit(r)}>
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rules.length === 0 && <p className="small text-muted mb-0">No batch pricing rules for this SKU.</p>}
          </div>

          {canWrite && (
            <div className="border rounded p-3 bg-white small">
              <div className="fw-semibold mb-2">{form.id ? "Edit rule" : "New rule"}</div>
              <div className="row g-2">
                <div className="col-md-6">
                  <label className="form-label">Stock lot</label>
                  <select className="form-select form-select-sm" value={form.lotId} onChange={(e) => setForm((f) => ({ ...f, lotId: e.target.value }))}>
                    <option value="">Select lot…</option>
                    {lots.map((l) => (
                      <option key={l.id} value={String(l.id)}>
                        {l.lotCode} · exp {l.expDate?.slice?.(0, 10) ?? ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Branch scope (optional)</label>
                  <select className="form-select form-select-sm" value={form.branchId} onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}>
                    <option value="">All branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={String(b.id)}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Promo price</label>
                  <input className="form-control form-control-sm" value={form.promoPrice} onChange={(e) => setForm((f) => ({ ...f, promoPrice: e.target.value }))} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Recommended sell</label>
                  <input
                    className="form-control form-control-sm"
                    value={form.recommendedSellPrice}
                    onChange={(e) => setForm((f) => ({ ...f, recommendedSellPrice: e.target.value }))}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Status</label>
                  <select className="form-select form-select-sm" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label">Reason / note</label>
                  <input className="form-control form-control-sm" value={form.liquidationReason} onChange={(e) => setForm((f) => ({ ...f, liquidationReason: e.target.value }))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Valid from</label>
                  <input type="datetime-local" className="form-control form-control-sm" value={form.validFrom} onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Valid to</label>
                  <input type="datetime-local" className="form-control form-control-sm" value={form.validTo} onChange={(e) => setForm((f) => ({ ...f, validTo: e.target.value }))} />
                </div>
              </div>
              <div className="d-flex gap-2 mt-3">
                <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={() => void save()}>
                  {saving ? "Saving…" : "Save batch rule"}
                </button>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={resetNew}>
                  New
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
