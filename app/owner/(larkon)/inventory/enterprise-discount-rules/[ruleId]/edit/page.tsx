"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet, ownerPost } from "@/app/owner/_lib/ownerApi";
import { OWNER_PRICING_NAV } from "@/src/lib/ownerPricingNav";
import { EnterpriseRuleForm } from "../../_components/EnterpriseRuleForm";
import { fetchEnterpriseRuleRow, parseUpsertBody } from "../../_lib/enterpriseRulesApi";
import { governanceHintsForForm, hasBlockingErrors, validateRuleForm } from "../../_lib/enterpriseRuleValidation";
import { emptyRuleForm, rowToForm, type RuleFormState } from "../../_lib/enterpriseRulesTypes";
import { useEnterpriseRulesOrgResources } from "../../_hooks/useEnterpriseRulesOrgResources";

export default function EditEnterpriseDiscountRulePage() {
  const router = useRouter();
  const params = useParams();
  const rawId = params?.ruleId;
  const ruleIdStr = Array.isArray(rawId) ? rawId[0] : rawId;
  const ruleIdNum = ruleIdStr != null && String(ruleIdStr).trim() !== "" ? parseInt(String(ruleIdStr), 10) : NaN;
  const ruleIdValid = Number.isFinite(ruleIdNum) && ruleIdNum > 0;

  const { orgId, permSet, sessionLoaded, error, setError, meta, branches, policy } = useEnterpriseRulesOrgResources();
  const [form, setForm] = useState<RuleFormState>(() => emptyRuleForm());
  const [saving, setSaving] = useState(false);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ok" | "not_found" | "bad_id" | "load_error">(() =>
    ruleIdValid ? "idle" : "bad_id"
  );

  const canManage = useMemo(() => permSet.has("pricing.retail.rule.manage") || permSet.has("global.admin"), [permSet]);

  const validationIssues = useMemo(() => validateRuleForm(form), [form]);
  const govHints = useMemo(() => governanceHintsForForm(form, policy), [form, policy]);

  const editHrefSelf = ruleIdValid ? OWNER_PRICING_NAV.discountRuleEdit(ruleIdNum) : OWNER_PRICING_NAV.discountRules;
  const detailHref = ruleIdValid ? OWNER_PRICING_NAV.discountRuleDetail(ruleIdNum) : OWNER_PRICING_NAV.discountRules;
  const ruleCrumbLabel =
    loadState === "ok" && form.name.trim() ? form.name : ruleIdValid ? `Rule #${ruleIdNum}` : "Rule";
  const listAndRuleCrumbs = [
    { label: "Enterprise rules", href: OWNER_PRICING_NAV.discountRules },
    ...(ruleIdValid ? [{ label: ruleCrumbLabel, href: detailHref }] : []),
  ] as const;

  useEffect(() => {
    if (!ruleIdValid) {
      setLoadState("bad_id");
      return;
    }
    if (!sessionLoaded || !orgId || !canManage) return;

    let cancelled = false;
    (async () => {
      setLoadState("loading");
      setForm(emptyRuleForm());
      setError(null);
      const { row, error: fetchErr } = await fetchEnterpriseRuleRow(ownerGet, orgId, ruleIdNum);
      if (cancelled) return;
      if (fetchErr) {
        setError(fetchErr);
        setLoadState("load_error");
        return;
      }
      if (!row) {
        setLoadState("not_found");
        setForm(emptyRuleForm());
        return;
      }
      setForm(rowToForm(row));
      setLoadState("ok");
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionLoaded, orgId, canManage, ruleIdValid, ruleIdNum, setError]);

  const submit = useCallback(async () => {
    if (!orgId || !canManage || !ruleIdValid) return;
    if (hasBlockingErrors(validationIssues)) return;
    setSaving(true);
    setError(null);
    try {
      await ownerPost("/api/v1/pricing/enterprise-discount/rules", parseUpsertBody(orgId, form));
      toast.success("Rule saved");
      router.push(OWNER_PRICING_NAV.discountRuleDetail(ruleIdNum));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [orgId, canManage, ruleIdValid, ruleIdNum, validationIssues, form, router, setError]);

  if (!sessionLoaded) {
    return (
      <div className="dashboard-main-body">
        <PageHeader
          title="Edit discount rule"
          subtitle="Loading…"
          breadcrumbs={[
            { label: "Owner", href: "/owner/dashboard" },
            { label: "Inventory", href: "/owner/inventory" },
            ...listAndRuleCrumbs,
            { label: "Edit", href: editHrefSelf },
          ]}
        />
        <p className="text-muted small">Preparing organization context…</p>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="dashboard-main-body">
        <PageHeader
          title="Edit discount rule"
          subtitle="You do not have permission to edit organization discount rules."
          breadcrumbs={[
            { label: "Owner", href: "/owner/dashboard" },
            { label: "Inventory", href: "/owner/inventory" },
            ...listAndRuleCrumbs,
            { label: "Edit", href: editHrefSelf },
          ]}
        />
        <div className="alert alert-warning">Requires <code>pricing.retail.rule.manage</code> (or global admin).</div>
        <Link className="btn btn-sm btn-outline-secondary" href={OWNER_PRICING_NAV.discountRules}>
          Back to rules
        </Link>
      </div>
    );
  }

  if (loadState === "bad_id" || loadState === "not_found" || loadState === "load_error") {
    const title =
      loadState === "bad_id" ? "Invalid rule" : loadState === "load_error" ? "Unable to load rule" : "Rule not found";
    const body =
      loadState === "bad_id"
        ? "The link does not reference a valid numeric rule id."
        : loadState === "load_error"
          ? "Something went wrong while loading this rule. You can return to the list and try again."
          : "The rule may have been removed, or you may not have access to this organization.";
    return (
      <div className="dashboard-main-body">
        <PageHeader
          title="Edit discount rule"
          subtitle="This discount rule could not be loaded."
          breadcrumbs={[
            { label: "Owner", href: "/owner/dashboard" },
            { label: "Inventory", href: "/owner/inventory" },
            ...listAndRuleCrumbs,
            { label: "Edit", href: editHrefSelf },
          ]}
        />
        <div className="card radius-12">
          <div className="card-body py-5 text-center">
            <h5 className="mb-2">{title}</h5>
            <p className="text-muted small mb-4">{body}</p>
            {error && (
              <div className="alert alert-danger text-start small mx-auto mb-3" style={{ maxWidth: 480 }}>
                {error}
              </div>
            )}
            <Link className="btn btn-primary" href={OWNER_PRICING_NAV.discountRules}>
              Back to enterprise discount rules
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const loadingRule = loadState === "loading" || loadState === "idle";

  return (
    <div className="dashboard-main-body pb-5">
      <PageHeader
        title="Edit discount rule"
        subtitle="Pre-POS catalog list layer — priority, stackable, and dates control resolution order."
        breadcrumbs={[
          { label: "Owner", href: "/owner/dashboard" },
          { label: "Inventory", href: "/owner/inventory" },
          ...listAndRuleCrumbs,
          { label: "Edit", href: editHrefSelf },
        ]}
        actions={[
          <Link key="detail" className="btn btn-sm btn-outline-secondary" href={detailHref}>
            View rule
          </Link>,
          <Link key="back" className="btn btn-sm btn-outline-secondary" href={OWNER_PRICING_NAV.discountRules}>
            Back to list
          </Link>,
        ]}
      />

      {error && loadState === "ok" && (
        <div className="alert alert-danger py-2 mb-3" role="alert">
          {error}
        </div>
      )}

      {orgId && (
        <div className="row justify-content-center">
          <div className="col-12 col-xl-10">
            {loadingRule ? (
              <div className="card radius-12">
                <div className="card-body">
                  <p className="text-muted small mb-0">Loading rule…</p>
                </div>
              </div>
            ) : (
              <>
                <EnterpriseRuleForm
                  layout="page"
                  orgId={orgId}
                  meta={meta}
                  branches={branches}
                  form={form}
                  setForm={setForm}
                  issues={validationIssues}
                  hints={govHints}
                  readOnly={false}
                  ownerGet={ownerGet}
                />

                <div
                  className="border-top bg-white py-3 mt-4 d-flex flex-wrap gap-2 justify-content-end shadow-sm"
                  style={{ position: "sticky", bottom: 0, zIndex: 1020 }}
                >
                  <Link className="btn btn-outline-secondary" href={detailHref}>
                    Cancel
                  </Link>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={saving || hasBlockingErrors(validationIssues)}
                    onClick={() => void submit()}
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
