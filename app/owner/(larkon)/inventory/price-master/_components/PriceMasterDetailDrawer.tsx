"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { OWNER_PRICING_NAV } from "@/src/lib/ownerPricingNav";
import { validateCentralBand, costWarnings, marginFromBase, hasBlockingErrors } from "../_lib/centralPricingValidation";
import type { BranchOption, CostSignal, OrgPricingRow } from "../_lib/priceMasterTypes";
import { PriceMasterBatchPricingPanel } from "./PriceMasterBatchPricingPanel";

type Props = {
  row: OrgPricingRow | null;
  orgId: number | null;
  branches: BranchOption[];
  canWrite: boolean;
  onClose: () => void;
  onSaved: () => void;
  ownerGet: <T>(path: string) => Promise<T | null>;
  ownerPost: (path: string, body: unknown) => Promise<unknown>;
};

function numStr(v: unknown) {
  if (v == null) return "";
  return String(v);
}

export function PriceMasterDetailDrawer({ row, orgId, branches, canWrite, onClose, onSaved, ownerGet, ownerPost }: Props) {
  const [showBatch, setShowBatch] = useState(false);
  const [base, setBase] = useState("");
  const [markup, setMarkup] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [mrp, setMrp] = useState("");
  const [cost, setCost] = useState<CostSignal | null>(null);
  const [loadingCost, setLoadingCost] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!row) return;
    setShowBatch(false);
    setBase(numStr(row.basePrice));
    setMarkup(numStr(row.markupPercent));
    setMin(numStr(row.minPrice));
    setMax(numStr(row.maxPrice));
    setMrp(numStr(row.mrp));
    setErr(null);
    setCost(null);
  }, [row]);

  useEffect(() => {
    if (!row || !orgId) return;
    let cancelled = false;
    (async () => {
      setLoadingCost(true);
      try {
        const res = await ownerGet<{ data?: CostSignal }>(
          `/api/v1/pricing/cost-signal?orgId=${orgId}&variantId=${row.variantId}`
        );
        if (!cancelled) setCost((res as { data?: CostSignal })?.data ?? null);
      } catch {
        if (!cancelled) setCost(null);
      } finally {
        if (!cancelled) setLoadingCost(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [row, orgId, ownerGet]);

  if (!row) return null;
  const activeRow = row;

  const refCost = cost?.latestUnitCost ?? null;
  const baseN = base === "" ? null : parseFloat(base);
  const issues = validateCentralBand({
    basePrice: baseN,
    markupPercent: markup === "" ? null : parseFloat(markup),
    minPrice: min === "" ? null : parseFloat(min),
    maxPrice: max === "" ? null : parseFloat(max),
    mrp: mrp === "" ? null : parseFloat(mrp),
  });
  issues.push(...costWarnings(baseN, refCost));
  const margin = marginFromBase(baseN, refCost);

  async function save() {
    if (!orgId || !canWrite) return;
    if (hasBlockingErrors(issues)) {
      setErr("Fix validation errors before saving.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await ownerPost("/api/v1/pricing/org", {
        orgId,
        variantId: activeRow.variantId,
        basePrice: base === "" ? null : parseFloat(base),
        markupPercent: markup === "" ? null : parseFloat(markup),
        minPrice: min === "" ? null : parseFloat(min),
        maxPrice: max === "" ? null : parseFloat(max),
        mrp: mrp === "" ? null : parseFloat(mrp),
      });
      onSaved();
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="offcanvas offcanvas-end show" tabIndex={-1} style={{ visibility: "visible", width: 420 }}>
        <div className="offcanvas-header border-bottom">
          <div>
            <h5 className="offcanvas-title mb-0">Pricing detail</h5>
            <div className="small text-muted font-monospace">{activeRow.variant?.sku}</div>
          </div>
          <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
        </div>
        <div className="offcanvas-body">
          <p className="small mb-2">
            <span className="fw-medium">{activeRow.variant?.title}</span>
            <br />
            <span className="text-muted">{activeRow.variant?.product?.name}</span>
            {activeRow.variant?.product?.category?.name && (
              <>
                <br />
                <span className="badge bg-light text-dark border">{activeRow.variant.product.category.name}</span>
              </>
            )}
          </p>
          <div className="mb-3 small">
            <Link href={OWNER_PRICING_NAV.governance} className="text-decoration-none">
              Pricing governance
            </Link>
            <span className="text-muted"> · </span>
            <Link href={`${OWNER_PRICING_NAV.governance}?tab=audit`} className="text-decoration-none">
              Audit log
            </Link>
            <span className="text-muted"> · </span>
            <Link
              href={`${OWNER_PRICING_NAV.governance}?tab=audit&entityType=BATCH_PRICING_RULE`}
              className="text-decoration-none"
            >
              Batch rule audits
            </Link>
          </div>

          <p className="small text-muted border-start border-3 ps-2 mb-3">
            <strong>Canonical MRP</strong> lives in this catalog row. Enterprise discount rules, campaigns, membership, and batch promos
            only change <strong>resolved sell/list</strong> at runtime — they do not rewrite stored MRP.
          </p>

          {orgId != null && (
            <div className="mb-3">
              {!showBatch ? (
                <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setShowBatch(true)}>
                  Batch / lot pricing…
                </button>
              ) : (
                <PriceMasterBatchPricingPanel
                  orgId={orgId}
                  variantId={activeRow.variantId}
                  branches={branches}
                  canWrite={canWrite}
                  ownerGet={ownerGet}
                  ownerPost={ownerPost}
                  onClose={() => setShowBatch(false)}
                />
              )}
            </div>
          )}

          <h6 className="small text-uppercase text-muted">Reference cost</h6>
          {loadingCost ? (
            <p className="small text-muted">Loading cost signal…</p>
          ) : (
            <p className="small mb-3">
              {refCost != null ? (
                <>
                  Latest reference unit cost: <strong>{refCost}</strong>
                  {cost?.sampleCount != null && (
                    <span className="text-muted"> ({cost.sampleCount} recent ledger sample(s))</span>
                  )}
                </>
              ) : (
                <span className="text-muted">No recent purchase / GRN unit cost found for this variant.</span>
              )}
            </p>
          )}
          {margin.amount != null && (
            <p className="small mb-3">
              Estimated margin vs reference cost: <strong>{margin.amount}</strong> ({margin.pct}%)
            </p>
          )}

          {issues.length > 0 && (
            <div className="mb-3">
              {issues.map((i) => (
                <div key={i.code + i.message} className={`alert alert-${i.level === "error" ? "danger" : "warning"} py-1 small mb-1`}>
                  {i.message}
                </div>
              ))}
            </div>
          )}

          <div className="row g-2 small">
            <div className="col-12">
              <label className="form-label">Base price</label>
              <input className="form-control form-control-sm" value={base} disabled={!canWrite} onChange={(e) => setBase(e.target.value)} />
            </div>
            <div className="col-12">
              <label className="form-label">Markup %</label>
              <input className="form-control form-control-sm" value={markup} disabled={!canWrite} onChange={(e) => setMarkup(e.target.value)} />
            </div>
            <div className="col-6">
              <label className="form-label">Min / floor</label>
              <input className="form-control form-control-sm" value={min} disabled={!canWrite} onChange={(e) => setMin(e.target.value)} />
            </div>
            <div className="col-6">
              <label className="form-label">Max price</label>
              <input className="form-control form-control-sm" value={max} disabled={!canWrite} onChange={(e) => setMax(e.target.value)} />
            </div>
            <div className="col-12">
              <label className="form-label">MRP (regulatory cap)</label>
              <input className="form-control form-control-sm" value={mrp} disabled={!canWrite} onChange={(e) => setMrp(e.target.value)} />
            </div>
          </div>

          {err && <div className="alert alert-danger small py-2 mt-2 mb-0">{err}</div>}

          <div className="d-flex gap-2 mt-4">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
              Close
            </button>
            <button type="button" className="btn btn-primary btn-sm" disabled={!canWrite || saving} onClick={() => void save()}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
      <div className="offcanvas-backdrop fade show" onClick={onClose} aria-hidden="true" />
    </>
  );
}
