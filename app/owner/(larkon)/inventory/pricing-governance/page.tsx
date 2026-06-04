"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet, ownerPatch, ownerPost } from "@/app/owner/_lib/ownerApi";
import { OWNER_PRICING_NAV } from "@/src/lib/ownerPricingNav";

type OrgPolicy = {
  orgId: number;
  enforceBranchOverrideWithinCentralBand: boolean;
  retailDiscountApprovalEnabled: boolean;
  posPricingGovernanceEnabled?: boolean;
  posUseEnterpriseListResolution?: boolean;
  blockSaleBelowCost?: boolean;
  blockSaleBelowFloor?: boolean;
  allowCampaignStacking?: boolean;
  allowMembershipStacking?: boolean;
  scheduledPricingEnabled?: boolean;
  batchPricingEnabled?: boolean;
  defaultMaxDiscountPercent?: unknown;
};

type AuditRow = {
  id: number;
  entityType: string;
  entityKey: string;
  action: string;
  createdAt: string;
  actor?: { id: number; profile?: { displayName?: string | null } | null } | null;
};

type RuleRow = {
  id: number;
  variantId: number;
  branchId: number | null;
  maxDiscountPercent: unknown;
  maxDiscountAmount: unknown;
  requiresApprovalAbovePercent: unknown;
  status: string;
  variant?: { sku: string; title: string };
  branch?: { id: number; name: string } | null;
};

type ApprovalRow = {
  id: number;
  branchId: number;
  variantId: number;
  listPriceSnapshot: unknown;
  requestedUnitPrice: unknown;
  requestedDiscountPercent: unknown;
  status: string;
  reason?: string | null;
  variant?: { sku: string; title: string };
  branch?: { name: string };
};

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

export default function PricingGovernancePage() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [permSet, setPermSet] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [policy, setPolicy] = useState<OrgPolicy | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [tab, setTab] = useState<"policy" | "audit" | "rules" | "approvals">("policy");
  /** Optional filters for governance audit API (also read from URL on first load). */
  const [auditEntityType, setAuditEntityType] = useState("");
  const [auditEntityKeyContains, setAuditEntityKeyContains] = useState("");
  const [saving, setSaving] = useState(false);

  const [ruleForm, setRuleForm] = useState({
    variantId: "",
    branchId: "",
    maxDiscountPercent: "",
    requiresApprovalAbovePercent: "",
    maxDiscountAmount: "",
  });

  const loadAll = useCallback(
    async (
      oid: number,
      auditOpts?: { entityType?: string; entityKeyContains?: string } | null
    ) => {
    setError(null);
    try {
      const auditQs = new URLSearchParams({ orgId: String(oid), limit: "30" });
      const etRaw =
        auditOpts && auditOpts.entityType !== undefined ? auditOpts.entityType : auditEntityType;
      const ekRaw =
        auditOpts && auditOpts.entityKeyContains !== undefined
          ? auditOpts.entityKeyContains
          : auditEntityKeyContains;
      const et = String(etRaw ?? "").trim();
      const ek = String(ekRaw ?? "").trim();
      if (et) auditQs.set("entityType", et);
      if (ek) auditQs.set("entityKeyContains", ek);

      const [p, a, r, ap] = await Promise.all([
        ownerGet<{ data?: OrgPolicy; success?: boolean }>(`/api/v1/pricing/governance/policy?orgId=${oid}`),
        ownerGet<{ data?: AuditRow[]; success?: boolean }>(
          `/api/v1/pricing/governance/audit?${auditQs.toString()}`
        ),
        ownerGet<{ data?: RuleRow[]; success?: boolean }>(`/api/v1/pricing/retail-discount/rules?orgId=${oid}&limit=50`),
        ownerGet<{ data?: ApprovalRow[]; success?: boolean }>(`/api/v1/pricing/retail-discount/approvals?orgId=${oid}`),
      ]);
      setPolicy((p as { data?: OrgPolicy })?.data ?? null);
      const auditData = (a as { data?: AuditRow[] })?.data;
      setAudit(Array.isArray(auditData) ? auditData : []);
      const rulesData = (r as { data?: RuleRow[] })?.data;
      setRules(Array.isArray(rulesData) ? rulesData : []);
      const apData = (ap as { data?: ApprovalRow[] })?.data;
      setApprovals(Array.isArray(apData) ? apData : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  },
    [auditEntityKeyContains, auditEntityType]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
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
          const rows = (orgs as { data?: unknown[] })?.data ?? orgs;
          const first = Array.isArray(rows) ? (rows[0] as { id?: number })?.id : null;
          oid = first != null ? Number(first) : null;
        }
        setOrgId(oid);
        if (oid) {
          let entityTypeInit = "";
          let entityKeyInit = "";
          if (typeof window !== "undefined") {
            const sp = new URLSearchParams(window.location.search);
            const t = sp.get("tab");
            if (t === "policy" || t === "audit" || t === "rules" || t === "approvals") {
              setTab(t);
            }
            entityTypeInit = sp.get("entityType")?.trim() ?? "";
            entityKeyInit = sp.get("entityKeyContains")?.trim() ?? "";
            if (entityTypeInit) setAuditEntityType(entityTypeInit);
            if (entityKeyInit) setAuditEntityKeyContains(entityKeyInit);
          }
          await loadAll(oid, {
            entityType: entityTypeInit || undefined,
            entityKeyContains: entityKeyInit || undefined,
          });
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load org");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAll]);

  const canWriteCentralPolicy =
    permSet.has("pricing.central.write") || permSet.has("global.admin") || permSet.has("country.admin");
  const canManageRetailRules = permSet.has("pricing.retail.rule.manage") || permSet.has("global.admin");
  const canApproveRetailDiscounts =
    permSet.has("retail.discount.approve") || permSet.has("pricing.retail.rule.manage") || permSet.has("global.admin");

  async function savePolicy(next: Partial<OrgPolicy>) {
    if (!orgId || !canWriteCentralPolicy) return;
    setSaving(true);
    setError(null);
    try {
      await ownerPatch<{ data?: OrgPolicy }>("/api/v1/pricing/governance/policy", {
        orgId,
        ...next,
      });
      await loadAll(orgId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveRule(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !canManageRetailRules || !ruleForm.variantId.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await ownerPost<{ success?: boolean }>("/api/v1/pricing/retail-discount/rules", {
        orgId,
        variantId: parseInt(ruleForm.variantId, 10),
        branchId: ruleForm.branchId.trim() === "" ? null : parseInt(ruleForm.branchId, 10),
        maxDiscountPercent: ruleForm.maxDiscountPercent === "" ? null : parseFloat(ruleForm.maxDiscountPercent),
        requiresApprovalAbovePercent:
          ruleForm.requiresApprovalAbovePercent === "" ? null : parseFloat(ruleForm.requiresApprovalAbovePercent),
        maxDiscountAmount: ruleForm.maxDiscountAmount === "" ? null : parseFloat(ruleForm.maxDiscountAmount),
        status: "ACTIVE",
      });
      setRuleForm({ variantId: "", branchId: "", maxDiscountPercent: "", requiresApprovalAbovePercent: "", maxDiscountAmount: "" });
      await loadAll(orgId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save rule");
    } finally {
      setSaving(false);
    }
  }

  async function reviewApproval(id: number, approve: boolean) {
    if (!orgId || !canApproveRetailDiscounts) return;
    setSaving(true);
    setError(null);
    try {
      await ownerPatch(`/api/v1/pricing/retail-discount/approvals/${id}`, {
        orgId,
        approve,
        reviewNote: approve ? "Approved" : "Rejected",
      });
      await loadAll(orgId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Review failed");
    } finally {
      setSaving(false);
    }
  }

  async function deactivateRetailRule(id: number) {
    if (!orgId || !canManageRetailRules) return;
    if (!window.confirm("Deactivate this retail discount rule?")) return;
    setSaving(true);
    setError(null);
    try {
      await ownerPatch(`/api/v1/pricing/retail-discount/rules/${id}`, { orgId, status: "INACTIVE" });
      await loadAll(orgId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Pricing Governance"
        subtitle="Central band (floor/base/MRP), branch override bounds, retail discount caps, and audit trail."
        breadcrumbs={[
          { label: "Owner", href: "/owner/dashboard" },
          { label: "Inventory", href: "/owner/inventory" },
          { label: "Pricing governance", href: "/owner/inventory/pricing-governance" },
        ]}
      />

      {orgId && (
        <div className="d-flex flex-wrap gap-2 mb-3 small">
          <Link className="btn btn-sm btn-outline-secondary" href={OWNER_PRICING_NAV.priceMaster}>
            Price master
          </Link>
          <Link className="btn btn-sm btn-outline-secondary" href={OWNER_PRICING_NAV.discountRules}>
            Enterprise rules
          </Link>
          <Link className="btn btn-sm btn-outline-secondary" href={OWNER_PRICING_NAV.membership}>
            Membership
          </Link>
          <Link className="btn btn-sm btn-outline-secondary" href={OWNER_PRICING_NAV.campaigns}>
            Campaigns
          </Link>
          <Link className="btn btn-sm btn-outline-secondary" href={OWNER_PRICING_NAV.analytics}>
            Analytics
          </Link>
        </div>
      )}

      {loading && <p className="text-muted small">Loading…</p>}
      {error && (
        <div className="alert alert-danger radius-12 py-2" role="alert">
          {error}
        </div>
      )}

      {orgId && (
        <>
          <div className="btn-group mb-3 flex-wrap" role="group">
            {(
              [
                ["policy", "Policy"],
                ["audit", "Audit log"],
                ["rules", "Retail discount rules"],
                ["approvals", "Pending approvals"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                className={`btn btn-sm ${tab === k ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => {
                  setTab(k);
                  if (k === "audit" && orgId) {
                    void loadAll(orgId);
                  }
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "policy" && !canWriteCentralPolicy && (
            <div className="alert alert-secondary radius-12 py-2 small mb-3" role="status">
              View-only: your account can read pricing governance but does not have{" "}
              <code>pricing.central.write</code>. Policy changes are disabled; contact an organization admin if you need edit access.
            </div>
          )}

          {tab === "policy" && policy && (
            <div className="card radius-12 mb-3">
              <div className="card-body">
                <h6 className="card-title">Organization policy</h6>
                <p className="small text-muted">
                  When enabled, branch override prices must stay within central <strong>minPrice</strong> (floor) and <strong>maxPrice</strong> (MRP cap)
                  on <code>ProductPricing</code>. Central edits are validated so floor ≤ base ≤ MRP and markup stays in band.
                </p>
                <div className="form-check form-switch mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="enforceBranch"
                    checked={policy.enforceBranchOverrideWithinCentralBand}
                    disabled={saving || !canWriteCentralPolicy}
                    onChange={(e) =>
                      savePolicy({ enforceBranchOverrideWithinCentralBand: e.target.checked })
                    }
                  />
                  <label className="form-check-label" htmlFor="enforceBranch">
                    Enforce branch overrides within central min/max
                  </label>
                </div>
                <div className="form-check form-switch mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="retailApproval"
                    checked={policy.retailDiscountApprovalEnabled}
                    disabled={saving || !canWriteCentralPolicy}
                    onChange={(e) => savePolicy({ retailDiscountApprovalEnabled: e.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="retailApproval">
                    Require approval workflow for over-threshold retail discounts
                  </label>
                </div>
                <p className="small text-muted mb-2">
                  When POS governance is on, the API enforces list price resolution, floor (min sale), retail discount rules, and
                  optional approval ids on <code>POST /api/v1/pos/sale</code> before payment completes. Off by default for existing
                  orgs.
                </p>
                <div className="form-check form-switch mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="posGov"
                    checked={Boolean(policy.posPricingGovernanceEnabled)}
                    disabled={saving || !canWriteCentralPolicy}
                    onChange={(e) => savePolicy({ posPricingGovernanceEnabled: e.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="posGov">
                    Enforce pricing governance on POS / checkout (server-side)
                  </label>
                </div>
                <div className="form-check form-switch mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="posEntList"
                    checked={Boolean(policy.posUseEnterpriseListResolution)}
                    disabled={saving || !canWriteCentralPolicy}
                    onChange={(e) => savePolicy({ posUseEnterpriseListResolution: e.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="posEntList">
                    Use enterprise list resolution for POS barcode / product browse (campaigns, membership, batch promos).
                    When POS governance above is on, this is implied and should match validation.
                  </label>
                </div>
                <div className="form-check form-switch mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="blockCost"
                    checked={Boolean(policy.blockSaleBelowCost)}
                    disabled={saving || !canWriteCentralPolicy}
                    onChange={(e) => savePolicy({ blockSaleBelowCost: e.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="blockCost">
                    Block checkout below latest GRN reference cost (when cost known)
                  </label>
                </div>
                <div className="form-check form-switch mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="blockFloor"
                    checked={policy.blockSaleBelowFloor !== false}
                    disabled={saving || !canWriteCentralPolicy}
                    onChange={(e) => savePolicy({ blockSaleBelowFloor: e.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="blockFloor">
                    Enforce ProductPricing minPrice as floor on discounted POS lines
                  </label>
                </div>
                <div className="form-check form-switch mb-2">
                  <input
                    className="form-check-input"
                    id="campStack"
                    type="checkbox"
                    checked={Boolean(policy.allowCampaignStacking)}
                    disabled={saving || !canWriteCentralPolicy}
                    onChange={(e) => savePolicy({ allowCampaignStacking: e.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="campStack">
                    Allow stacking multiple active campaigns (advanced)
                  </label>
                </div>
                <div className="form-check form-switch mb-2">
                  <input
                    className="form-check-input"
                    id="memStack"
                    type="checkbox"
                    checked={Boolean(policy.allowMembershipStacking)}
                    disabled={saving || !canWriteCentralPolicy}
                    onChange={(e) => savePolicy({ allowMembershipStacking: e.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="memStack">
                    Allow membership tier discounts to stack with promos (when tier permits)
                  </label>
                </div>
                <div className="form-check form-switch mb-2">
                  <input
                    className="form-check-input"
                    id="schedEn"
                    type="checkbox"
                    checked={Boolean(policy.scheduledPricingEnabled)}
                    disabled={saving || !canWriteCentralPolicy}
                    onChange={(e) => savePolicy({ scheduledPricingEnabled: e.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="schedEn">
                    Enable scheduled central price changes (Price Master schedules)
                  </label>
                </div>
                <div className="form-check form-switch mb-0">
                  <input
                    className="form-check-input"
                    id="batchEn"
                    type="checkbox"
                    checked={Boolean(policy.batchPricingEnabled)}
                    disabled={saving || !canWriteCentralPolicy}
                    onChange={(e) => savePolicy({ batchPricingEnabled: e.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="batchEn">
                    Enable batch-aware promo pricing at shop lots
                  </label>
                </div>
              </div>
            </div>
          )}

          {tab === "audit" && (
            <div className="card radius-12">
              <div className="card-body border-bottom py-2">
                <div className="row g-2 align-items-end small">
                  <div className="col-md-3">
                    <label className="form-label text-muted mb-0">Entity type</label>
                    <input
                      className="form-control form-control-sm"
                      placeholder="e.g. BATCH_PRICING_RULE"
                      value={auditEntityType}
                      onChange={(e) => setAuditEntityType(e.target.value)}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label text-muted mb-0">Entity key contains</label>
                    <input
                      className="form-control form-control-sm"
                      placeholder="Substring match"
                      value={auditEntityKeyContains}
                      onChange={(e) => setAuditEntityKeyContains(e.target.value)}
                    />
                  </div>
                  <div className="col-md-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-primary w-100"
                      disabled={!orgId || loading}
                      onClick={() => orgId && void loadAll(orgId, { entityType: auditEntityType, entityKeyContains: auditEntityKeyContains })}
                    >
                      Apply filters
                    </button>
                  </div>
                  <div className="col-md-3 small text-muted">
                    URL query <code>?tab=audit&amp;entityType=…</code> still works on first load.
                  </div>
                </div>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-sm table-hover mb-0 align-middle">
                    <thead className="bg-light">
                      <tr>
                        <th>When</th>
                        <th>Type</th>
                        <th>Key</th>
                        <th>Action</th>
                        <th>Actor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audit.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-muted small p-3">
                            No audit entries yet. Changes to central pricing, branch overrides, policy, and retail rules appear here.
                          </td>
                        </tr>
                      ) : (
                        audit.map((row) => (
                          <tr key={row.id}>
                            <td className="small">{new Date(row.createdAt).toLocaleString()}</td>
                            <td className="small">{row.entityType}</td>
                            <td className="small text-break">{row.entityKey}</td>
                            <td className="small">{row.action}</td>
                            <td className="small">{row.actor?.profile?.displayName ?? `User #${row.actor?.id ?? "—"}`}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === "rules" && (
            <div className="card radius-12 mb-3">
              <div className="card-body">
                <h6 className="card-title">Add retail discount rule</h6>
                {!canManageRetailRules && (
                  <p className="small text-muted mb-2">
                    View-only: editing rules requires <code>pricing.retail.rule.manage</code>.
                  </p>
                )}
                <form className="row g-2 align-items-end small" onSubmit={saveRule}>
                  <div className="col-md-2">
                    <label className="form-label">Variant ID</label>
                    <input
                      className="form-control form-control-sm"
                      value={ruleForm.variantId}
                      onChange={(e) => setRuleForm((s) => ({ ...s, variantId: e.target.value }))}
                      placeholder="SKU variant id"
                      required
                      disabled={!canManageRetailRules}
                    />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Branch ID (optional)</label>
                    <input
                      className="form-control form-control-sm"
                      value={ruleForm.branchId}
                      onChange={(e) => setRuleForm((s) => ({ ...s, branchId: e.target.value }))}
                      placeholder="All branches if empty"
                      disabled={!canManageRetailRules}
                    />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Max % off</label>
                    <input
                      className="form-control form-control-sm"
                      value={ruleForm.maxDiscountPercent}
                      onChange={(e) => setRuleForm((s) => ({ ...s, maxDiscountPercent: e.target.value }))}
                      placeholder="%"
                      disabled={!canManageRetailRules}
                    />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Approval above %</label>
                    <input
                      className="form-control form-control-sm"
                      value={ruleForm.requiresApprovalAbovePercent}
                      onChange={(e) => setRuleForm((s) => ({ ...s, requiresApprovalAbovePercent: e.target.value }))}
                      placeholder="%"
                      disabled={!canManageRetailRules}
                    />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Max amount (optional)</label>
                    <input
                      className="form-control form-control-sm"
                      value={ruleForm.maxDiscountAmount}
                      onChange={(e) => setRuleForm((s) => ({ ...s, maxDiscountAmount: e.target.value }))}
                      disabled={!canManageRetailRules}
                    />
                  </div>
                  <div className="col-md-2">
                    <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !canManageRetailRules}>
                      Save rule
                    </button>
                  </div>
                </form>
              </div>
              <div className="table-responsive border-top">
                <table className="table table-sm mb-0 align-middle">
                  <thead className="bg-light">
                    <tr>
                      <th>Variant</th>
                      <th>Branch</th>
                      <th>Max %</th>
                      <th>Approval &gt;</th>
                      <th>Status</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map((r) => (
                      <tr key={r.id}>
                        <td className="small">
                          {r.variant?.sku} — {r.variant?.title}
                        </td>
                        <td className="small">{r.branchId == null ? "All" : r.branch?.name ?? r.branchId}</td>
                        <td className="small">{r.maxDiscountPercent != null ? String(r.maxDiscountPercent) : "—"}</td>
                        <td className="small">{r.requiresApprovalAbovePercent != null ? String(r.requiresApprovalAbovePercent) : "—"}</td>
                        <td className="small">{r.status}</td>
                        <td className="text-end">
                          {r.status === "ACTIVE" ? (
                            <button
                              type="button"
                              className="btn btn-link btn-sm text-danger p-0"
                              disabled={saving || !canManageRetailRules}
                              onClick={() => deactivateRetailRule(r.id)}
                            >
                              Deactivate
                            </button>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "approvals" && (
            <div className="card radius-12">
              <div className="card-body p-0">
                {!canApproveRetailDiscounts && (
                  <p className="small text-muted px-3 pt-3 mb-0">
                    View-only: approve or reject requires <code>retail.discount.approve</code> (or rule management for listing).
                  </p>
                )}
                <table className="table table-sm mb-0 align-middle">
                  <thead className="bg-light">
                    <tr>
                      <th>SKU</th>
                      <th>Branch</th>
                      <th>List</th>
                      <th>Requested</th>
                      <th>%</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvals.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-muted small p-3">
                          No pending discount approvals.
                        </td>
                      </tr>
                    ) : (
                      approvals.map((a) => (
                        <tr key={a.id}>
                          <td className="small">
                            {a.variant?.sku} — {a.variant?.title}
                          </td>
                          <td className="small">{a.branch?.name}</td>
                          <td className="small">{String(a.listPriceSnapshot)}</td>
                          <td className="small">{String(a.requestedUnitPrice)}</td>
                          <td className="small">
                            {a.requestedDiscountPercent != null ? String(a.requestedDiscountPercent) : "—"}
                          </td>
                          <td className="text-nowrap">
                            <button
                              type="button"
                              className="btn btn-success btn-sm me-1"
                              disabled={saving || !canApproveRetailDiscounts}
                              onClick={() => reviewApproval(a.id, true)}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              disabled={saving || !canApproveRetailDiscounts}
                              onClick={() => reviewApproval(a.id, false)}
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="small text-muted mt-3 mb-0">
            API: <code>/api/v1/pricing/org</code> (central), <code>/api/v1/pricing/branch</code> (override),{" "}
            <code>/api/v1/pricing/retail-discount/validate</code> (POS integration). Permissions:{" "}
            <code>pricing.central.read</code>, <code>pricing.central.write</code>, <code>pricing.branch.override</code>,{" "}
            <code>retail.discount.apply</code>, <code>retail.discount.approve</code>.
          </p>
          <Link href="/owner/inventory" className="btn btn-outline-secondary btn-sm mt-2">
            Back to inventory
          </Link>
        </>
      )}
    </div>
  );
}
