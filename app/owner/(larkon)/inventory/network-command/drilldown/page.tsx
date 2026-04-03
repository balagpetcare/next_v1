"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, Suspense } from "react";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { getExecutiveTowerDrilldown, ownerGet } from "@/app/owner/_lib/ownerApi";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

type BranchRow = { org?: { id: number } };

function DrilldownInner() {
  const search = useSearchParams();
  const kpiKey = search.get("kpiKey") || "";
  const orgIdParam = search.get("orgId");
  const parsedOrg = orgIdParam ? Number(orgIdParam) : NaN;
  const [orgId, setOrgId] = useState<number | null>(Number.isFinite(parsedOrg) ? parsedOrg : null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!kpiKey) setLoading(false);
  }, [kpiKey]);

  useEffect(() => {
    if (Number.isFinite(parsedOrg)) {
      setOrgId(parsedOrg);
      return;
    }
    (async () => {
      try {
        const brRes = await ownerGet<{ data?: BranchRow[] }>("/api/v1/owner/branches");
        const rows = (brRes as { data?: BranchRow[] })?.data;
        const oid = Array.isArray(rows) && rows[0]?.org?.id ? rows[0].org.id : null;
        setOrgId(oid);
      } catch {
        setOrgId(null);
      }
    })();
  }, [parsedOrg]);

  const load = useCallback(async () => {
    if (!orgId || !kpiKey) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getExecutiveTowerDrilldown({ orgId, kpiKey, take: 60 });
      const payload = (res as { data?: Record<string, unknown> })?.data ?? res;
      setData((payload as Record<string, unknown>) ?? null);
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
    } finally {
      setLoading(false);
    }
  }, [orgId, kpiKey]);

  useEffect(() => {
    if (orgId && kpiKey) load();
  }, [orgId, kpiKey, load]);

  const rows = (data?.rows as Record<string, unknown>[]) ?? [];
  const cols = (data?.columns as string[]) ?? [];

  return (
    <>
      <PageHeader title="KPI drill-down" subtitle={kpiKey || "Select kpiKey"} />
      {!kpiKey && <div className="alert alert-warning">Missing <code>kpiKey</code> query parameter. Open drill-down from the overview.</div>}
      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center flex-wrap gap-2">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => load()} disabled={!kpiKey || !orgId}>
            Retry
          </button>
        </div>
      )}
      {loading && <p className="text-muted">Loading…</p>}
      {!loading && data?.message && <p className="text-muted">{String(data.message)}</p>}
      {!loading && data?.explain && <p className="small text-muted">{String(data.explain)}</p>}
      {!loading && kpiKey && rows.length === 0 && !data?.message && (
        <p className="text-muted">No rows returned for this KPI.</p>
      )}
      {!loading && rows.length > 0 && (
        <div className="table-responsive">
          <table className="table table-sm table-bordered">
            <thead>
              <tr>
                {cols.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {cols.map((c) => (
                    <td key={c}>{formatCell(r[c])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Link href="/owner/inventory/network-command" className="btn btn-link">
        ← Back to overview
      </Link>
    </>
  );
}

function formatCell(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export default function DrilldownPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <DrilldownInner />
    </Suspense>
  );
}
