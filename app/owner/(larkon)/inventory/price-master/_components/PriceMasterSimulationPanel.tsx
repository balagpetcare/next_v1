"use client";

import type { BranchOption } from "../_lib/priceMasterTypes";

type Props = {
  orgId: number | null;
  branches: BranchOption[];
  variantId: string;
  branchId: string;
  membershipTierId: string;
  /** Optional stock lot id — narrows batch promo to that lot when it is on-hand at the branch shop. */
  lotId: string;
  /** Optional discounted unit for governance preview vs resolved list. */
  discountedUnitPrice: string;
  onVariantChange: (v: string) => void;
  onBranchChange: (v: string) => void;
  onTierChange: (v: string) => void;
  onLotChange: (v: string) => void;
  onDiscountedChange: (v: string) => void;
  onRun: () => void;
  loading: boolean;
  result: unknown;
  disabled?: boolean;
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return x != null && typeof x === "object" && !Array.isArray(x);
}

function outcomeBadgeClass(outcome: string) {
  if (outcome === "applied") return "bg-success";
  if (outcome === "skipped") return "bg-secondary";
  if (outcome === "blocked") return "bg-danger";
  if (outcome === "warning") return "bg-warning text-dark";
  return "bg-light text-dark";
}

function TimelineTable({ steps }: { steps: unknown[] }) {
  if (!steps.length) return <p className="small text-muted mb-0">No timeline steps.</p>;
  return (
    <div className="table-responsive">
      <table className="table table-sm table-bordered mb-0 align-middle">
        <thead className="table-light small">
          <tr>
            <th>Layer</th>
            <th>Outcome</th>
            <th>Label</th>
            <th>Detail</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody className="small">
          {steps.map((raw, i) => {
            const s = isRecord(raw) ? raw : null;
            const oc = s ? String(s.outcome ?? "—") : "—";
            return (
              <tr key={i}>
                <td className="font-monospace">{s ? String(s.layer ?? "—") : "—"}</td>
                <td>
                  <span className={`badge rounded-pill ${outcomeBadgeClass(oc)}`}>{oc}</span>
                </td>
                <td>{s ? String(s.label ?? "") : JSON.stringify(raw)}</td>
                <td className="text-muted text-break">{s?.detail != null ? String(s.detail) : "—"}</td>
                <td className="text-nowrap">
                  {s?.priceBefore != null || s?.priceAfter != null ? (
                    <>
                      {s.priceBefore != null ? String(s.priceBefore) : "—"} →{" "}
                      <strong>{s.priceAfter != null ? String(s.priceAfter) : "—"}</strong>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TraceList({ trace }: { trace: unknown[] }) {
  if (!trace.length) return <p className="small text-muted mb-0">No enterprise trace steps returned.</p>;
  return (
    <ol className="small mb-0 ps-3">
      {trace.map((step, i) => (
        <li key={i} className="mb-2">
          {isRecord(step) ? (
            <>
              <span className="badge bg-light text-dark border me-1">{String(step.kind ?? step.phase ?? step.layer ?? "—")}</span>
              <span className="fw-medium">{String(step.label ?? step.detail ?? "")}</span>
              {step.priceBefore != null && step.priceAfter != null && (
                <div className="text-muted">
                  {String(step.priceBefore)} → <span className="text-dark fw-medium">{String(step.priceAfter)}</span>
                </div>
              )}
              {step.price != null && step.priceBefore == null && <span className="text-muted"> @ {String(step.price)}</span>}
            </>
          ) : (
            JSON.stringify(step)
          )}
        </li>
      ))}
    </ol>
  );
}

export function PriceMasterSimulationPanel({
  orgId,
  branches,
  variantId,
  branchId,
  membershipTierId,
  lotId,
  discountedUnitPrice,
  onVariantChange,
  onBranchChange,
  onTierChange,
  onLotChange,
  onDiscountedChange,
  onRun,
  loading,
  result,
  disabled,
}: Props) {
  const payload = isRecord(result) ? result : null;
  const core = payload && isRecord(payload.core) ? payload.core : null;
  const ent = payload && isRecord(payload.withEnterprise) ? payload.withEnterprise : null;
  const meta = payload && isRecord(payload.resolutionMeta) ? payload.resolutionMeta : null;
  const timeline = payload && isRecord(payload.resolutionTimeline) ? payload.resolutionTimeline : null;
  const shopLoc = payload?.shopLocationId;
  const breakdown = ent && isRecord(ent.breakdown) ? ent.breakdown : null;
  const trace = (ent && Array.isArray(ent.enterpriseTrace) ? ent.enterpriseTrace : []) as unknown[];
  const diag = timeline && isRecord(timeline) && isRecord(timeline.diagnostics) ? timeline.diagnostics : null;
  const timelineSteps = timeline && Array.isArray((timeline as { steps?: unknown }).steps) ? (timeline as { steps: unknown[] }).steps : [];

  return (
    <div className="card radius-12 mb-3">
      <div className="card-body">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
          <div>
            <h6 className="card-title mb-1">Price resolution simulator</h6>
            <p className="small text-muted mb-0">
              Compare catalog list price with enterprise layers (branch override, campaigns, membership, batch) for a branch
              context. When POS governance is enabled, discounted lines are validated against this same resolved list.
            </p>
          </div>
        </div>
        <div className="row g-2 align-items-end mb-3">
          <div className="col-md-2">
            <label className="form-label small text-muted mb-1">Variant ID</label>
            <input
              className="form-control form-control-sm"
              placeholder="Numeric variant id"
              value={variantId}
              disabled={disabled || !orgId}
              onChange={(e) => onVariantChange(e.target.value)}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small text-muted mb-1">Branch</label>
            <select
              className="form-select form-select-sm"
              value={branchId}
              disabled={disabled || !orgId}
              onChange={(e) => onBranchChange(e.target.value)}
            >
              <option value="">Select branch…</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label small text-muted mb-1">Membership tier (optional)</label>
            <input
              className="form-control form-control-sm"
              placeholder="Tier id"
              value={membershipTierId}
              disabled={disabled || !orgId}
              onChange={(e) => onTierChange(e.target.value)}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label small text-muted mb-1">Lot id (optional)</label>
            <input
              className="form-control form-control-sm"
              placeholder="Stock lot"
              value={lotId}
              disabled={disabled || !orgId}
              onChange={(e) => onLotChange(e.target.value)}
            />
            <div className="form-text">Batch promo uses branch SHOP on-hand lots; set lot to narrow.</div>
          </div>
          <div className="col-md-2">
            <label className="form-label small text-muted mb-1">Discounted unit (optional)</label>
            <input
              className="form-control form-control-sm"
              placeholder="POS line price"
              value={discountedUnitPrice}
              disabled={disabled || !orgId}
              onChange={(e) => onDiscountedChange(e.target.value)}
            />
            <div className="form-text">Runs retail governance preview vs resolved list.</div>
          </div>
          <div className="col-md-2">
            <button type="button" className="btn btn-primary btn-sm w-100" disabled={disabled || !orgId || loading} onClick={onRun}>
              {loading ? "Running…" : "Run simulation"}
            </button>
          </div>
        </div>

        {result != null && (
          <div className="row g-3">
            <div className="col-lg-6">
              <div className="border rounded-3 p-3 h-100 bg-light">
                <div className="text-uppercase text-muted small fw-semibold mb-2">Core catalog path</div>
                {core && isRecord(core) ? (
                  <dl className="row small mb-0">
                    <dt className="col-5">Effective price</dt>
                    <dd className="col-7">{core.price != null ? String(core.price) : "—"}</dd>
                    <dt className="col-5">Source</dt>
                    <dd className="col-7">{String(core.source ?? "—")}</dd>
                    {isRecord(core.breakdown) && (
                      <>
                        <dt className="col-5">Base</dt>
                        <dd className="col-7">{core.breakdown.basePrice != null ? String(core.breakdown.basePrice) : "—"}</dd>
                        <dt className="col-5">After markup</dt>
                        <dd className="col-7">{core.breakdown.afterMarkup != null ? String(core.breakdown.afterMarkup) : "—"}</dd>
                        <dt className="col-5">Canonical MRP</dt>
                        <dd className="col-7">{core.breakdown.mrp != null ? String(core.breakdown.mrp) : "—"}</dd>
                        <dt className="col-5">Floor / cap</dt>
                        <dd className="col-7">
                          {(core.breakdown.minPrice != null ? String(core.breakdown.minPrice) : "—") +
                            " / " +
                            (core.breakdown.maxPrice != null ? String(core.breakdown.maxPrice) : "—")}
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
                <div className="text-uppercase text-muted small fw-semibold mb-2">Enterprise resolution</div>
                {ent && isRecord(ent) ? (
                  <dl className="row small mb-2">
                    <dt className="col-5">Final list</dt>
                    <dd className="col-7 fw-semibold">{ent.price != null ? String(ent.price) : "—"}</dd>
                    <dt className="col-5">Winning source</dt>
                    <dd className="col-7">{String(ent.source ?? "—")}</dd>
                    {shopLoc != null ? (
                      <>
                        <dt className="col-5">Shop location</dt>
                        <dd className="col-7 font-monospace small">{String(shopLoc)}</dd>
                      </>
                    ) : null}
                    {breakdown?.batchPromo != null && (
                      <>
                        <dt className="col-5">Batch promo</dt>
                        <dd className="col-7">{String(breakdown.batchPromo)}</dd>
                      </>
                    )}
                  </dl>
                ) : (
                  <p className="small text-muted">No enterprise layer returned.</p>
                )}
                {meta && Array.isArray(meta.documentedOrder) && (
                  <div className="small mb-2 border rounded p-2 bg-light">
                    <div className="text-uppercase text-muted fw-semibold mb-1">Resolution order</div>
                    <ul className="mb-0 ps-3">
                      {(meta.documentedOrder as string[]).map((line, i) => (
                        <li key={i} className="mb-1">
                          {line}
                        </li>
                      ))}
                    </ul>
                    {meta.batchPromoApplied === true && (
                      <div className="text-warning mt-1">Batch promo layer reduced list vs post-layer price.</div>
                    )}
                  </div>
                )}
                <div className="text-uppercase text-muted small fw-semibold mb-1">Layer trace (engine)</div>
                <TraceList trace={trace} />
                {diag && (
                  <div className="small border rounded p-2 mt-2 bg-white">
                    <div className="fw-semibold text-muted text-uppercase mb-1">Layer diagnostics</div>
                    <ul className="mb-0 ps-3">
                      <li>
                        Enterprise rules: {String(diag.enterpriseRulesApplied)} applied / {String(diag.enterpriseRulesConsidered)}{" "}
                        considered ({String(diag.enterpriseRulesLoaded)} loaded)
                      </li>
                      <li>
                        Campaigns: {String(diag.campaignsApplied)} applied / {String(diag.campaignsConsidered)} considered (
                        {String(diag.campaignsLoaded)} loaded)
                      </li>
                      <li>Membership: {diag.membershipApplied ? "applied" : "not applied"}</li>
                    </ul>
                  </div>
                )}
                {timelineSteps.length > 0 && (
                  <div className="mt-3">
                    <div className="text-uppercase text-muted small fw-semibold mb-2">Resolution timeline (admin)</div>
                    <TimelineTable steps={timelineSteps} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
