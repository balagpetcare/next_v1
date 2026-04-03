"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { getExecutiveTowerOverview, ownerGet } from "@/app/owner/_lib/ownerApi";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

type BranchRow = { id: number; org?: { id: number } };

function pickOrgId(resp: unknown): number | null {
  if (!resp || typeof resp !== "object") return null;
  const r = resp as { data?: BranchRow[] };
  const rows = r.data;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0]?.org?.id ?? null;
}

export default function NetworkCommandOverviewPage() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const brRes = await ownerGet<{ data?: BranchRow[] }>("/api/v1/owner/branches");
      const oid = pickOrgId(brRes);
      setOrgId(oid);
      if (oid) {
        const res = await getExecutiveTowerOverview({ orgId: oid });
        const payload = (res as { data?: Record<string, unknown> })?.data ?? res;
        setOverview((payload as Record<string, unknown>) ?? null);
      } else {
        setOverview(null);
      }
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = (overview?.kpis as Array<Record<string, unknown>>) ?? [];
  const alerts = (overview?.alerts as Array<Record<string, unknown>>) ?? [];
  const pending = (overview?.decisionPackages as { pendingCount?: number })?.pendingCount ?? 0;
  const explain = overview?.explain as Record<string, unknown> | undefined;

  return (
    <>
      <PageHeader
        title="Network command"
        subtitle="Unified KPIs across forecast, replenishment, fulfillment, inbound, reverse logistics, and SLA signals. Read-only analytics; actions route through existing workflows."
      />
      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center flex-wrap gap-2">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => load()}>
            Retry
          </button>
        </div>
      )}
      {loading && <p className="text-muted">Loading…</p>}

      {!loading && orgId == null && (
        <div className="alert alert-warning">No organization context — add a branch first.</div>
      )}

      {!loading && orgId != null && (
        <>
          <div className="row g-2 mb-3">
            <div className="col-auto">
              <Link href="/owner/inventory/network-command/recommendations" className="btn btn-primary btn-sm">
                Decision packages ({pending})
              </Link>
            </div>
            <div className="col-auto">
              <Link href="/owner/inventory/network-command/scenarios/new" className="btn btn-outline-primary btn-sm">
                New scenario run
              </Link>
            </div>
            <div className="col-auto">
              <Link href="/owner/inventory/planning" className="btn btn-outline-secondary btn-sm">
                Supply planning hub
              </Link>
            </div>
          </div>

          <div className="row g-3 mb-4">
            {kpis.map((k) => (
              <div className="col-md-6 col-lg-4" key={String(k.kpiKey)}>
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <div className="text-muted small">{String(k.label ?? k.kpiKey)}</div>
                    <div className="fs-4 fw-semibold">
                      {String(k.value ?? "—")}
                      {k.unit === "percent" ? "%" : ""}
                    </div>
                    <p className="small text-muted mt-2 mb-1">{String(k.explainTemplate ?? "")}</p>
                    {(() => {
                      const rh = (k.drilldown as { routeHint?: string } | undefined)?.routeHint;
                      return rh ? (
                        <Link href={rh} className="small">
                          Related UI →
                        </Link>
                      ) : null;
                    })()}
                    <div className="mt-2">
                      <Link
                        className="btn btn-sm btn-outline-secondary"
                        href={`/owner/inventory/network-command/drilldown?kpiKey=${encodeURIComponent(String(k.kpiKey))}&orgId=${orgId}`}
                      >
                        Drill down
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white fw-semibold">Correlated risk feed</div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th>Code</th>
                      <th>Title</th>
                      <th>Route</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-muted">
                          No correlated alerts.
                        </td>
                      </tr>
                    )}
                    {alerts.map((a, i) => (
                      <tr key={i}>
                        <td>{String(a.severity ?? "—")}</td>
                        <td>
                          <code className="small">{String(a.code ?? "—")}</code>
                        </td>
                        <td>{String(a.title ?? a.message ?? "—")}</td>
                        <td>
                          {a.routeHint ? (
                            <Link href={String(a.routeHint)} className="small">
                              Open
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <p className="small text-muted">
            Engine: {String(explain?.engineVersion ?? "—")}. {String(explain?.note ?? "")}
          </p>
        </>
      )}
    </>
  );
}
