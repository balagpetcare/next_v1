"use client";

import { useCallback } from "react";
import type { BranchOption } from "../../price-master/_lib/priceMasterTypes";
import type { OrgMetaForRules, RuleFormState } from "../_lib/enterpriseRulesTypes";
import { labelDiscountMethod, labelRuleKind, labelScopeKind, labelStatus, labelTargetKind } from "../_lib/enterpriseRuleLabels";
import type { FieldIssue } from "../_lib/enterpriseRuleValidation";
import { EnterpriseVariantTargetPicker } from "./EnterpriseVariantTargetPicker";

type Layout = "drawer" | "page";

type Props = {
  layout: Layout;
  orgId: number | null;
  meta: OrgMetaForRules;
  branches: BranchOption[];
  form: RuleFormState;
  setForm: React.Dispatch<React.SetStateAction<RuleFormState>>;
  issues: FieldIssue[];
  hints: FieldIssue[];
  readOnly: boolean;
  ownerGet: <T>(path: string) => Promise<T | null>;
};

function Section({ title, layout, children }: { title: string; layout: Layout; children: React.ReactNode }) {
  if (layout === "page") {
    return (
      <div className="card radius-12 mb-3">
        <div className="card-body">
          <h6 className="text-uppercase text-muted small fw-bold mb-3">{title}</h6>
          {children}
        </div>
      </div>
    );
  }
  return (
    <section className="mb-4">
      <h6 className="text-uppercase text-muted small fw-bold mb-2">{title}</h6>
      {children}
    </section>
  );
}

export function EnterpriseRuleForm({ layout, orgId, meta, branches, form, setForm, issues, hints, readOnly, ownerGet }: Props) {
  const ro = readOnly;
  const blocking = issues.filter((i) => i.blocking);

  const syncRuleKind = useCallback(
    (tk: string) => {
      if (tk === "BRAND" || tk === "CATEGORY" || tk === "VARIANT") setForm((f) => ({ ...f, ruleKind: tk }));
      else if (tk === "ALL_PRODUCTS") setForm((f) => ({ ...f, ruleKind: "OTHER", targetId: "" }));
    },
    [setForm]
  );

  const rowClass = layout === "page" ? "row g-3" : "row g-2";

  return (
    <>
      {blocking.length > 0 && (
        <div className={layout === "page" ? "alert alert-danger py-2 small mb-3" : "alert alert-danger py-2 small"}>
          {blocking.map((e, i) => (
            <div key={i}>{e.message}</div>
          ))}
        </div>
      )}
      {hints.map((h, i) => (
        <div key={`h-${i}`} className={`alert alert-warning py-2 small ${layout === "page" ? "mb-3" : ""}`}>
          {h.message}
        </div>
      ))}

      <Section title="Basic" layout={layout}>
        <div className={rowClass}>
          <div className={layout === "page" ? "col-lg-8" : "col-12"}>
            <label className="form-label small">Rule name</label>
            <input
              className="form-control form-control-sm"
              disabled={ro}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className={layout === "page" ? "col-lg-4" : "col-12"}>
            <label className="form-label small">Lifecycle status</label>
            <select className="form-select form-select-sm" disabled={ro} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="DRAFT">{labelStatus("DRAFT")}</option>
              <option value="ACTIVE">{labelStatus("ACTIVE")}</option>
              <option value="PAUSED">{labelStatus("PAUSED")}</option>
              <option value="INACTIVE">{labelStatus("INACTIVE")}</option>
              <option value="ARCHIVED">{labelStatus("ARCHIVED")}</option>
            </select>
            <div className="form-text">Only Active rules participate in automated list resolution for in-window dates.</div>
          </div>
        </div>
      </Section>

      <Section title="Scope / applicability" layout={layout}>
        <div className={rowClass}>
          <div className={layout === "page" ? "col-md-6" : "col-12"}>
            <label className="form-label small">Organization scope</label>
            <select
              className="form-select form-select-sm"
              disabled={ro}
              value={form.scopeKind}
              onChange={(e) => setForm((f) => ({ ...f, scopeKind: e.target.value as RuleFormState["scopeKind"], scopeBranchId: "" }))}
            >
              <option value="ORG_WIDE">{labelScopeKind("ORG_WIDE")}</option>
              <option value="BRANCH_SPECIFIC">{labelScopeKind("BRANCH_SPECIFIC")}</option>
            </select>
          </div>
          {form.scopeKind === "BRANCH_SPECIFIC" && (
            <div className={layout === "page" ? "col-md-6" : "col-12"}>
              <label className="form-label small">Branch</label>
              <select
                className="form-select form-select-sm"
                disabled={ro}
                value={form.scopeBranchId}
                onChange={(e) => setForm((f) => ({ ...f, scopeBranchId: e.target.value }))}
              >
                <option value="">Select branch…</option>
                {branches.map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Section>

      <Section title="Catalog target" layout={layout}>
        <div className={rowClass}>
          <div className={layout === "page" ? "col-md-6" : "col-12"}>
            <label className="form-label small">Applies to</label>
            <select
              className="form-select form-select-sm"
              disabled={ro}
              value={form.targetKind}
              onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({ ...f, targetKind: v, targetId: v === "ALL_PRODUCTS" ? "" : f.targetId }));
                syncRuleKind(v);
              }}
            >
              <option value="VARIANT">{labelTargetKind("VARIANT")}</option>
              <option value="BRAND">{labelTargetKind("BRAND")}</option>
              <option value="CATEGORY">{labelTargetKind("CATEGORY")}</option>
              <option value="ALL_PRODUCTS">{labelTargetKind("ALL_PRODUCTS")}</option>
            </select>
          </div>
          <div className={layout === "page" ? "col-md-6" : "col-12"}>
            <label className="form-label small">Rule classification</label>
            <select className="form-select form-select-sm" disabled={ro} value={form.ruleKind} onChange={(e) => setForm((f) => ({ ...f, ruleKind: e.target.value }))}>
              {["VARIANT", "BRAND", "CATEGORY", "INVOICE_SLAB", "BUNDLE", "OTHER"].map((k) => (
                <option key={k} value={k}>
                  {labelRuleKind(k)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {form.targetKind === "CATEGORY" && (
          <div className="mt-2">
            <label className="form-label small">Category</label>
            <select
              className="form-select form-select-sm"
              disabled={ro}
              value={form.targetId}
              onChange={(e) => setForm((f) => ({ ...f, targetId: e.target.value }))}
            >
              <option value="">Select…</option>
              {meta.categories.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {form.targetKind === "BRAND" && (
          <div className="mt-2">
            <label className="form-label small">Brand</label>
            <select
              className="form-select form-select-sm"
              disabled={ro}
              value={form.targetId}
              onChange={(e) => setForm((f) => ({ ...f, targetId: e.target.value }))}
            >
              <option value="">Select…</option>
              {(meta.brands ?? []).map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
            {(meta.brands ?? []).length === 0 && (
              <div className="form-text text-warning">No brands found on catalog products. Assign brands on products or use advanced options under a variant target.</div>
            )}
          </div>
        )}

        {form.targetKind === "VARIANT" && (
          <div className="mt-2">
            <EnterpriseVariantTargetPicker orgId={orgId} readOnly={ro} form={form} setForm={setForm} ownerGet={ownerGet} />
          </div>
        )}

        {form.targetKind === "ALL_PRODUCTS" && (
          <p className="small text-muted mt-2 mb-0">No catalog target id — this rule evaluates for every variant after higher-priority targeted rules.</p>
        )}
      </Section>

      <Section title="Discount" layout={layout}>
        <div className={rowClass}>
          <div className="col-md-6">
            <label className="form-label small">Method</label>
            <select
              className="form-select form-select-sm"
              disabled={ro}
              value={form.discountMethod}
              onChange={(e) => setForm((f) => ({ ...f, discountMethod: e.target.value }))}
            >
              <option value="PERCENT">{labelDiscountMethod("PERCENT")}</option>
              <option value="FIXED_AMOUNT">{labelDiscountMethod("FIXED_AMOUNT")}</option>
              <option value="FIXED_PRICE">{labelDiscountMethod("FIXED_PRICE")}</option>
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label small">Value</label>
            <input
              className="form-control form-control-sm"
              disabled={ro}
              value={form.discountValue}
              onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label small">Max discount cap (optional)</label>
            <input
              className="form-control form-control-sm"
              disabled={ro}
              value={form.maxCapAmount}
              onChange={(e) => setForm((f) => ({ ...f, maxCapAmount: e.target.value }))}
            />
            <div className="form-text">Caps absolute discount amount off list for this step.</div>
          </div>
          <div className="col-md-6">
            <label className="form-label small">Min quantity (optional)</label>
            <input
              className="form-control form-control-sm"
              disabled={ro}
              value={form.minQtyForSlab}
              onChange={(e) => setForm((f) => ({ ...f, minQtyForSlab: e.target.value }))}
            />
            <div className="form-text">Stored for future slab workflows; list engine may ignore if unsupported.</div>
          </div>
        </div>
      </Section>

      <Section title="Dates / schedule" layout={layout}>
        <div className={rowClass}>
          <div className="col-md-6">
            <label className="form-label small">Active from</label>
            <input
              type="datetime-local"
              className="form-control form-control-sm"
              disabled={ro}
              value={form.validFrom}
              onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))}
            />
            <div className="form-text">Leave blank to default to “now” on create.</div>
          </div>
          <div className="col-md-6">
            <label className="form-label small">Active until</label>
            <input
              type="datetime-local"
              className="form-control form-control-sm"
              disabled={ro}
              value={form.validTo}
              onChange={(e) => setForm((f) => ({ ...f, validTo: e.target.value }))}
            />
            <div className="form-text">Leave blank for open-ended.</div>
          </div>
        </div>
      </Section>

      <Section title="Priority / stackability" layout={layout}>
        <div className={rowClass}>
          <div className="col-md-6">
            <label className="form-label small">Priority</label>
            <input
              className="form-control form-control-sm"
              disabled={ro}
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            />
            <div className="form-text">Lower runs first. After a non-stackable rule, later rules do not apply.</div>
          </div>
          <div className="col-md-6 d-flex align-items-center">
            <div className="form-check mt-3">
              <input
                id="stack-er"
                type="checkbox"
                className="form-check-input"
                disabled={ro}
                checked={form.stackable}
                onChange={(e) => setForm((f) => ({ ...f, stackable: e.target.checked }))}
              />
              <label htmlFor="stack-er" className="form-check-label small">
                Stackable — allow subsequent rules to continue
              </label>
            </div>
          </div>
          <div className="col-12">
            <div className="form-check">
              <input
                id="reqAppr-er"
                type="checkbox"
                className="form-check-input"
                disabled={ro}
                checked={form.requiresApproval}
                onChange={(e) => setForm((f) => ({ ...f, requiresApproval: e.target.checked }))}
              />
              <label htmlFor="reqAppr-er" className="form-check-label small">
                Mark as requiring approval (governance / POS policy dependent)
              </label>
            </div>
          </div>
        </div>
      </Section>

      {layout === "page" && (
        <Section title="Validation & governance notes" layout={layout}>
          <p className="small text-muted mb-0">
            Blocking issues are listed at the top. Governance warnings appear above when applicable. After saving, use the rules list to review overlap hints among
            rules on the same scope and target.
          </p>
        </Section>
      )}

      {layout === "page" && (
        <Section title="Review" layout={layout}>
          <div className="row g-2 small">
            <div className="col-sm-6">
              <span className="text-muted">Name</span>
              <div className="fw-semibold">{form.name.trim() || "—"}</div>
            </div>
            <div className="col-sm-6">
              <span className="text-muted">Target</span>
              <div className="fw-semibold">
                {labelTargetKind(form.targetKind)}
                {form.targetKind !== "ALL_PRODUCTS" && form.targetId ? <span className="text-muted fw-normal"> (catalog ref. set)</span> : null}
              </div>
            </div>
            <div className="col-sm-6">
              <span className="text-muted">Discount</span>
              <div className="fw-semibold">
                {labelDiscountMethod(form.discountMethod)} {form.discountValue}
              </div>
            </div>
            <div className="col-sm-6">
              <span className="text-muted">Priority / stack</span>
              <div className="fw-semibold">
                {form.priority} / {form.stackable ? "stackable" : "non-stackable"}
              </div>
            </div>
          </div>
        </Section>
      )}
    </>
  );
}
