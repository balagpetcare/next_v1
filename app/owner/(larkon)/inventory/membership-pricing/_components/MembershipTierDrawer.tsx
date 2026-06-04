"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BranchOption } from "../../price-master/_lib/priceMasterTypes";
import type { DiscountCardOption, OrgMetaLite, TierFormState, VariantHit } from "../_lib/membershipTierTypes";
import type { FieldIssue } from "../_lib/membershipTierValidation";

type Props = {
  open: boolean;
  mode: "create" | "edit" | "view";
  orgId: number | null;
  branches: BranchOption[];
  meta: OrgMetaLite;
  discountCards: DiscountCardOption[];
  linkedCards: LinkedDiscountCardLite[];
  form: TierFormState;
  setForm: React.Dispatch<React.SetStateAction<TierFormState>>;
  issues: FieldIssue[];
  hints: FieldIssue[];
  saving: boolean;
  readOnly: boolean;
  onClose: () => void;
  onSave: () => void;
  onUnlinkCard: (cardId: number) => Promise<void>;
  ownerGet: <T>(path: string) => Promise<T | null>;
};

type LinkedDiscountCardLite = { id: number; cardNumber: string; status: string };

function useDebouncedVariantSearch(
  orgId: number | null,
  q: string,
  ownerGet: <T>(path: string) => Promise<T | null>,
  enabled: boolean
) {
  const [hits, setHits] = useState<VariantHit[]>([]);
  const [loading, setLoading] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !orgId) {
      setHits([]);
      return;
    }
    const query = q.trim();
    if (query.length < 2) {
      setHits([]);
      return;
    }
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await ownerGet<{ data?: VariantHit[] }>(
          `/api/v1/inventory/variants/search?orgId=${orgId}&q=${encodeURIComponent(query)}&limit=12`
        );
        const data = (res as { data?: VariantHit[] })?.data;
        setHits(Array.isArray(data) ? data : []);
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 320);
    return () => {
      if (t.current) clearTimeout(t.current);
    };
  }, [q, orgId, ownerGet, enabled]);

  return { hits, loading };
}

export function MembershipTierDrawer({
  open,
  mode,
  orgId,
  branches,
  meta,
  discountCards,
  linkedCards,
  form,
  setForm,
  issues,
  hints,
  saving,
  readOnly,
  onClose,
  onSave,
  onUnlinkCard,
  ownerGet,
}: Props) {
  const [exVariantQ, setExVariantQ] = useState("");
  const [pendingExKind, setPendingExKind] = useState<"VARIANT" | "CATEGORY" | "BRAND">("VARIANT");
  const [pendingCatId, setPendingCatId] = useState("");
  const [pendingBrandId, setPendingBrandId] = useState("");
  const variantSearch = useDebouncedVariantSearch(orgId, exVariantQ, ownerGet, open && pendingExKind === "VARIANT");

  useEffect(() => {
    if (!open) {
      setExVariantQ("");
      setPendingExKind("VARIANT");
      setPendingCatId("");
      setPendingBrandId("");
    }
  }, [open]);

  const addExclusion = useCallback(() => {
    if (pendingExKind === "VARIANT") {
      const id = parseInt(exVariantQ.trim(), 10);
      if (!Number.isFinite(id)) return;
      setForm((f) => ({
        ...f,
        exclusions: [...f.exclusions, { excludeKind: "VARIANT", excludeId: id }],
      }));
      setExVariantQ("");
    } else if (pendingExKind === "CATEGORY") {
      const id = parseInt(pendingCatId, 10);
      if (!Number.isFinite(id)) return;
      setForm((f) => ({
        ...f,
        exclusions: [...f.exclusions, { excludeKind: "CATEGORY", excludeId: id }],
      }));
      setPendingCatId("");
    } else {
      const id = parseInt(pendingBrandId, 10);
      if (!Number.isFinite(id)) return;
      setForm((f) => ({
        ...f,
        exclusions: [...f.exclusions, { excludeKind: "BRAND", excludeId: id }],
      }));
      setPendingBrandId("");
    }
  }, [pendingExKind, exVariantQ, pendingCatId, pendingBrandId, setForm]);

  const removeExclusion = useCallback(
    (idx: number) => {
      setForm((f) => ({
        ...f,
        exclusions: f.exclusions.filter((_, i) => i !== idx),
      }));
    },
    [setForm]
  );

  const toggleBranch = useCallback(
    (bid: number) => {
      setForm((f) => {
        if (f.branchScopeAll) return { ...f, branchScopeAll: false, branchIds: [bid] };
        const has = f.branchIds.includes(bid);
        const next = has ? f.branchIds.filter((x) => x !== bid) : [...f.branchIds, bid];
        return { ...f, branchIds: next };
      });
    },
    [setForm]
  );

  const pctPreview = (() => {
    const p = parseFloat(form.discountPercent);
    if (!Number.isFinite(p) || p <= 0) return null;
    const base = 100;
    const raw = base * (1 - p / 100);
    const cap = parseFloat(form.maxDiscountPerItem);
    let after = raw;
    if (Number.isFinite(cap) && cap >= 0) {
      const disc = base - raw;
      if (disc > cap) after = base - cap;
    }
    return { base, after };
  })();

  if (!open) return null;

  const title = mode === "create" ? "Create membership tier" : mode === "edit" ? "Edit membership tier" : "View membership tier";
  const ro = readOnly;
  const blocking = issues.filter((i) => i.blocking);

  const linkableCards = discountCards.filter((c) => !c.membershipTierId || (form.id != null && c.membershipTierId === form.id));

  return (
    <>
      <div className="offcanvas offcanvas-end show" tabIndex={-1} style={{ visibility: "visible", width: 580, maxWidth: "100vw" }}>
        <div className="offcanvas-header border-bottom">
          <div>
            <h5 className="offcanvas-title mb-0">{title}</h5>
            <p className="small text-muted mb-0">
              Membership tiers reduce catalog list price for eligible variants. They work with Price Master, enterprise rules, campaigns, and POS
              governance.
            </p>
          </div>
          <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
        </div>
        <div className="offcanvas-body">
          {blocking.length > 0 && (
            <div className="alert alert-danger py-2 small">
              {blocking.map((e, i) => (
                <div key={i}>{e.message}</div>
              ))}
            </div>
          )}
          {hints.map((h, i) => (
            <div key={`h-${i}`} className="alert alert-warning py-2 small">
              {h.message}
            </div>
          ))}

          <section className="mb-4">
            <h6 className="text-uppercase text-muted small fw-bold mb-2">Basic</h6>
            <div className="mb-2">
              <label className="form-label small">Tier name</label>
              <input className="form-control form-control-sm" disabled={ro} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="mb-2">
              <label className="form-label small">Lifecycle status</label>
              <select className="form-select form-select-sm" disabled={ro} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="DRAFT">Draft — not used in live resolution</option>
                <option value="ACTIVE">Active — participates when scope matches</option>
                <option value="PAUSED">Paused — retained but not applied</option>
                <option value="EXPIRED">Expired — retained for history</option>
                <option value="ARCHIVED">Archived — hidden from default operations</option>
              </select>
            </div>
          </section>

          <section className="mb-4">
            <h6 className="text-uppercase text-muted small fw-bold mb-2">Benefit definition</h6>
            <div className="mb-2">
              <label className="form-label small">Discount method</label>
              <select className="form-select form-select-sm" disabled value="PERCENT">
                <option value="PERCENT">Percentage off catalog list (after rules &amp; campaigns in engine order)</option>
              </select>
              <div className="form-text">Fixed-amount membership off list is not modeled in this layer; use enterprise discount rules for fixed amounts.</div>
            </div>
            <div className="row g-2">
              <div className="col-md-4">
                <label className="form-label small">Discount %</label>
                <input
                  className="form-control form-control-sm"
                  disabled={ro}
                  value={form.discountPercent}
                  onChange={(e) => setForm((f) => ({ ...f, discountPercent: e.target.value }))}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small">Per-unit discount cap (optional)</label>
                <input
                  className="form-control form-control-sm"
                  disabled={ro}
                  placeholder="Max discount / unit"
                  value={form.maxDiscountPerItem}
                  onChange={(e) => setForm((f) => ({ ...f, maxDiscountPerItem: e.target.value }))}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small">Per-invoice cap (optional)</label>
                <input
                  className="form-control form-control-sm"
                  disabled={ro}
                  placeholder="Stored for future use"
                  value={form.maxDiscountPerInvoice}
                  onChange={(e) => setForm((f) => ({ ...f, maxDiscountPerInvoice: e.target.value }))}
                />
                <div className="form-text">Invoice-level cap is stored; list simulation is line-based.</div>
              </div>
            </div>
            {pctPreview && (
              <div className="alert alert-light border small mt-2 mb-0 py-2">
                Quick sample on a notional {pctPreview.base} list: <strong>{pctPreview.after.toFixed(2)}</strong> after membership (before POS
                discounts).
              </div>
            )}
          </section>

          <section className="mb-4">
            <h6 className="text-uppercase text-muted small fw-bold mb-2">Stacking intent</h6>
            <div className="form-check mb-1">
              <input
                className="form-check-input"
                type="checkbox"
                id="st-promo"
                disabled={ro}
                checked={form.stackWithPromo}
                onChange={(e) => setForm((f) => ({ ...f, stackWithPromo: e.target.checked }))}
              />
              <label className="form-check-label small" htmlFor="st-promo">
                Tier may stack with promotional campaigns (subject to governance campaign stacking)
              </label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="st-brand"
                disabled={ro}
                checked={form.stackWithBrandDiscount}
                onChange={(e) => setForm((f) => ({ ...f, stackWithBrandDiscount: e.target.checked }))}
              />
              <label className="form-check-label small" htmlFor="st-brand">
                Tier may stack with enterprise discount rules (see governance and rule stackable flags)
              </label>
            </div>
          </section>

          <section className="mb-4">
            <h6 className="text-uppercase text-muted small fw-bold mb-2">Branch scope</h6>
            <div className="form-check mb-2">
              <input
                className="form-check-input"
                type="radio"
                name="br-scope"
                id="br-all"
                disabled={ro}
                checked={form.branchScopeAll}
                onChange={() => setForm((f) => ({ ...f, branchScopeAll: true, branchIds: [] }))}
              />
              <label className="form-check-label small" htmlFor="br-all">
                All branches in the organization
              </label>
            </div>
            <div className="form-check mb-2">
              <input
                className="form-check-input"
                type="radio"
                name="br-scope"
                id="br-sel"
                disabled={ro}
                checked={!form.branchScopeAll}
                onChange={() => setForm((f) => ({ ...f, branchScopeAll: false, branchIds: f.branchIds.length ? f.branchIds : [] }))}
              />
              <label className="form-check-label small" htmlFor="br-sel">
                Selected branches only
              </label>
            </div>
            {!form.branchScopeAll && (
              <div className="border rounded p-2 bg-light" style={{ maxHeight: 160, overflow: "auto" }}>
                {branches.map((b) => (
                  <div key={b.id} className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`br-${b.id}`}
                      disabled={ro}
                      checked={form.branchIds.includes(b.id)}
                      onChange={() => toggleBranch(b.id)}
                    />
                    <label className="form-check-label small" htmlFor={`br-${b.id}`}>
                      {b.name}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mb-4">
            <h6 className="text-uppercase text-muted small fw-bold mb-2">Exclusions</h6>
            <p className="small text-muted">Excluded variants, categories, or brands do not receive this tier&apos;s list discount.</p>
            {!ro && (
              <div className="row g-2 align-items-end mb-2">
                <div className="col-md-3">
                  <label className="form-label small">Type</label>
                  <select className="form-select form-select-sm" value={pendingExKind} onChange={(e) => setPendingExKind(e.target.value as typeof pendingExKind)}>
                    <option value="VARIANT">Variant</option>
                    <option value="CATEGORY">Category</option>
                    <option value="BRAND">Brand</option>
                  </select>
                </div>
                {pendingExKind === "VARIANT" && (
                  <div className="col-md-6">
                    <label className="form-label small">Search variant</label>
                    <input className="form-control form-control-sm" value={exVariantQ} onChange={(e) => setExVariantQ(e.target.value)} placeholder="SKU or name…" />
                    {variantSearch.loading && <div className="small text-muted">Searching…</div>}
                    {variantSearch.hits.length > 0 && (
                      <div className="list-group list-group-flush border rounded mt-1" style={{ maxHeight: 100, overflow: "auto" }}>
                        {variantSearch.hits.map((h) => (
                          <button
                            key={h.id}
                            type="button"
                            className="list-group-item list-group-item-action py-1 px-2 small"
                            onClick={() => setExVariantQ(String(h.id))}
                          >
                            {h.sku} · {h.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {pendingExKind === "CATEGORY" && (
                  <div className="col-md-6">
                    <label className="form-label small">Category</label>
                    <select className="form-select form-select-sm" value={pendingCatId} onChange={(e) => setPendingCatId(e.target.value)}>
                      <option value="">Select…</option>
                      {meta.categories.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {pendingExKind === "BRAND" && (
                  <div className="col-md-6">
                    <label className="form-label small">Brand</label>
                    <select className="form-select form-select-sm" value={pendingBrandId} onChange={(e) => setPendingBrandId(e.target.value)}>
                      <option value="">Select…</option>
                      {meta.brands.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="col-md-3">
                  <button type="button" className="btn btn-sm btn-outline-primary w-100" onClick={addExclusion}>
                    Add exclusion
                  </button>
                </div>
              </div>
            )}
            <ul className="list-group list-group-flush border rounded">
              {form.exclusions.length === 0 && <li className="list-group-item small text-muted">No exclusions</li>}
              {form.exclusions.map((ex, idx) => (
                <li key={`${ex.excludeKind}-${ex.excludeId}-${idx}`} className="list-group-item d-flex justify-content-between align-items-center py-1 small">
                  <span>
                    <span className="badge bg-light text-dark border me-1">{ex.excludeKind}</span> #{ex.excludeId}
                  </span>
                  {!ro && (
                    <button type="button" className="btn btn-link btn-sm text-danger py-0" onClick={() => removeExclusion(idx)}>
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="mb-4">
            <h6 className="text-uppercase text-muted small fw-bold mb-2">Discount cards</h6>
            {linkedCards.length > 0 ? (
              <ul className="list-group list-group-flush border rounded mb-2">
                {linkedCards.map((c) => (
                  <li key={c.id} className="list-group-item d-flex justify-content-between align-items-center py-1 small">
                    <span>
                      <span className="font-monospace">{c.cardNumber}</span>
                      <span className="text-muted ms-1">({c.status})</span>
                    </span>
                    {!ro && (
                      <button type="button" className="btn btn-link btn-sm text-danger py-0" onClick={() => void onUnlinkCard(c.id)}>
                        Unlink
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="small text-muted">No discount cards linked to this tier yet.</p>
            )}
            {!ro && (
              <>
                <label className="form-label small">Link a discount card (optional)</label>
                <select className="form-select form-select-sm mb-2" value={form.linkCardId} onChange={(e) => setForm((f) => ({ ...f, linkCardId: e.target.value }))}>
                  <option value="">None</option>
                  {linkableCards.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.cardNumber}
                      {c.membershipTierId && c.membershipTierId !== form.id ? ` (tier #${c.membershipTierId})` : ""}
                    </option>
                  ))}
                </select>
                <div className="form-text">Linking assigns the card to this tier for checkout context. Unlink clears the assignment.</div>
              </>
            )}
          </section>

          {!ro && (
            <div className="d-flex gap-2 pt-2 border-top mt-2">
              <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={onSave}>
                {saving ? "Saving…" : "Save tier"}
              </button>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
                Cancel
              </button>
            </div>
          )}
          {ro && (
            <div className="pt-2 border-top mt-2">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
                Close
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="offcanvas-backdrop fade show" onClick={onClose} aria-hidden />
    </>
  );
}
