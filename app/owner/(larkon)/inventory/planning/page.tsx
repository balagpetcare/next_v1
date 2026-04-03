"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet, getAiControlTowerOverview, getAiPlanningAlerts } from "@/app/owner/_lib/ownerApi";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

type BranchRow = { id: number; name?: string; org?: { id: number; name?: string } };

function pickBranches(resp: unknown): BranchRow[] {
  if (!resp || typeof resp !== "object") return [];
  const r = resp as { data?: unknown };
  const d = r.data;
  return Array.isArray(d) ? (d as BranchRow[]) : [];
}

export default function InventoryPlanningHubPage() {
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [orgId, setOrgId] = useState<number | null>(null);
  const [tower, setTower] = useState<Record<string, unknown> | null>(null);
  const [alerts, setAlerts] = useState<{ alerts?: unknown[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const brRes = await ownerGet<{ data?: BranchRow[] }>("/api/v1/owner/branches");
      const brs = pickBranches(brRes);
      setBranches(brs);
      const oid = brs[0]?.org?.id ?? null;
      setOrgId(oid);
      if (oid) {
        const [t, a] = await Promise.all([
          getAiControlTowerOverview({ orgId: oid }),
          getAiPlanningAlerts({ orgId: oid }),
        ]);
        const tr = t as { data?: Record<string, unknown> } | null | undefined;
        const ar = a as { data?: { alerts?: unknown[] } } | null | undefined;
        setTower(tr?.data ?? null);
        setAlerts(ar?.data ?? null);
      } else {
        setTower(null);
        setAlerts(null);
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

  const kpis = tower?.kpis as Record<string, number> | undefined;

  return (
    <div className="container-fluid py-4">
      <PageHeader title="Supply planning" subtitle="Demand forecast, replenishment queue, procurement intelligence — review before action." />
      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <p className="text-muted">Loading…</p>}

      {!loading && orgId == null && (
        <div className="alert alert-warning">No branches found — add a branch to use planning tools.</div>
      )}

      {orgId != null && (
        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small">Critical replenishment</div>
                <div className="fs-3 fw-semibold">{kpis?.criticalReplenishmentLines ?? "—"}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small">Forecast snapshots</div>
                <div className="fs-3 fw-semibold">{kpis?.forecastSnapshots ?? "—"}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small">Low-confidence forecasts</div>
                <div className="fs-3 fw-semibold">{kpis?.lowConfidenceForecasts ?? "—"}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small">Branches monitored</div>
                <div className="fs-3 fw-semibold">{kpis?.branchesMonitored ?? branches.length}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row g-3">
        <div className="col-md-6 col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">Demand forecast</h5>
              <p className="card-text text-muted small">
                Ledger-based demand, confidence, and optional warehouse scope. Explanations ship with each row.
              </p>
              <Link href="/owner/inventory/planning/forecast" className="btn btn-primary btn-sm">
                Open forecast
              </Link>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">Replenishment queue</h5>
              <p className="card-text text-muted small">
                ROP and service-level logic. Accept creates a draft stock request only.
              </p>
              <Link href="/owner/inventory/planning/replenishment" className="btn btn-primary btn-sm">
                Open queue
              </Link>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">Procurement center</h5>
              <p className="card-text text-muted small">
                Vendor ranking from GRN history, lead time, and shortage context.
              </p>
              <Link href="/owner/inventory/planning/procurement" className="btn btn-primary btn-sm">
                Open procurement
              </Link>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">Network balance</h5>
              <p className="card-text text-muted small">
                Imbalance snapshots and transfer recommendations across branches and DC — review before moving stock.
              </p>
              <Link href="/owner/inventory/network-balance" className="btn btn-primary btn-sm">
                Open network balance
              </Link>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">Financial intelligence</h5>
              <p className="card-text text-muted small">
                Cost-to-serve from GRN unit costs, explainable facts, and branch/SKU rollups (management view).
              </p>
              <Link href="/owner/inventory/financial-intelligence" className="btn btn-primary btn-sm">
                Open CTS dashboard
              </Link>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">SLA &amp; service</h5>
              <p className="card-text text-muted small">
                Dispatch timeliness and discrepancy SLO measurements vs targets.
              </p>
              <Link href="/owner/inventory/sla-dashboard" className="btn btn-primary btn-sm">
                Open SLA dashboard
              </Link>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">Network command (Wave-5)</h5>
              <p className="card-text text-muted small">
                Executive KPIs, drill-downs, decision packages, and what-if scenarios — read-only analytics with governance.
              </p>
              <Link href="/owner/inventory/network-command" className="btn btn-primary btn-sm">
                Open network command
              </Link>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">Exception command center</h5>
              <p className="card-text text-muted small">
                Unified triage for dispatch discrepancies, recalls, and stuck stock requests.
              </p>
              <Link href="/owner/operations/command-center" className="btn btn-primary btn-sm">
                Open command center
              </Link>
            </div>
          </div>
        </div>
      </div>

      {alerts?.alerts && alerts.alerts.length > 0 && (
        <div className="mt-4">
          <h5 className="mb-2">Recent alerts</h5>
          <ul className="list-group">
            {(alerts.alerts as { id?: string; severity?: string; title?: string; detail?: string }[])
              .slice(0, 8)
              .map((x) => (
                <li key={x.id ?? x.title} className="list-group-item d-flex justify-content-between align-items-start">
                  <div>
                    <span
                      className={`badge me-2 ${x.severity === "HIGH" ? "bg-danger" : x.severity === "MEDIUM" ? "bg-warning text-dark" : "bg-secondary"}`}
                    >
                      {x.severity}
                    </span>
                    <strong>{x.title}</strong>
                    <div className="small text-muted">{x.detail}</div>
                  </div>
                </li>
              ))}
          </ul>
          <button type="button" className="btn btn-link btn-sm px-0 mt-2" onClick={load}>
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
