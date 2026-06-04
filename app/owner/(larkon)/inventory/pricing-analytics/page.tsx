"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import { OWNER_PRICING_NAV } from "@/src/lib/ownerPricingNav";

function pickOrgId(me: unknown): number | null {
  const m = me as Record<string, unknown>;
  const orgs = (m.organizations ?? (m.data as Record<string, unknown>)?.organizations) as { id?: number }[] | undefined;
  const id = orgs?.[0]?.id;
  return id != null && Number.isFinite(Number(id)) ? Number(id) : null;
}

export default function PricingAnalyticsPage() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await ownerGet<unknown>("/api/v1/owner/me");
        let oid = pickOrgId(me);
        if (oid == null) {
          const orgs = await ownerGet<{ data?: { id: number }[] }>("/api/v1/owner/organizations");
          oid = (orgs as any)?.data?.[0]?.id ?? null;
        }
        setOrgId(oid);
        if (oid) {
          const s = await ownerGet<{ data?: Record<string, unknown> }>(`/api/v1/pricing/analytics/summary?orgId=${oid}`);
          setSummary(((s as any)?.data as Record<string, unknown>) ?? null);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Pricing Analytics"
        subtitle="Snapshot counts and active configuration KPIs. Per-order traces: GET /api/v1/pricing/orders/:orderId/snapshots?orgId="
        breadcrumbs={[
          { label: "Owner", href: "/owner/dashboard" },
          { label: "Inventory", href: "/owner/inventory" },
          { label: "Analytics", href: OWNER_PRICING_NAV.analytics },
        ]}
      />
      <div className="d-flex flex-wrap gap-2 mb-3 small">
        <Link className="btn btn-sm btn-outline-secondary" href={OWNER_PRICING_NAV.governance}>
          Governance
        </Link>
        <Link className="btn btn-sm btn-outline-secondary" href={OWNER_PRICING_NAV.priceMaster}>
          Price master
        </Link>
      </div>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {loading && <p className="text-muted small">Loading…</p>}
      {summary && (
        <div className="row g-3">
          {["snapshotsLast30Days", "activeCampaigns", "activeEnterpriseRules", "activeMembershipTiers"].map((k) => (
            <div className="col-md-3" key={k}>
              <div className="card radius-12 h-100">
                <div className="card-body">
                  <div className="text-muted text-uppercase small">{k.replace(/([A-Z])/g, " $1")}</div>
                  <div className="fs-4 fw-semibold">{String(summary[k] ?? "—")}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
