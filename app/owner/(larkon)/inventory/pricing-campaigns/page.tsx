"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet, ownerPost, ownerPatch } from "@/app/owner/_lib/ownerApi";
import { OWNER_PRICING_NAV } from "@/src/lib/ownerPricingNav";

function pickOrgId(me: unknown): number | null {
  const m = me as Record<string, unknown>;
  const orgs = (m.organizations ?? (m.data as Record<string, unknown>)?.organizations) as { id?: number }[] | undefined;
  const id = orgs?.[0]?.id;
  return id != null && Number.isFinite(Number(id)) ? Number(id) : null;
}

export default function PricingCampaignsPage() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", discountMethod: "PERCENT", discountValue: "10", startDate: "", endDate: "" });

  const load = useCallback(async () => {
    if (!orgId) return;
    const res = await ownerGet<{ data?: any[] }>(`/api/v1/pricing/campaigns?orgId=${orgId}`);
    setRows(Array.isArray((res as any)?.data) ? (res as any).data : []);
  }, [orgId]);

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
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (orgId) void load().catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [orgId, load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setError(null);
    try {
      await ownerPost("/api/v1/pricing/campaigns", {
        orgId,
        name: form.name,
        discountMethod: form.discountMethod,
        discountValue: parseFloat(form.discountValue),
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        status: "DRAFT",
      });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  async function setStatus(id: number, status: string) {
    if (!orgId) return;
    try {
      await ownerPatch(`/api/v1/pricing/campaigns/${id}`, { orgId, status });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Campaigns"
        subtitle="Create campaigns, move DRAFT → ACTIVE when in window. Scopes can be added via API body scopes[] on upsert."
        breadcrumbs={[
          { label: "Owner", href: "/owner/dashboard" },
          { label: "Inventory", href: "/owner/inventory" },
          { label: "Campaigns", href: OWNER_PRICING_NAV.campaigns },
        ]}
      />
      <div className="d-flex flex-wrap gap-2 mb-3 small">
        <Link className="btn btn-sm btn-outline-secondary" href={OWNER_PRICING_NAV.governance}>
          Governance
        </Link>
      </div>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {loading && <p className="text-muted small">Loading…</p>}
      {orgId && (
        <>
          <div className="card radius-12 mb-3">
            <div className="card-body small">
              <h6 className="card-title">New campaign</h6>
              <form className="row g-2" onSubmit={create}>
                <div className="col-md-3">
                  <label className="form-label">Name</label>
                  <input className="form-control form-control-sm" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Method</label>
                  <select className="form-select form-select-sm" value={form.discountMethod} onChange={(e) => setForm({ ...form, discountMethod: e.target.value })}>
                    <option value="PERCENT">%</option>
                    <option value="FIXED_AMOUNT">Amount</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label">Value</label>
                  <input className="form-control form-control-sm" required value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Start</label>
                  <input className="form-control form-control-sm" type="datetime-local" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div className="col-md-2">
                  <label className="form-label">End</label>
                  <input className="form-control form-control-sm" type="datetime-local" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
                <div className="col-12">
                  <button className="btn btn-primary btn-sm" type="submit">
                    Create draft
                  </button>
                </div>
              </form>
            </div>
          </div>
          <div className="card radius-12">
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Window</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id}>
                      <td className="small">{c.name}</td>
                      <td className="small">{c.status}</td>
                      <td className="small">
                        {new Date(c.startDate).toLocaleString()} → {new Date(c.endDate).toLocaleString()}
                      </td>
                      <td className="text-end small">
                        {c.status !== "ACTIVE" && (
                          <button type="button" className="btn btn-sm btn-outline-success me-1" onClick={() => setStatus(c.id, "ACTIVE")}>
                            Activate
                          </button>
                        )}
                        {c.status === "ACTIVE" && (
                          <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => setStatus(c.id, "PAUSED")}>
                            Pause
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
