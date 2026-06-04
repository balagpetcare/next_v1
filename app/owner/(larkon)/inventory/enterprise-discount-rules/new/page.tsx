"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet, ownerPost } from "@/app/owner/_lib/ownerApi";
import { OWNER_PRICING_NAV } from "@/src/lib/ownerPricingNav";
import { EnterpriseRuleForm } from "../_components/EnterpriseRuleForm";
import { fetchEnterpriseRuleRow, parseUpsertBody } from "../_lib/enterpriseRulesApi";
import { governanceHintsForForm, hasBlockingErrors, validateRuleForm } from "../_lib/enterpriseRuleValidation";
import { emptyRuleForm, rowToForm, type RuleFormState } from "../_lib/enterpriseRulesTypes";
import { useEnterpriseRulesOrgResources } from "../_hooks/useEnterpriseRulesOrgResources";

export default function NewEnterpriseDiscountRulePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateFromRaw = searchParams.get("duplicateFrom");
  const duplicateFromId =
    duplicateFromRaw != null && String(duplicateFromRaw).trim() !== ""
      ? parseInt(String(duplicateFromRaw), 10)
      : NaN;
  const duplicateFromValid = Number.isFinite(duplicateFromId) && duplicateFromId > 0;

  const { orgId, permSet, sessionLoaded, error, setError, meta, branches, policy } = useEnterpriseRulesOrgResources();
  const [form, setForm] = useState<RuleFormState>(() => emptyRuleForm());
  const [saving, setSaving] = useState(false);
  const [dupPrefillError, setDupPrefillError] = useState<string | null>(null);
  const [dupPrefillDone, setDupPrefillDone] = useState(() => !duplicateFromValid);

  const canManage = useMemo(() => permSet.has("pricing.retail.rule.manage") || permSet.has("global.admin"), [permSet]);

  const validationIssues = useMemo(() => validateRuleForm(form), [form]);
  const govHints = useMemo(() => governanceHintsForForm(form, policy), [form, policy]);

  useEffect(() => {
    if (!duplicateFromValid || !orgId || !canManage || !sessionLoaded) {
      setDupPrefillDone(true);
      setDupPrefillError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setDupPrefillDone(false);
      setDupPrefillError(null);
      const { row, error: fetchErr } = await fetchEnterpriseRuleRow(ownerGet, orgId, duplicateFromId);
      if (cancelled) return;
      if (fetchErr) {
        setDupPrefillError(fetchErr);
        setDupPrefillDone(true);
        return;
      }
      if (!row) {
        setDupPrefillError("Source rule was not found or is not in this organization.");
        setDupPrefillDone(true);
        return;
      }
      const f = rowToForm(row);
      delete (f as { id?: number }).id;
      f.name = `${row.name} (copy)`;
      f.status = "DRAFT";
      setForm(f);
      setDupPrefillDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [duplicateFromValid, duplicateFromId, orgId, canManage, sessionLoaded]);

  const submit = useCallback(async () => {
    if (!orgId || !canManage) return;
    if (hasBlockingErrors(validationIssues)) return;
    setSaving(true);
    setError(null);
    try {
      await ownerPost("/api/v1/pricing/enterprise-discount/rules", parseUpsertBody(orgId, form));
      toast.success("Discount rule created");
      router.push(OWNER_PRICING_NAV.discountRules);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [orgId, canManage, validationIssues, form, router, setError]);

  if (!sessionLoaded) {
    return (
      <div className="dashboard-main-body">
        <PageHeader
          title="Create discount rule"
          subtitle="Loading…"
          breadcrumbs={[
            { label: "Owner", href: "/owner/dashboard" },
            { label: "Inventory", href: "/owner/inventory" },
            { label: "Enterprise rules", href: OWNER_PRICING_NAV.discountRules },
            { label: "Create", href: OWNER_PRICING_NAV.discountRulesNew },
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
          title="Create discount rule"
          subtitle="You do not have permission to create organization discount rules."
          breadcrumbs={[
            { label: "Owner", href: "/owner/dashboard" },
            { label: "Inventory", href: "/owner/inventory" },
            { label: "Enterprise rules", href: OWNER_PRICING_NAV.discountRules },
            { label: "Create", href: OWNER_PRICING_NAV.discountRulesNew },
          ]}
        />
        <div className="alert alert-warning">Requires <code>pricing.retail.rule.manage</code> (or global admin).</div>
        <Link className="btn btn-sm btn-outline-secondary" href={OWNER_PRICING_NAV.discountRules}>
          Back to rules
        </Link>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body pb-5">
      <PageHeader
        title="Create discount rule"
        subtitle="Define catalog list-price automation before POS discount validation. Works with Price Master, governance, campaigns, and membership. These rules do not overwrite canonical MRP in Price Master — they only change resolved list price at runtime."
        breadcrumbs={[
          { label: "Owner", href: "/owner/dashboard" },
          { label: "Inventory", href: "/owner/inventory" },
          { label: "Enterprise rules", href: OWNER_PRICING_NAV.discountRules },
          { label: "Create", href: OWNER_PRICING_NAV.discountRulesNew },
        ]}
        actions={[
          <Link key="back" className="btn btn-sm btn-outline-secondary" href={OWNER_PRICING_NAV.discountRules}>
            Back to list
          </Link>,
        ]}
      />

      {error && (
        <div className="alert alert-danger py-2 mb-3" role="alert">
          {error}
        </div>
      )}

      {duplicateFromValid && dupPrefillError && (
        <div className="alert alert-warning py-2 mb-3" role="alert">
          Could not copy from rule #{duplicateFromId}: {dupPrefillError}
        </div>
      )}

      {orgId && duplicateFromValid && !dupPrefillDone && (
        <div className="alert alert-secondary py-2 mb-3 small">Loading rule #{duplicateFromId} to pre-fill this draft…</div>
      )}

      {orgId && (
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
            <Link className="btn btn-outline-secondary" href={OWNER_PRICING_NAV.discountRules}>
              Cancel
            </Link>
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving || hasBlockingErrors(validationIssues) || (duplicateFromValid && !dupPrefillDone)}
              onClick={() => void submit()}
            >
              {saving ? "Saving…" : "Create rule"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
