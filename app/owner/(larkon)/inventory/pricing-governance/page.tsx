"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet, ownerPatch, ownerPost } from "@/app/owner/_lib/ownerApi";

type OrgPolicy = {
  orgId: number;
  enforceBranchOverrideWithinCentralBand: boolean;
  retailDiscountApprovalEnabled: boolean;
  posPricingGovernanceEnabled?: boolean;
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

export default function PricingGovernancePage() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [policy, setPolicy] = useState<OrgPolicy | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [tab, setTab] = useState<"policy" | "audit" | "rules" | "approvals">("policy");
  const [saving, setSaving] = useState(false);

  const [ruleForm, setRuleForm] = useState({
    variantId: "",
    branchId: "",
    maxDiscountPercent: "",
    requiresApprovalAbovePercent: "",
    maxDiscountAmount: "",
  });

  const loadAll = useCallback(async (oid: number) => {
    setError(null);
    try {
      const [p, a, r, ap] = await Promise.all([
        ownerGet<{ data?: OrgPolicy; success?: boolean }>(`/api/v1/pricing/governance/policy?orgId=${oid}`),
        ownerGet<{ data?: AuditRow[]; success?: boolean }>(`/api/v1/pricing/governance/audit?orgId=${oid}&limit=30`),
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
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const me = await ownerGet<unknown>("/api/v1/owner/me");
        if (cancelled) return;
        let oid = pickOrgId(me);
        if (oid == null) {
          const orgs = await ownerGet<{ data?: { id: number }[] }>("/api/v1/owner/organizations");
          const rows = (orgs as { data?: unknown[] })?.data ?? orgs;
          const first = Array.isArray(rows) ? (rows[0] as { id?: number })?.id : null;
          oid = first != null ? Number(first) : null;
        }
        setOrgId(oid);
        if (oid) await loadAll(oid);
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

  async function savePolicy(next: Partial<OrgPolicy>) {
    if (!orgId) return;
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
    if (!orgId || !ruleForm.variantId.trim()) return;
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
    if (!orgId) return;
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

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Pricing & discount governance"
        subtitle="Central band (floor/base/MRP), branch override bounds, retail discount caps, and audit trail."
        breadcrumbs={[
          { label: "Owner", href: "/owner/dashboard" },
          { label: "Inventory", href: "/owner/inventory" },
          { label: "Pricing governance", href: "/owner/inventory/pricing-governance" },
        ]}
      />

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
                onClick={() => setTab(k)}
              >
                {label}
              </button>
            ))}
          </div>

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
                    disabled={saving}
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
                    disabled={saving}
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
                <div className="form-check form-switch mb-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="posGov"
                    checked={Boolean(policy.posPricingGovernanceEnabled)}
                    disabled={saving}
                    onChange={(e) => savePolicy({ posPricingGovernanceEnabled: e.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="posGov">
                    Enforce pricing governance on POS / checkout (server-side)
                  </label>
                </div>
              </div>
            </div>
          )}

          {tab === "audit" && (
            <div className="card radius-12">
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
                <form className="row g-2 align-items-end small" onSubmit={saveRule}>
                  <div className="col-md-2">
                    <label className="form-label">Variant ID</label>
                    <input
                      className="form-control form-control-sm"
                      value={ruleForm.variantId}
                      onChange={(e) => setRuleForm((s) => ({ ...s, variantId: e.target.value }))}
                      placeholder="SKU variant id"
                      required
                    />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Branch ID (optional)</label>
                    <input
                      className="form-control form-control-sm"
                      value={ruleForm.branchId}
                      onChange={(e) => setRuleForm((s) => ({ ...s, branchId: e.target.value }))}
                      placeholder="All branches if empty"
                    />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Max % off</label>
                    <input
                      className="form-control form-control-sm"
                      value={ruleForm.maxDiscountPercent}
                      onChange={(e) => setRuleForm((s) => ({ ...s, maxDiscountPercent: e.target.value }))}
                      placeholder="%"
                    />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Approval above %</label>
                    <input
                      className="form-control form-control-sm"
                      value={ruleForm.requiresApprovalAbovePercent}
                      onChange={(e) => setRuleForm((s) => ({ ...s, requiresApprovalAbovePercent: e.target.value }))}
                      placeholder="%"
                    />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Max amount (optional)</label>
                    <input
                      className="form-control form-control-sm"
                      value={ruleForm.maxDiscountAmount}
                      onChange={(e) => setRuleForm((s) => ({ ...s, maxDiscountAmount: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-2">
                    <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
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
                              disabled={saving}
                              onClick={() => reviewApproval(a.id, true)}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              disabled={saving}
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
            <code>pricing.central.write</code>, <code>pricing.branch.override</code>, <code>retail.discount.apply</code>,{" "}
            <code>retail.discount.approve</code>.
          </p>
          <Link href="/owner/inventory" className="btn btn-outline-secondary btn-sm mt-2">
            Back to inventory
          </Link>
        </>
      )}
    </div>
  );
}
