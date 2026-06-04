"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ownerGet, ownerPost } from "@/app/owner/_lib/ownerApi";
import { OWNER_PRICING_NAV } from "@/src/lib/ownerPricingNav";
import { validateCentralBand, hasBlockingErrors, costWarnings } from "../_lib/centralPricingValidation";
import type { BranchOption, CostSignal, OrgMetaResponse, OrgPricingRow } from "../_lib/priceMasterTypes";
import { PriceMasterCatalogSection } from "./PriceMasterCatalogSection";
import { PriceMasterCsvModal } from "./PriceMasterCsvModal";
import { PriceMasterDetailDrawer } from "./PriceMasterDetailDrawer";
import { PriceMasterSimulationPanel } from "./PriceMasterSimulationPanel";
import { PriceMasterToolbar, type ToolbarFilters } from "./PriceMasterToolbar";

function pickOrgId(me: unknown): number | null {
  const m = me as Record<string, unknown>;
  const orgs = (m.organizations ?? (m.data as Record<string, unknown>)?.organizations) as { id?: number }[] | undefined;
  const id = orgs?.[0]?.id;
  return id != null && Number.isFinite(Number(id)) ? Number(id) : null;
}

function permissionSetFromAuthMe(authMe: unknown): Set<string> {
  const a = authMe as Record<string, unknown> | null | undefined;
  const raw = a?.permissions;
  return new Set(Array.isArray(raw) ? raw.map((p) => String(p)) : []);
}

function normalizeBranches(payload: unknown): BranchOption[] {
  const p = payload as Record<string, unknown>;
  const raw = (p?.data ?? p) as unknown;
  const arr = Array.isArray(raw) ? raw : [];
  return arr
    .map((b) => {
      const o = b as { id?: number; name?: string };
      return o.id != null ? { id: Number(o.id), name: String(o.name ?? `Branch ${o.id}`) } : null;
    })
    .filter(Boolean) as BranchOption[];
}

export function PriceMasterWorkspace() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [permSet, setPermSet] = useState<Set<string>>(() => new Set());
  const [meta, setMeta] = useState<OrgMetaResponse | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [filters, setFilters] = useState<ToolbarFilters>({
    q: "",
    categoryId: "",
    unpricedOnly: false,
    sortBy: "updatedAt",
    sortOrder: "desc",
    clientFlags: "all",
  });
  const filtersRef = useRef(filters);
  const patchFilters = useCallback((p: Partial<ToolbarFilters>) => {
    setFilters((f) => {
      const n = { ...f, ...p };
      filtersRef.current = n;
      return n;
    });
  }, []);
  const [queryVersion, setQueryVersion] = useState(0);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<OrgPricingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [detailRow, setDetailRow] = useState<OrgPricingRow | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [costByVariant, setCostByVariant] = useState<Record<number, CostSignal | undefined>>({});
  const [simVariant, setSimVariant] = useState("");
  const [simBranch, setSimBranch] = useState("");
  const [simTier, setSimTier] = useState("");
  const [simLot, setSimLot] = useState("");
  const [simDiscounted, setSimDiscounted] = useState("");
  const [simLoading, setSimLoading] = useState(false);
  const [simOut, setSimOut] = useState<unknown>(null);
  const [bulkPct, setBulkPct] = useState("");

  const limit = 25;

  const canRead = useMemo(
    () =>
      permSet.has("org.read") ||
      permSet.has("product.read") ||
      permSet.has("pricing.central.read") ||
      permSet.has("global.admin"),
    [permSet]
  );
  const canWrite = useMemo(
    () => permSet.has("pricing.central.write") || permSet.has("global.admin") || permSet.has("country.admin"),
    [permSet]
  );
  const canBulkImport = useMemo(
    () => permSet.has("pricing.bulk.import") || permSet.has("pricing.central.write") || permSet.has("global.admin"),
    [permSet]
  );

  const load = useCallback(async () => {
    if (!orgId) return;
    const f = filtersRef.current;
    setError(null);
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        orgId: String(orgId),
        page: String(page),
        limit: String(limit),
        sortBy: f.sortBy,
        sortOrder: f.sortOrder,
      });
      if (f.q.trim()) qs.set("q", f.q.trim());
      if (f.categoryId) qs.set("categoryId", f.categoryId);
      if (f.unpricedOnly) qs.set("unpriced", "1");
      const res = await ownerGet<{ data?: OrgPricingRow[]; pagination?: { total?: number } }>(`/api/v1/pricing/org?${qs}`);
      const data = (res as { data?: OrgPricingRow[] })?.data ?? [];
      const pagination = (res as { pagination?: { total?: number } })?.pagination;
      setRows(Array.isArray(data) ? data : []);
      setTotal(pagination?.total ?? data.length);
      setSelectedIds(new Set());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [orgId, page, limit, queryVersion]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [me, authMe] = await Promise.all([
          ownerGet<unknown>("/api/v1/owner/me"),
          ownerGet<Record<string, unknown>>("/api/v1/auth/me"),
        ]);
        if (cancelled) return;
        setPermSet(permissionSetFromAuthMe(authMe));
        let oid = pickOrgId(me);
        if (oid == null) {
          const orgs = await ownerGet<{ data?: { id: number }[] }>("/api/v1/owner/organizations");
          const list = (orgs as { data?: unknown[] })?.data ?? orgs;
          const first = Array.isArray(list) ? (list[0] as { id?: number })?.id : null;
          oid = first != null ? Number(first) : null;
        }
        setOrgId(oid);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load organization");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      setLoadingMeta(true);
      try {
        const m = await ownerGet<{ data?: OrgMetaResponse }>(`/api/v1/pricing/org/meta?orgId=${orgId}`);
        if (!cancelled) setMeta((m as { data?: OrgMetaResponse })?.data ?? null);
        const br = await ownerGet<unknown>(`/api/v1/owner/organizations/${orgId}/branches`);
        if (!cancelled) setBranches(normalizeBranches(br));
      } catch {
        if (!cancelled) {
          setMeta(null);
          setBranches([]);
        }
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const costFetchKey = useMemo(() => {
    if (!orgId || !rows.length) return "";
    return `${orgId}:${rows
      .slice(0, 24)
      .map((r) => r.variantId)
      .join(",")}`;
  }, [orgId, rows]);

  useEffect(() => {
    if (!costFetchKey) return;
    let cancelled = false;
    (async () => {
      const slice = rows.slice(0, 24);
      const next: Record<number, CostSignal | undefined> = {};
      await Promise.all(
        slice.map(async (r) => {
          try {
            const res = await ownerGet<{ data?: CostSignal }>(`/api/v1/pricing/cost-signal?orgId=${orgId}&variantId=${r.variantId}`);
            if (!cancelled) next[r.variantId] = (res as { data?: CostSignal })?.data ?? undefined;
          } catch {
            if (!cancelled) next[r.variantId] = undefined;
          }
        })
      );
      if (!cancelled) setCostByVariant((prev) => ({ ...prev, ...next }));
    })();
    return () => {
      cancelled = true;
    };
  }, [costFetchKey, orgId, rows]);

  const filteredRows = useMemo(() => {
    let out = rows;
    if (filters.clientFlags === "issues") {
      out = out.filter((r) => {
        const base = r.basePrice != null ? Number(r.basePrice) : null;
        const band = validateCentralBand({
          basePrice: base,
          markupPercent: r.markupPercent != null ? Number(r.markupPercent) : null,
          minPrice: r.minPrice != null ? Number(r.minPrice) : null,
          maxPrice: r.maxPrice != null ? Number(r.maxPrice) : null,
          mrp: r.mrp != null ? Number(r.mrp) : null,
        });
        const ref = costByVariant[r.variantId]?.latestUnitCost ?? null;
        const cw = costWarnings(base, ref);
        return base == null || hasBlockingErrors(band) || cw.some((c: { level: string }) => c.level === "error" || c.level === "warn");
      });
    } else if (filters.clientFlags === "recent") {
      out = out.filter((r) => {
        if (!r.updatedAt) return false;
        return Date.now() - new Date(r.updatedAt).getTime() < 7 * 86400000;
      });
    }
    return out;
  }, [rows, filters.clientFlags, costByVariant]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  async function saveRow(r: OrgPricingRow, draft: Record<string, string>) {
    if (!orgId || !canWrite) return;
    setSavingId(r.id);
    setError(null);
    try {
      await ownerPost("/api/v1/pricing/org", {
        orgId,
        variantId: r.variantId,
        basePrice: draft.base === "" ? null : parseFloat(draft.base),
        markupPercent: draft.markup === "" ? null : parseFloat(draft.markup),
        minPrice: draft.min === "" ? null : parseFloat(draft.min),
        maxPrice: draft.max === "" ? null : parseFloat(draft.max),
        mrp: draft.mrp === "" ? null : parseFloat(draft.mrp),
      });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingId(null);
    }
  }

  async function runSimulate() {
    if (!orgId || !simVariant || !simBranch) return;
    setSimLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        orgId,
        branchId: parseInt(simBranch, 10),
        variantId: parseInt(simVariant, 10),
      };
      if (simTier.trim()) body.membershipTierId = parseInt(simTier, 10);
      if (simLot.trim()) {
        const lid = parseInt(simLot.trim(), 10);
        if (Number.isFinite(lid)) body.lotId = lid;
      }
      if (simDiscounted.trim()) {
        const du = parseFloat(simDiscounted.trim());
        if (Number.isFinite(du)) body.discountedUnitPrice = du;
      }
      const res = await ownerPost<{ data?: unknown }>("/api/v1/pricing/simulate", body);
      setSimOut((res as { data?: unknown })?.data ?? res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Simulation failed");
    } finally {
      setSimLoading(false);
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function selectAllPage(checked: boolean) {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(filteredRows.map((r) => r.id)));
  }

  async function bulkAdjustBasePct() {
    if (!orgId || !canWrite) return;
    const pct = parseFloat(bulkPct);
    if (!Number.isFinite(pct)) {
      setError("Enter a valid percentage for bulk adjustment.");
      return;
    }
    const targets = filteredRows.filter((r) => selectedIds.has(r.id));
    if (!targets.length) {
      setError("Select at least one row.");
      return;
    }
    const rowsPayload = targets
      .map((r) => {
        const b = r.basePrice != null ? Number(r.basePrice) : NaN;
        if (!Number.isFinite(b)) return null;
        const nb = Math.round(b * (1 + pct / 100) * 100) / 100;
        return {
          variantId: r.variantId,
          basePrice: nb,
          markupPercent: r.markupPercent != null ? Number(r.markupPercent) : null,
          minPrice: r.minPrice != null ? Number(r.minPrice) : null,
          maxPrice: r.maxPrice != null ? Number(r.maxPrice) : null,
          mrp: r.mrp != null ? Number(r.mrp) : null,
        };
      })
      .filter(Boolean) as Array<{
      variantId: number;
      basePrice: number;
      markupPercent: number | null;
      minPrice: number | null;
      maxPrice: number | null;
      mrp: number | null;
    }>;
    if (!rowsPayload.length) {
      setError("Selected rows need a numeric base price to apply a percentage change.");
      return;
    }
    for (const row of rowsPayload) {
      const issues = validateCentralBand(row);
      if (hasBlockingErrors(issues)) {
        setError(`Bulk blocked: variant ${row.variantId} would violate pricing band after adjustment.`);
        return;
      }
    }
    setSavingId(-1);
    setError(null);
    try {
      await ownerPost("/api/v1/pricing/org/bulk", { orgId, rows: rowsPayload });
      setBulkPct("");
      setSelectedIds(new Set());
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bulk update failed");
    } finally {
      setSavingId(null);
    }
  }

  function exportFilteredCsv() {
    const header = ["variantId", "sku", "title", "basePrice", "markupPercent", "minPrice", "maxPrice", "mrp", "updatedAt"].join(",");
    const lines = filteredRows.map((r) =>
      [
        r.variantId,
        JSON.stringify(r.variant?.sku ?? ""),
        JSON.stringify(r.variant?.title ?? ""),
        r.basePrice ?? "",
        r.markupPercent ?? "",
        r.minPrice ?? "",
        r.maxPrice ?? "",
        r.mrp ?? "",
        r.updatedAt ?? "",
      ].join(",")
    );
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `price-master-export-org-${orgId}-page${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
        <Link className="btn btn-sm btn-outline-secondary" href={OWNER_PRICING_NAV.governance}>
          Pricing governance
        </Link>
        <Link className="btn btn-sm btn-outline-secondary" href={OWNER_PRICING_NAV.discountRules}>
          Discount rules
        </Link>
        <Link className="btn btn-sm btn-outline-secondary" href={OWNER_PRICING_NAV.membership}>
          Membership pricing
        </Link>
        <Link className="btn btn-sm btn-outline-secondary" href={OWNER_PRICING_NAV.campaigns}>
          Campaigns
        </Link>
        <Link className="btn btn-sm btn-outline-secondary" href={OWNER_PRICING_NAV.analytics}>
          Pricing analytics
        </Link>
      </div>

      {!canRead && orgId != null && (
        <div className="alert alert-warning radius-12 py-2" role="status">
          You do not have permission to read org catalog pricing. Required: organization or catalog read, or{" "}
          <code>pricing.central.read</code>.
        </div>
      )}

      {canWrite === false && canRead && (
        <div className="alert alert-secondary radius-12 py-2" role="status">
          View-only: <code>pricing.central.write</code> is required to edit, save, bulk adjust, or import catalog prices. Pricing
          governance and branch rules still apply at checkout.
        </div>
      )}

      {error && (
        <div className="alert alert-danger radius-12 py-2" role="alert">
          {error}
        </div>
      )}

      {orgId != null && canRead && (
        <>
          <div className="card radius-12 mb-3">
            <div className="card-body py-3">
              <div className="row g-2 align-items-center">
                <div className="col-lg-8">
                  <h5 className="mb-1">Central catalog pricing</h5>
                  <p className="small text-muted mb-0">
                    Manage list prices, floors, ceilings, and MRP for your organization catalog. Values here feed branch overrides
                    (when enforced), campaigns, membership tiers, and POS governance.
                  </p>
                </div>
                <div className="col-lg-4 text-lg-end">
                  <button type="button" className="btn btn-outline-primary btn-sm me-2" disabled={!canBulkImport} onClick={() => setCsvOpen(true)}>
                    Import CSV
                  </button>
                  <button type="button" className="btn btn-outline-secondary btn-sm" disabled={!filteredRows.length} onClick={exportFilteredCsv}>
                    Export view
                  </button>
                </div>
              </div>
            </div>
          </div>

          <PriceMasterToolbar
            filters={filters}
            onChange={patchFilters}
            onSearch={() => {
              setPage(1);
              setQueryVersion((v) => v + 1);
            }}
            meta={meta}
            loadingMeta={loadingMeta}
            disabled={loading}
          />

          <PriceMasterSimulationPanel
            orgId={orgId}
            branches={branches}
            variantId={simVariant}
            branchId={simBranch}
            membershipTierId={simTier}
            lotId={simLot}
            discountedUnitPrice={simDiscounted}
            onVariantChange={setSimVariant}
            onBranchChange={setSimBranch}
            onTierChange={setSimTier}
            onLotChange={setSimLot}
            onDiscountedChange={setSimDiscounted}
            onRun={() => void runSimulate()}
            loading={simLoading}
            result={simOut}
            disabled={!canRead}
          />

          {canWrite && (
            <div className="card radius-12 mb-3">
              <div className="card-body py-3 d-flex flex-wrap align-items-end gap-2">
                <div>
                  <label className="form-label small text-muted mb-1">Bulk adjust base price</label>
                  <div className="input-group input-group-sm" style={{ minWidth: 220 }}>
                    <input
                      className="form-control"
                      placeholder="% change"
                      value={bulkPct}
                      onChange={(e) => setBulkPct(e.target.value)}
                    />
                    <span className="input-group-text">%</span>
                  </div>
                  <div className="small text-muted mt-1">Applies to selected rows with a numeric base price.</div>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  disabled={savingId != null || !selectedIds.size}
                  onClick={() => void bulkAdjustBasePct()}
                >
                  Apply to selection
                </button>
                <span className="small text-muted ms-auto">{selectedIds.size} selected</span>
              </div>
            </div>
          )}

          <PriceMasterCatalogSection
            rows={filteredRows}
            page={page}
            limit={limit}
            total={total}
            totalPages={totalPages}
            loading={loading}
            canWrite={canWrite}
            selectedIds={selectedIds}
            onToggle={toggleSelect}
            onSelectAllPage={selectAllPage}
            onPage={(p) => setPage(p)}
            onSaveRow={saveRow}
            onOpenDetail={setDetailRow}
            savingId={savingId}
            costByVariant={costByVariant}
          />
        </>
      )}

      {orgId == null && !error && <p className="text-muted small">Loading organization…</p>}

      <PriceMasterDetailDrawer
        row={detailRow}
        orgId={orgId}
        branches={branches}
        canWrite={canWrite}
        onClose={() => setDetailRow(null)}
        onSaved={() => void load()}
        ownerGet={ownerGet}
        ownerPost={ownerPost}
      />

      <PriceMasterCsvModal
        show={csvOpen}
        onClose={() => setCsvOpen(false)}
        orgId={orgId}
        canImport={canBulkImport}
        onCommitted={() => void load()}
        ownerPost={ownerPost}
      />
    </>
  );
}
