"use client";

import type { BranchOption } from "../../price-master/_lib/priceMasterTypes";
import type { GovernanceLite, MembershipTierRow, VariantHit } from "../_lib/membershipTierTypes";

type TierOpt = { id: number; name: string; status?: string };

type Props = {
  orgId: number | null;
  branches: BranchOption[];
  tiers: MembershipTierRow[];
  governance: GovernanceLite | null;
  variantId: string;
  branchId: string;
  membershipTierId: string;
  memberPct: string;
  variantQuery: string;
  variantHits: VariantHit[];
  variantSearchLoading: boolean;
  onVariantQuery: (q: string) => void;
  onPickVariant: (id: number, label: string) => void;
  onBranchChange: (v: string) => void;
  onTierChange: (v: string) => void;
  onMemberPct: (v: string) => void;
  onRun: () => void;
  loading: boolean;
  result: unknown;
  disabled?: boolean;
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return x != null && typeof x === "object" && !Array.isArray(x);
}

type TraceStep = {
  kind?: string;
  label?: string;
  priceBefore?: number;
  priceAfter?: number;
  meta?: Record<string, unknown>;
};

function TraceSteps({ trace }: { trace: TraceStep[] }) {
  if (!trace.length) return <p className="small text-muted mb-0">No resolution trace returned.</p>;
  return (
    <ol className="small mb-0 ps-3">
      {trace.map((step, i) => (
        <li key={i} className="mb-2">
          <span className="badge bg-light text-dark border me-1">{String(step.kind ?? "—")}</span>
          <span className="fw-medium">{String(step.label ?? "")}</span>
          <div className="text-muted">
            {step.priceBefore != null && step.priceAfter != null ? (
              <>
                {String(step.priceBefore)} → <span className="text-dark fw-medium">{String(step.priceAfter)}</span>
              </>
            ) : null}
            {step.meta?.ruleId != null && <span className="ms-1">(rule #{String(step.meta.ruleId)})</span>}
            {step.meta?.campaignId != null && <span className="ms-1">(campaign #{String(step.meta.campaignId)})</span>}
            {step.meta?.membershipTierId != null && <span className="ms-1">(tier #{String(step.meta.membershipTierId)})</span>}
            {step.meta?.capApplied ? <span className="ms-1 text-warning">(per-unit cap applied)</span> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function tierOptions(tiers: MembershipTierRow[]): TierOpt[] {
  return tiers.map((t) => ({ id: t.id, name: t.name, status: t.status }));
}

export function MembershipSimulationPanel({
  orgId,
  branches,
  tiers,
  governance,
  variantId,
  branchId,
  membershipTierId,
  memberPct,
  variantQuery,
  variantHits,
  variantSearchLoading,
  onVariantQuery,
  onPickVariant,
  onBranchChange,
  onTierChange,
  onMemberPct,
  onRun,
  loading,
  result,
  disabled,
}: Props) {
  const payload = isRecord(result) ? result : null;
  const core = payload && isRecord(payload.core) ? payload.core : null;
  const ent = payload && isRecord(payload.withEnterprise) ? payload.withEnterprise : null;
  const breakdown = ent && isRecord(ent.breakdown) ? ent.breakdown : null;
  const trace = (ent && Array.isArray(ent.enterpriseTrace) ? ent.enterpriseTrace : []) as TraceStep[];

  const coreBr = core && isRecord(core.breakdown) ? core.breakdown : null;
  const minP = coreBr && coreBr.minPrice != null ? Number(coreBr.minPrice) : null;
  const entPrice = ent && ent.price != null ? Number(ent.price) : null;
  const floorNote =
    minP != null && entPrice != null && Number.isFinite(minP) && entPrice + 1e-6 < minP
      ? "Resolved list is below catalog min on this path — POS governance may clamp or require approval."
      : null;

  const selectedTier = membershipTierId ? tiers.find((t) => String(t.id) === membershipTierId) : undefined;
  const tierSt = selectedTier ? String(selectedTier.status || "").toUpperCase() : "";
  const tierInactiveNote =
    selectedTier && tierSt !== "ACTIVE"
      ? `Selected tier is ${tierSt}; the resolution engine only applies Active tiers when resolving by tier id. Use manual % to approximate this tier, or activate the tier.`
      : null;

  return (
    <div className="card radius-12 mb-3" id="membership-pricing-sim">
      <div className="card-body">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
          <div>
            <h6 className="card-title mb-1">Membership pricing preview</h6>
            <p className="small text-muted mb-0">
              Same engine as catalog list resolution: Price Master values, enterprise discount rules, campaigns, membership tier (with exclusions,
              branch scope, and per-unit cap), then optional batch promo. POS may still apply retail discount governance and floors.
            </p>
          </div>
        </div>

        {governance && (
          <div className="alert alert-light border small mb-3 py-2">
            <div className="fw-semibold mb-1">Governance context</div>
            <ul className="mb-0 ps-3">
              <li>Campaign stacking (catalog list): {governance.allowCampaignStacking ? "Allowed" : "Not allowed"}</li>
              <li>Membership stacking flag: {governance.allowMembershipStacking ? "On" : "Off"}</li>
              <li>Block sale below floor: {governance.blockSaleBelowFloor ? "Yes" : "No"}</li>
              <li>POS governance mode: {governance.posPricingGovernanceEnabled ? "Enabled" : "Disabled or unset"}</li>
            </ul>
          </div>
        )}

        <div className="row g-2 align-items-end mb-2">
          <div className="col-md-4">
            <label className="form-label small text-muted mb-1">Find variant</label>
            <input
              className="form-control form-control-sm"
              placeholder="SKU, barcode, or product name…"
              value={variantQuery}
              disabled={disabled || !orgId}
              onChange={(e) => onVariantQuery(e.target.value)}
            />
            {variantSearchLoading && <div className="small text-muted mt-1">Searching…</div>}
            {variantHits.length > 0 && (
              <div className="list-group list-group-flush border rounded mt-1" style={{ maxHeight: 140, overflow: "auto" }}>
                {variantHits.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    className="list-group-item list-group-item-action py-1 px-2 small text-start"
                    onClick={() => onPickVariant(h.id, `${h.sku} — ${h.title}`)}
                  >
                    <span className="font-monospace">{h.sku}</span> · {h.title}
                    {h.product?.name && <span className="text-muted"> · {h.product.name}</span>}
                  </button>
                ))}
              </div>
            )}
            <div className="small text-muted mt-1">Selected ID: {variantId || "—"}</div>
          </div>
          <div className="col-md-3">
            <label className="form-label small text-muted mb-1">Branch</label>
            <select className="form-select form-select-sm" value={branchId} disabled={disabled || !orgId} onChange={(e) => onBranchChange(e.target.value)}>
              <option value="">Select branch…</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label small text-muted mb-1">Membership tier</label>
            <select className="form-select form-select-sm" value={membershipTierId} disabled={disabled || !orgId} onChange={(e) => onTierChange(e.target.value)}>
              <option value="">None</option>
              {tierOptions(tiers).map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name}
                  {t.status && t.status.toUpperCase() !== "ACTIVE" ? ` (${t.status})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label small text-muted mb-1">Or tier % (manual)</label>
            <input
              className="form-control form-control-sm"
              placeholder="e.g. 5"
              value={memberPct}
              disabled={disabled || !orgId}
              onChange={(e) => onMemberPct(e.target.value)}
            />
          </div>
          <div className="col-md-1">
            <button type="button" className="btn btn-primary btn-sm w-100" disabled={disabled || !orgId || loading} onClick={onRun}>
              {loading ? "…" : "Run"}
            </button>
          </div>
        </div>

        {tierInactiveNote && <div className="alert alert-warning py-2 small mb-2">{tierInactiveNote}</div>}

        {payload && (
          <div className="row g-3">
            <div className="col-lg-6">
              <div className="border rounded-3 p-3 h-100 bg-light">
                <div className="text-uppercase text-muted small fw-semibold mb-2">Catalog list (core)</div>
                {core ? (
                  <dl className="row small mb-0">
                    <dt className="col-5">List price</dt>
                    <dd className="col-7">{core.price != null ? String(core.price) : "—"}</dd>
                    <dt className="col-5">Source</dt>
                    <dd className="col-7">{String(core.source ?? "—")}</dd>
                    {coreBr && (
                      <>
                        <dt className="col-5">Base / after markup</dt>
                        <dd className="col-7">
                          {(coreBr.basePrice != null ? String(coreBr.basePrice) : "—") +
                            " / " +
                            (coreBr.afterMarkup != null ? String(coreBr.afterMarkup) : "—")}
                        </dd>
                        <dt className="col-5">Min / max (catalog)</dt>
                        <dd className="col-7">
                          {(coreBr.minPrice != null ? String(coreBr.minPrice) : "—") +
                            " / " +
                            (coreBr.maxPrice != null ? String(coreBr.maxPrice) : "—")}
                        </dd>
                      </>
                    )}
                  </dl>
                ) : (
                  <p className="small text-muted mb-0">No core result.</p>
                )}
              </div>
            </div>
            <div className="col-lg-6">
              <div className="border rounded-3 p-3 h-100">
                <div className="text-uppercase text-muted small fw-semibold mb-2">After enterprise layers</div>
                {ent ? (
                  <>
                    <dl className="row small mb-2">
                      <dt className="col-5">Final list</dt>
                      <dd className="col-7 fw-semibold">{ent.price != null ? String(ent.price) : "—"}</dd>
                      <dt className="col-5">Pricing source</dt>
                      <dd className="col-7">{String(ent.source ?? "—")}</dd>
                      {breakdown?.enterpriseList != null && (
                        <>
                          <dt className="col-5">After rules / campaigns / membership</dt>
                          <dd className="col-7">{String(breakdown.enterpriseList)}</dd>
                        </>
                      )}
                    </dl>
                    {floorNote && <div className="alert alert-warning py-2 small mb-2">{floorNote}</div>}
                    <div className="text-uppercase text-muted small fw-semibold mb-1">Precedence trace</div>
                    <p className="small text-muted mb-1">
                      Enterprise rules apply in priority order, then eligible campaigns, then membership when not excluded and branch scope matches.
                    </p>
                    <TraceSteps trace={trace} />
                  </>
                ) : (
                  <p className="small text-muted mb-0">No enterprise layer in response.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
