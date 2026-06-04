"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import { OWNER_PRICING_NAV } from "@/src/lib/ownerPricingNav";
import { EnterpriseRuleDetailSummary } from "../_components/EnterpriseRuleDetailSummary";
import { fetchEnterpriseRuleRow } from "../_lib/enterpriseRulesApi";
import type { EnterpriseRuleRow } from "../_lib/enterpriseRulesTypes";
import { useEnterpriseRulesOrgResources } from "../_hooks/useEnterpriseRulesOrgResources";

export default function EnterpriseDiscountRuleDetailPage() {
  const params = useParams();
  const rawId = params?.ruleId;
  const ruleIdStr = Array.isArray(rawId) ? rawId[0] : rawId;
  const ruleIdNum = ruleIdStr != null && String(ruleIdStr).trim() !== "" ? parseInt(String(ruleIdStr), 10) : NaN;
  const ruleIdValid = Number.isFinite(ruleIdNum) && ruleIdNum > 0;

  const { orgId, permSet, sessionLoaded, error, setError } = useEnterpriseRulesOrgResources();
  const [row, setRow] = useState<EnterpriseRuleRow | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ok" | "not_found" | "bad_id" | "load_error">(() =>
    ruleIdValid ? "idle" : "bad_id"
  );

  const canList = useMemo(
    () =>
      permSet.has("org.read") ||
      permSet.has("pricing.audit.view") ||
      permSet.has("pricing.retail.rule.manage") ||
      permSet.has("pricing.central.read") ||
      permSet.has("global.admin"),
    [permSet]
  );
  const canManage = useMemo(() => permSet.has("pricing.retail.rule.manage") || permSet.has("global.admin"), [permSet]);

  const detailHref = ruleIdValid ? OWNER_PRICING_NAV.discountRuleDetail(ruleIdNum) : OWNER_PRICING_NAV.discountRules;

  useEffect(() => {
    if (!ruleIdValid) {
      setLoadState("bad_id");
      return;
    }
    if (!sessionLoaded || !orgId || !canList) return;

    let cancelled = false;
    (async () => {
      setLoadState("loading");
      setRow(null);
      setError(null);
      const { row: r, error: err } = await fetchEnterpriseRuleRow(ownerGet, orgId, ruleIdNum);
      if (cancelled) return;
      if (err) {
        setError(err);
        setLoadState("load_error");
        return;
      }
      if (!r) {
        setLoadState("not_found");
        return;
      }
      setRow(r);
      setLoadState("ok");
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionLoaded, orgId, canList, ruleIdValid, ruleIdNum, setError]);

  if (!sessionLoaded) {
    return (
      <div className="dashboard-main-body">
        <PageHeader
          title="Discount rule"
          subtitle="Loading…"
          breadcrumbs={[
            { label: "Owner", href: "/owner/dashboard" },
            { label: "Inventory", href: "/owner/inventory" },
            { label: "Enterprise rules", href: OWNER_PRICING_NAV.discountRules },
            { label: "Rule", href: detailHref },
          ]}
        />
        <p className="text-muted small">Preparing organization context…</p>
      </div>
    );
  }

  if (!canList) {
    return (
      <div className="dashboard-main-body">
        <PageHeader
          title="Discount rule"
          subtitle="You do not have permission to view organization discount rules."
          breadcrumbs={[
            { label: "Owner", href: "/owner/dashboard" },
            { label: "Inventory", href: "/owner/inventory" },
            { label: "Enterprise rules", href: OWNER_PRICING_NAV.discountRules },
          ]}
        />
        <div className="alert alert-warning">Required: organization read, pricing audit view, pricing central read, or retail rule manage.</div>
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
          title="Discount rule"
          subtitle="This discount rule could not be loaded."
          breadcrumbs={[
            { label: "Owner", href: "/owner/dashboard" },
            { label: "Inventory", href: "/owner/inventory" },
            { label: "Enterprise rules", href: OWNER_PRICING_NAV.discountRules },
            { label: "Rule", href: detailHref },
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
        title={row?.name ?? "Discount rule"}
        subtitle="Pre-POS catalog list layer — priority, stackable, and dates control resolution order. This rule adjusts resolved catalog list price before POS discount validation; it does not overwrite canonical MRP in Price Master."
        breadcrumbs={[
          { label: "Owner", href: "/owner/dashboard" },
          { label: "Inventory", href: "/owner/inventory" },
          { label: "Enterprise rules", href: OWNER_PRICING_NAV.discountRules },
          { label: row?.name ?? "Rule", href: detailHref },
        ]}
        actions={[
          <Link key="back" className="btn btn-sm btn-outline-secondary" href={OWNER_PRICING_NAV.discountRules}>
            Back to list
          </Link>,
          ...(canManage && ruleIdValid
            ? [
                <Link key="edit" className="btn btn-sm btn-primary" href={OWNER_PRICING_NAV.discountRuleEdit(ruleIdNum)}>
                  Edit rule
                </Link>,
              ]
            : []),
        ]}
      />

      <div className="row justify-content-center">
        <div className="col-12 col-xl-10">
          {loadingRule || !row ? (
            <div className="card radius-12">
              <div className="card-body">
                <p className="text-muted small mb-0">Loading rule…</p>
              </div>
            </div>
          ) : (
            <EnterpriseRuleDetailSummary row={row} />
          )}
        </div>
      </div>

      {!loadingRule && row && (
        <div className="row justify-content-center mt-3">
          <div className="col-12 col-xl-10 d-flex flex-wrap gap-2">
            <Link className="btn btn-outline-secondary" href={OWNER_PRICING_NAV.discountRules}>
              Back to list
            </Link>
            {canManage && (
              <Link className="btn btn-primary" href={OWNER_PRICING_NAV.discountRuleEdit(row.id)}>
                Edit rule
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
