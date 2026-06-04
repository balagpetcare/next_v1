"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet, ownerPatch, ownerPost } from "@/app/owner/_lib/ownerApi";
import { OWNER_PRICING_NAV } from "@/src/lib/ownerPricingNav";
import { buildEnterpriseRulesListQuery, type ListRulesResponse } from "../_lib/enterpriseRulesApi";
import { overlapWarningsForRow } from "../_lib/enterpriseRuleValidation";
import { DEFAULT_TOOLBAR_FILTERS, type EnterpriseRuleRow, type ToolbarFilters } from "../_lib/enterpriseRulesTypes";
import { useEnterpriseRulesOrgResources } from "../_hooks/useEnterpriseRulesOrgResources";
import { EnterpriseRuleGrid } from "./EnterpriseRuleGrid";
import { EnterpriseRuleSimulationPanel } from "./EnterpriseRuleSimulationPanel";
import { EnterpriseRuleToolbar } from "./EnterpriseRuleToolbar";

type VariantHit = { id: number; sku: string; title: string; product?: { name?: string } };

export function EnterpriseRulesWorkspace() {
  const { orgId, permSet, sessionLoaded, error, setError, branches, policy, tiers } = useEnterpriseRulesOrgResources();
  const filtersRef = useRef<ToolbarFilters>({ ...DEFAULT_TOOLBAR_FILTERS });
  const [filtersUi, setFiltersUi] = useState<ToolbarFilters>({ ...DEFAULT_TOOLBAR_FILTERS });
  const [queryVersion, setQueryVersion] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [rows, setRows] = useState<EnterpriseRuleRow[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);

  const [simVariant, setSimVariant] = useState("");
  const [simBranch, setSimBranch] = useState("");
  const [simTier, setSimTier] = useState("");
  const [simMemberPct, setSimMemberPct] = useState("");
  const [simQuery, setSimQuery] = useState("");
  const [simHits, setSimHits] = useState<VariantHit[]>([]);
  const [simSearchLoading, setSimSearchLoading] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [simOut, setSimOut] = useState<unknown>(null);
  const simTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canManage = useMemo(() => permSet.has("pricing.retail.rule.manage") || permSet.has("global.admin"), [permSet]);
  const canList = useMemo(
    () =>
      permSet.has("org.read") ||
      permSet.has("pricing.audit.view") ||
      permSet.has("pricing.retail.rule.manage") ||
      permSet.has("pricing.central.read") ||
      permSet.has("global.admin"),
    [permSet]
  );
  const canSimulate = useMemo(
    () =>
      permSet.has("org.read") ||
      permSet.has("pricing.central.read") ||
      permSet.has("pricing.central.write") ||
      permSet.has("pricing.audit.view") ||
      permSet.has("pricing.retail.rule.manage") ||
      permSet.has("global.admin"),
    [permSet]
  );

  const updateFilters = useCallback((p: Partial<ToolbarFilters>) => {
    setFiltersUi((f) => {
      const n = { ...f, ...p };
      filtersRef.current = n;
      return n;
    });
  }, []);

  const applyFilters = useCallback(() => {
    setPage(1);
    setQueryVersion((v) => v + 1);
  }, []);

  const load = useCallback(async () => {
    if (!sessionLoaded || !orgId || !canList) return;
    setError(null);
    setListLoading(true);
    try {
      const qs = buildEnterpriseRulesListQuery(orgId, page, limit, filtersRef.current);
      const res = await ownerGet<ListRulesResponse>(`/api/v1/pricing/enterprise-discount/rules?${qs}`);
      const data = (res as ListRulesResponse)?.data ?? [];
      const pagination = (res as ListRulesResponse)?.pagination;
      setRows(Array.isArray(data) ? data : []);
      setTotal(pagination?.total ?? data.length);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load rules");
    } finally {
      setListLoading(false);
    }
  }, [sessionLoaded, orgId, page, limit, queryVersion, canList, setError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!orgId || !canSimulate) {
      setSimHits([]);
      return;
    }
    const q = simQuery.trim();
    if (q.length < 2) {
      setSimHits([]);
      return;
    }
    if (simTimer.current) clearTimeout(simTimer.current);
    simTimer.current = setTimeout(async () => {
      setSimSearchLoading(true);
      try {
        const res = await ownerGet<{ data?: VariantHit[] }>(
          `/api/v1/inventory/variants/search?orgId=${orgId}&q=${encodeURIComponent(q)}&limit=12`
        );
        setSimHits(Array.isArray((res as { data?: VariantHit[] })?.data) ? (res as { data?: VariantHit[] }).data! : []);
      } catch {
        setSimHits([]);
      } finally {
        setSimSearchLoading(false);
      }
    }, 320);
    return () => {
      if (simTimer.current) clearTimeout(simTimer.current);
    };
  }, [simQuery, orgId, canSimulate]);

  const overlapById = useMemo(() => {
    const m: Record<number, string[]> = {};
    for (const r of rows) {
      m[r.id] = overlapWarningsForRow(r, rows);
    }
    return m;
  }, [rows]);

  const displayRows = useMemo(() => {
    if (!filtersUi.warningsOnly) return rows;
    return rows.filter((r) => (overlapById[r.id] ?? []).length > 0);
  }, [rows, filtersUi.warningsOnly, overlapById]);

  async function patchRuleStatus(r: EnterpriseRuleRow, status: string) {
    if (!orgId || !canManage) return;
    const verb = status === "ARCHIVED" ? "Archive" : status === "PAUSED" ? "Pause" : "Update";
    if (status === "ARCHIVED" && !window.confirm(`${verb} this rule? Archived rules no longer participate in resolution.`)) return;
    setError(null);
    try {
      await ownerPatch(`/api/v1/pricing/enterprise-discount/rules/${r.id}`, { orgId, status });
      setQueryVersion((v) => v + 1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function runSim() {
    if (!orgId || !canSimulate) return;
    const vid = parseInt(String(simVariant), 10);
    const bid = parseInt(String(simBranch), 10);
    if (!Number.isFinite(vid) || !Number.isFinite(bid)) {
      setError("Simulation needs a numeric variant and branch.");
      return;
    }
    setSimLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        orgId,
        branchId: bid,
        variantId: vid,
      };
      if (simTier) {
        const t = parseInt(simTier, 10);
        if (Number.isFinite(t)) body.membershipTierId = t;
      } else if (simMemberPct.trim()) {
        const p = parseFloat(simMemberPct);
        if (Number.isFinite(p)) body.membershipTierDiscountPercent = p;
      }
      const res = await ownerPost<{ data?: unknown }>("/api/v1/pricing/simulate", body);
      setSimOut((res as { data?: unknown })?.data ?? res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Simulation failed");
    } finally {
      setSimLoading(false);
    }
  }

  function focusSimFromRow(r: EnterpriseRuleRow) {
    if (r.targetKind === "VARIANT" && r.targetId != null) {
      setSimVariant(String(r.targetId));
      setSimQuery(`Variant #${r.targetId}`);
    } else {
      setError("Simulator needs a variant context. Switch target to a variant or search a SKU below.");
    }
    document.getElementById("enterprise-rule-sim")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!sessionLoaded) {
    return (
      <div className="dashboard-main-body">
        <PageHeader
          title="Enterprise discount rules"
          subtitle="Loading workspace…"
          breadcrumbs={[
            { label: "Owner", href: "/owner/dashboard" },
            { label: "Inventory", href: "/owner/inventory" },
            { label: "Enterprise rules", href: OWNER_PRICING_NAV.discountRules },
          ]}
        />
        <p className="text-muted small">Preparing organization context and permissions…</p>
      </div>
    );
  }

  if (!canList) {
    return (
      <div className="dashboard-main-body">
        <PageHeader
          title="Enterprise discount rules"
          subtitle="You do not have permission to view organization discount rules."
          breadcrumbs={[
            { label: "Owner", href: "/owner/dashboard" },
            { label: "Inventory", href: "/owner/inventory" },
            { label: "Enterprise rules", href: OWNER_PRICING_NAV.discountRules },
          ]}
        />
        <div className="alert alert-warning">Required: organization read, pricing audit view, pricing central read, or retail rule manage.</div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Enterprise discount rules"
        subtitle="Define catalog list-price automation before POS discount validation. Works with Price Master, governance, campaigns, and membership layers. These rules never overwrite canonical MRP in Price Master — they only change resolved list price at runtime."
        breadcrumbs={[
          { label: "Owner", href: "/owner/dashboard" },
          { label: "Inventory", href: "/owner/inventory" },
          { label: "Enterprise rules", href: OWNER_PRICING_NAV.discountRules },
        ]}
      />

      <div className="d-flex flex-wrap gap-2 mb-3 small">
        <Link className="btn btn-sm btn-outline-secondary" href={OWNER_PRICING_NAV.governance}>
          Pricing governance
        </Link>
        <Link className="btn btn-sm btn-outline-secondary" href={OWNER_PRICING_NAV.priceMaster}>
          Price master
        </Link>
        <Link className="btn btn-sm btn-outline-secondary" href="/owner/inventory/pricing-campaigns">
          Campaigns
        </Link>
        <Link className="btn btn-sm btn-outline-secondary" href="/owner/inventory/membership-pricing">
          Membership pricing
        </Link>
      </div>

      {!canManage && canList && (
        <div className="alert alert-info py-2 small mb-3">
          Read-only: you can review rules and run simulations, but creating or changing rules requires <code>pricing.retail.rule.manage</code>.
        </div>
      )}

      {error && (
        <div className="alert alert-danger py-2 mb-3" role="alert">
          {error}
        </div>
      )}

      {orgId && (
        <>
          <EnterpriseRuleToolbar
            filters={filtersUi}
            onChange={updateFilters}
            onApply={applyFilters}
            onClear={() => {
              filtersRef.current = { ...DEFAULT_TOOLBAR_FILTERS };
              setFiltersUi({ ...DEFAULT_TOOLBAR_FILTERS });
              setPage(1);
              setQueryVersion((v) => v + 1);
            }}
            onRefresh={() => setQueryVersion((v) => v + 1)}
            loading={listLoading}
            canManage={canManage}
            createHref={OWNER_PRICING_NAV.discountRulesNew}
          />

          <div id="enterprise-rule-sim">
            <EnterpriseRuleSimulationPanel
              orgId={orgId}
              branches={branches}
              tiers={tiers}
              variantId={simVariant}
              branchId={simBranch}
              membershipTierId={simTier}
              memberPct={simMemberPct}
              variantQuery={simQuery}
              variantHits={simHits}
              variantSearchLoading={simSearchLoading}
              onVariantQuery={setSimQuery}
              onPickVariant={(id) => setSimVariant(String(id))}
              onBranchChange={setSimBranch}
              onTierChange={setSimTier}
              onMemberPct={setSimMemberPct}
              onRun={runSim}
              loading={simLoading}
              result={simOut}
              disabled={!canSimulate}
            />
          </div>

          {filtersUi.warningsOnly && (
            <p className="small text-muted mb-2">Overlap hints are computed among rules on the current page only.</p>
          )}

          <EnterpriseRuleGrid
            rows={displayRows}
            page={page}
            limit={limit}
            total={filtersUi.warningsOnly ? displayRows.length : total}
            loading={listLoading}
            overlapById={overlapById}
            canManage={canManage}
            onPageChange={setPage}
            getViewHref={(r) => OWNER_PRICING_NAV.discountRuleDetail(r.id)}
            getEditHref={(r) => OWNER_PRICING_NAV.discountRuleEdit(r.id)}
            getDuplicateHref={(r) => OWNER_PRICING_NAV.discountRulesNewDuplicateFrom(r.id)}
            onPreviewRow={focusSimFromRow}
            onStatusPatch={patchRuleStatus}
            hidePagination={filtersUi.warningsOnly}
          />

          {displayRows.length === 0 && !listLoading && (
            <div className="text-center mt-3">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary me-2"
                onClick={() => {
                  filtersRef.current = { ...DEFAULT_TOOLBAR_FILTERS };
                  setFiltersUi({ ...DEFAULT_TOOLBAR_FILTERS });
                  setPage(1);
                  setQueryVersion((v) => v + 1);
                }}
              >
                Clear filters
              </button>
              {canManage && (
                <Link className="btn btn-sm btn-primary" href={OWNER_PRICING_NAV.discountRulesNew}>
                  Create rule
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
