"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet, ownerPatch, ownerPost } from "@/app/owner/_lib/ownerApi";
import { OWNER_PRICING_NAV } from "@/src/lib/ownerPricingNav";
import type { BranchOption } from "../../price-master/_lib/priceMasterTypes";
import {
  DEFAULT_TIER_FILTERS,
  emptyTierForm,
  tierToForm,
  type DiscountCardOption,
  type GovernanceLite,
  type MembershipTierRow,
  type OrgMetaLite,
  type SortDir,
  type SortKey,
  type TierFormState,
  type TierToolbarFilters,
  type VariantHit,
} from "../_lib/membershipTierTypes";
import { governanceHintsForTier, hasBlockingErrors, validateTierForm } from "../_lib/membershipTierValidation";
import { MembershipSimulationPanel } from "./MembershipSimulationPanel";
import { MembershipTierDrawer } from "./MembershipTierDrawer";
import { MembershipTierGrid } from "./MembershipTierGrid";
import { MembershipTierToolbar } from "./MembershipTierToolbar";

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

function numFromUnknown(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

function parseTierUpsertBody(orgId: number, form: TierFormState): Record<string, unknown> {
  const discountPercent = parseFloat(form.discountPercent);
  const maxDiscountPerItem = form.maxDiscountPerItem.trim() ? parseFloat(form.maxDiscountPerItem) : null;
  const maxDiscountPerInvoice = form.maxDiscountPerInvoice.trim() ? parseFloat(form.maxDiscountPerInvoice) : null;
  const body: Record<string, unknown> = {
    orgId,
    name: form.name.trim(),
    discountPercent,
    maxDiscountPerItem: maxDiscountPerItem != null && Number.isFinite(maxDiscountPerItem) ? maxDiscountPerItem : null,
    maxDiscountPerInvoice: maxDiscountPerInvoice != null && Number.isFinite(maxDiscountPerInvoice) ? maxDiscountPerInvoice : null,
    stackWithPromo: !!form.stackWithPromo,
    stackWithBrandDiscount: !!form.stackWithBrandDiscount,
    status: form.status.toUpperCase(),
  };
  if (form.id != null) body.id = form.id;
  return body;
}

function filterRows(rows: MembershipTierRow[], f: TierToolbarFilters): MembershipTierRow[] {
  return rows.filter((t) => {
    if (f.status && String(t.status).toUpperCase() !== f.status.toUpperCase()) return false;
    if (f.scopedOnly && !(t.branchScopes && t.branchScopes.length > 0)) return false;
    if (f.exclusionsOnly && !(t.exclusions && t.exclusions.length > 0)) return false;
    const q = f.q.trim().toLowerCase();
    if (q && !String(t.name).toLowerCase().includes(q)) return false;
    return true;
  });
}

function sortRows(rows: MembershipTierRow[], sortKey: SortKey, sortDir: SortDir): MembershipTierRow[] {
  const m = sortDir === "asc" ? 1 : -1;
  const arr = [...rows];
  arr.sort((a, b) => {
    if (sortKey === "name") return String(a.name).localeCompare(String(b.name)) * m;
    if (sortKey === "discount") return (numFromUnknown(a.discountPercent) - numFromUnknown(b.discountPercent)) * m;
    if (sortKey === "status") return String(a.status).localeCompare(String(b.status)) * m;
    if (sortKey === "updated") {
      const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return (ta - tb) * m;
    }
    return 0;
  });
  return arr;
}

export function MembershipPricingWorkspace() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [permSet, setPermSet] = useState<Set<string>>(() => new Set());
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [tiers, setTiers] = useState<MembershipTierRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [meta, setMeta] = useState<OrgMetaLite>({ categories: [], brands: [] });
  const [discountCards, setDiscountCards] = useState<DiscountCardOption[]>([]);
  const [policy, setPolicy] = useState<GovernanceLite | null>(null);

  const [filtersUi, setFiltersUi] = useState<TierToolbarFilters>({ ...DEFAULT_TIER_FILTERS });
  const [queryVersion, setQueryVersion] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit" | "view">("create");
  const [form, setForm] = useState<TierFormState>(() => emptyTierForm());
  const [linkedCardsSnapshot, setLinkedCardsSnapshot] = useState<{ id: number; cardNumber: string; status: string }[]>([]);
  const [saving, setSaving] = useState(false);

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

  const canManage = useMemo(() => permSet.has("pricing.membership.manage") || permSet.has("global.admin"), [permSet]);
  const canList = useMemo(
    () => permSet.has("org.read") || permSet.has("pricing.membership.manage") || permSet.has("global.admin"),
    [permSet]
  );
  const canSimulate = useMemo(
    () =>
      permSet.has("org.read") ||
      permSet.has("pricing.central.read") ||
      permSet.has("pricing.central.write") ||
      permSet.has("pricing.audit.view") ||
      permSet.has("pricing.retail.rule.manage") ||
      permSet.has("pricing.membership.manage") ||
      permSet.has("global.admin"),
    [permSet]
  );

  const loadTiers = useCallback(async () => {
    if (!orgId || !canList) return;
    setListLoading(true);
    setError(null);
    try {
      const res = await ownerGet<{ data?: MembershipTierRow[] }>(`/api/v1/pricing/membership/tiers?orgId=${orgId}`);
      const data = (res as { data?: MembershipTierRow[] })?.data;
      setTiers(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load tiers");
    } finally {
      setListLoading(false);
    }
  }, [orgId, canList]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [me, authMe] = await Promise.all([ownerGet<unknown>("/api/v1/owner/me"), ownerGet<Record<string, unknown>>("/api/v1/auth/me")]);
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
      } finally {
        if (!cancelled) setSessionLoaded(true);
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
      try {
        const [m, br, pol, cards] = await Promise.all([
          ownerGet<{ data?: { categories?: { id: number; name: string }[]; brands?: { id: number; name: string }[] } }>(
            `/api/v1/pricing/org/meta?orgId=${orgId}`
          ),
          ownerGet<unknown>(`/api/v1/owner/organizations/${orgId}/branches`),
          ownerGet<{ data?: GovernanceLite }>(`/api/v1/pricing/governance/policy?orgId=${orgId}`),
          ownerGet<{ data?: DiscountCardOption[] }>(`/api/v1/pricing/membership/cards?orgId=${orgId}`),
        ]);
        if (cancelled) return;
        const md = (m as { data?: OrgMetaLite })?.data;
        setMeta({ categories: md?.categories ?? [], brands: md?.brands ?? [] });
        setBranches(normalizeBranches(br));
        setPolicy((pol as { data?: GovernanceLite })?.data ?? null);
        const cd = (cards as { data?: DiscountCardOption[] })?.data;
        setDiscountCards(Array.isArray(cd) ? cd : []);
      } catch {
        if (!cancelled) {
          setMeta({ categories: [], brands: [] });
          setBranches([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  useEffect(() => {
    void loadTiers();
  }, [loadTiers, queryVersion]);

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

  const filteredSorted = useMemo(() => sortRows(filterRows(tiers, filtersUi), sortKey, sortDir), [tiers, filtersUi, sortKey, sortDir]);

  const totalFiltered = filteredSorted.length;
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSorted.slice(start, start + pageSize);
  }, [filteredSorted, page, pageSize]);

  useEffect(() => {
    const tp = Math.max(1, Math.ceil(totalFiltered / pageSize) || 1);
    setPage((p) => (p > tp ? tp : p));
  }, [totalFiltered, pageSize]);

  const validationIssues = useMemo(() => validateTierForm(form), [form]);
  const govHints = useMemo(() => governanceHintsForTier(form, policy), [form, policy]);
  const drawerReadOnly = drawerMode === "view" || !canManage;

  const updateFilters = useCallback((p: Partial<TierToolbarFilters>) => {
    setFiltersUi((f) => ({ ...f, ...p }));
    if (p.status !== undefined || p.scopedOnly !== undefined || p.exclusionsOnly !== undefined) setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersUi({ ...DEFAULT_TIER_FILTERS });
    setPage(1);
  }, []);

  const onSort = useCallback((k: SortKey) => {
    setSortKey((prev) => {
      if (prev === k) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return k;
    });
  }, []);

  function openCreate() {
    setDrawerMode("create");
    setForm(emptyTierForm());
    setLinkedCardsSnapshot([]);
    setDrawerOpen(true);
  }

  function openView(t: MembershipTierRow) {
    setDrawerMode("view");
    setForm(tierToForm(t));
    setLinkedCardsSnapshot(t.ownerDiscountCards ?? []);
    setDrawerOpen(true);
  }

  function openEdit(t: MembershipTierRow) {
    setDrawerMode("edit");
    setForm(tierToForm(t));
    setLinkedCardsSnapshot(t.ownerDiscountCards ?? []);
    setDrawerOpen(true);
  }

  async function onUnlinkCard(cardId: number) {
    if (!orgId || !canManage) return;
    if (!window.confirm("Unlink this discount card from its membership tier?")) return;
    setError(null);
    try {
      await ownerPatch(`/api/v1/pricing/membership/cards/${cardId}`, { orgId, membershipTierId: null });
      setLinkedCardsSnapshot((xs) => xs.filter((c) => c.id !== cardId));
      setQueryVersion((v) => v + 1);
      const cd = await ownerGet<{ data?: DiscountCardOption[] }>(`/api/v1/pricing/membership/cards?orgId=${orgId}`);
      setDiscountCards(Array.isArray((cd as { data?: DiscountCardOption[] })?.data) ? (cd as { data?: DiscountCardOption[] }).data! : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unlink failed");
    }
  }

  async function saveDrawer() {
    if (!orgId || !canManage) return;
    if (hasBlockingErrors(validationIssues)) return;
    setSaving(true);
    setError(null);
    try {
      const body = parseTierUpsertBody(orgId, form);
      const res = await ownerPost<{ data?: { id: number } }>("/api/v1/pricing/membership/tiers", body);
      const tierId = (res as { data?: { id: number } })?.data?.id ?? form.id;
      if (tierId == null) throw new Error("Save did not return tier id");

      await ownerPost("/api/v1/pricing/membership/tiers/exclusions", {
        orgId,
        tierId,
        exclusions: form.exclusions.map((e) => ({ excludeKind: e.excludeKind, excludeId: e.excludeId })),
      });
      const branchPayload = form.branchScopeAll ? [] : form.branchIds;
      await ownerPost("/api/v1/pricing/membership/tiers/branch-scopes", {
        orgId,
        tierId,
        branchIds: branchPayload,
      });

      const linkId = parseInt(String(form.linkCardId), 10);
      if (Number.isFinite(linkId)) {
        await ownerPatch(`/api/v1/pricing/membership/cards/${linkId}`, { orgId, membershipTierId: tierId });
      }

      setDrawerOpen(false);
      setQueryVersion((v) => v + 1);
      const cd = await ownerGet<{ data?: DiscountCardOption[] }>(`/api/v1/pricing/membership/cards?orgId=${orgId}`);
      setDiscountCards(Array.isArray((cd as { data?: DiscountCardOption[] })?.data) ? (cd as { data?: DiscountCardOption[] }).data! : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function duplicateTier(t: MembershipTierRow) {
    if (!orgId || !canManage) return;
    setError(null);
    try {
      const res = await ownerPost<{ data?: { id: number } }>("/api/v1/pricing/membership/tiers", {
        orgId,
        name: `${t.name} (copy)`,
        discountPercent: numFromUnknown(t.discountPercent),
        maxDiscountPerItem: t.maxDiscountPerItem != null ? numFromUnknown(t.maxDiscountPerItem) : null,
        maxDiscountPerInvoice: t.maxDiscountPerInvoice != null ? numFromUnknown(t.maxDiscountPerInvoice) : null,
        stackWithPromo: !!t.stackWithPromo,
        stackWithBrandDiscount: !!t.stackWithBrandDiscount,
        status: "DRAFT",
      });
      const newId = (res as { data?: { id: number } })?.data?.id;
      if (!newId) throw new Error("Duplicate failed");
      const ex = (t.exclusions ?? []).map((e) => ({ excludeKind: e.excludeKind, excludeId: e.excludeId }));
      await ownerPost("/api/v1/pricing/membership/tiers/exclusions", { orgId, tierId: newId, exclusions: ex });
      const bids = (t.branchScopes ?? []).map((s) => s.branchId);
      await ownerPost("/api/v1/pricing/membership/tiers/branch-scopes", { orgId, tierId: newId, branchIds: bids });
      setQueryVersion((v) => v + 1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Duplicate failed");
    }
  }

  async function setTierStatus(t: MembershipTierRow, status: string) {
    if (!orgId || !canManage) return;
    if (status === "ARCHIVED" && !window.confirm("Archive this tier? It will no longer apply to live resolution while archived.")) return;
    setError(null);
    try {
      await ownerPost("/api/v1/pricing/membership/tiers", {
        orgId,
        id: t.id,
        name: t.name,
        discountPercent: numFromUnknown(t.discountPercent),
        maxDiscountPerItem: t.maxDiscountPerItem != null ? numFromUnknown(t.maxDiscountPerItem) : null,
        maxDiscountPerInvoice: t.maxDiscountPerInvoice != null ? numFromUnknown(t.maxDiscountPerInvoice) : null,
        stackWithPromo: !!t.stackWithPromo,
        stackWithBrandDiscount: !!t.stackWithBrandDiscount,
        status,
      });
      setQueryVersion((v) => v + 1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Status update failed");
    }
  }

  function focusPreview(t: MembershipTierRow) {
    setSimTier(String(t.id));
    document.getElementById("membership-pricing-sim")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function runSim() {
    if (!orgId || !canSimulate) return;
    const vid = parseInt(String(simVariant), 10);
    const bid = parseInt(String(simBranch), 10);
    if (!Number.isFinite(vid) || !Number.isFinite(bid)) {
      setError("Preview needs a variant and branch selected.");
      return;
    }
    setSimLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { orgId, branchId: bid, variantId: vid };
      if (simTier) {
        const tid = parseInt(simTier, 10);
        if (Number.isFinite(tid)) body.membershipTierId = tid;
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

  if (!sessionLoaded) {
    return (
      <div className="dashboard-main-body">
        <PageHeader
          title="Membership tier benefits"
          subtitle="Loading workspace…"
          breadcrumbs={[
            { label: "Owner", href: "/owner/dashboard" },
            { label: "Inventory", href: "/owner/inventory" },
            { label: "Membership", href: OWNER_PRICING_NAV.membership },
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
          title="Membership tier benefits"
          subtitle="You do not have permission to view membership pricing for this organization."
          breadcrumbs={[
            { label: "Owner", href: "/owner/dashboard" },
            { label: "Inventory", href: "/owner/inventory" },
            { label: "Membership", href: OWNER_PRICING_NAV.membership },
          ]}
        />
        <div className="alert alert-warning">Required: organization read or membership pricing manage.</div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Membership tier benefits"
        subtitle="Configure catalog list-price membership layers: percentage benefits, per-unit caps, branch scope, exclusions, and discount card linkage. Aligns with Price Master, enterprise discount rules, campaigns, governance, and POS resolution."
        breadcrumbs={[
          { label: "Owner", href: "/owner/dashboard" },
          { label: "Inventory", href: "/owner/inventory" },
          { label: "Membership", href: OWNER_PRICING_NAV.membership },
        ]}
      />

      <div className="d-flex flex-wrap gap-2 mb-3 small">
        <Link className="btn btn-sm btn-outline-secondary" href={OWNER_PRICING_NAV.governance}>
          Pricing governance
        </Link>
        <Link className="btn btn-sm btn-outline-secondary" href={OWNER_PRICING_NAV.priceMaster}>
          Price master
        </Link>
        <Link className="btn btn-sm btn-outline-secondary" href={OWNER_PRICING_NAV.discountRules}>
          Discount rules
        </Link>
        <Link className="btn btn-sm btn-outline-secondary" href="/owner/inventory/pricing-campaigns">
          Campaigns
        </Link>
      </div>

      {!canManage && canList && (
        <div className="alert alert-info py-2 small mb-3">
          Read-only: you can review tiers and run pricing preview if your role includes simulation permissions. Creating or changing tiers requires{" "}
          <code>pricing.membership.manage</code>.
        </div>
      )}

      {error && (
        <div className="alert alert-danger py-2 mb-3" role="alert">
          {error}
        </div>
      )}

      {orgId && (
        <>
          <MembershipTierToolbar
            filters={filtersUi}
            onChange={updateFilters}
            onClear={clearFilters}
            onRefresh={() => setQueryVersion((v) => v + 1)}
            onCreate={openCreate}
            loading={listLoading}
            canManage={canManage}
          />

          <MembershipTierGrid
            rows={pageRows}
            loading={listLoading}
            page={page}
            pageSize={pageSize}
            totalFiltered={totalFiltered}
            onPageChange={setPage}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={onSort}
            canManage={canManage}
            onView={openView}
            onEdit={openEdit}
            onDuplicate={duplicateTier}
            onPreview={focusPreview}
            onSetStatus={setTierStatus}
          />

          {!canSimulate && (
            <div className="alert alert-secondary small mb-3">
              Pricing preview is unavailable for your current permissions. It requires central pricing read/write, audit view, retail rule manage, or
              membership manage (plus organization read).
            </div>
          )}

          <MembershipSimulationPanel
            orgId={orgId}
            branches={branches}
            tiers={tiers}
            governance={policy}
            variantId={simVariant}
            branchId={simBranch}
            membershipTierId={simTier}
            memberPct={simMemberPct}
            variantQuery={simQuery}
            variantHits={simHits}
            variantSearchLoading={simSearchLoading}
            onVariantQuery={setSimQuery}
            onPickVariant={(id) => {
              setSimVariant(String(id));
              setSimQuery(`Variant #${id}`);
            }}
            onBranchChange={setSimBranch}
            onTierChange={setSimTier}
            onMemberPct={setSimMemberPct}
            onRun={runSim}
            loading={simLoading}
            result={simOut}
            disabled={!canSimulate}
          />
        </>
      )}

      <MembershipTierDrawer
        open={drawerOpen}
        mode={drawerMode}
        orgId={orgId}
        branches={branches}
        meta={meta}
        discountCards={discountCards}
        linkedCards={linkedCardsSnapshot}
        form={form}
        setForm={setForm}
        issues={validationIssues}
        hints={[...govHints]}
        saving={saving}
        readOnly={drawerReadOnly}
        onClose={() => setDrawerOpen(false)}
        onSave={saveDrawer}
        onUnlinkCard={onUnlinkCard}
        ownerGet={ownerGet}
      />
    </div>
  );
}
