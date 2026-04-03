"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet, getSloDefinitions, getSloMeasurements } from "@/app/owner/_lib/ownerApi";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

type BranchRow = { id: number; org?: { id: number } };

function pickBranches(resp: unknown): BranchRow[] {
  if (!resp || typeof resp !== "object") return [];
  const r = resp as { data?: unknown };
  return Array.isArray(r.data) ? (r.data as BranchRow[]) : [];
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function SlaDashboardPage() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [from, setFrom] = useState(() => isoDate(new Date(Date.now() - 30 * 86400000)));
  const [to, setTo] = useState(() => isoDate(new Date()));
  const [definitions, setDefinitions] = useState<Record<string, unknown>[]>([]);
  const [measurements, setMeasurements] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const brRes = await ownerGet<{ data?: BranchRow[] }>("/api/v1/owner/branches");
      const brs = pickBranches(brRes);
      const oid = brs[0]?.org?.id ?? null;
      setOrgId(oid);
      if (!oid) {
        setDefinitions([]);
        setMeasurements([]);
        return;
      }
      const [defRes, measRes] = await Promise.all([
        getSloDefinitions({ orgId: oid }),
        getSloMeasurements({
          orgId: oid,
          from: `${from}T00:00:00.000Z`,
          to: `${to}T23:59:59.999Z`,
        }),
      ]);
      setDefinitions(((defRes as { data?: unknown[] })?.data ?? []) as Record<string, unknown>[]);
      setMeasurements(((measRes as { data?: unknown[] })?.data ?? []) as Record<string, unknown>[]);
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="container-fluid py-4">
      <PageHeader title="SLA & service intelligence" subtitle="Dispatch timeliness and discrepancy signals vs org targets." />
      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <p className="text-muted">Loading…</p>}

      {orgId != null && (
        <div className="row g-2 align-items-end mb-3">
          <div className="col-auto">
            <label className="form-label small mb-0">From</label>
            <input type="date" className="form-control form-control-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="col-auto">
            <label className="form-label small mb-0">To</label>
            <input type="date" className="form-control form-control-sm" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="col-auto">
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => load()}>
              Apply
            </button>
          </div>
        </div>
      )}

      {orgId == null && !loading && <div className="alert alert-warning">No organization context.</div>}

      {!loading && orgId != null && (
        <div className="row g-3">
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white">SLO definitions</div>
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead>
                    <tr>
                      <th>Key</th>
                      <th>Domain</th>
                      <th>Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {definitions.length === 0 && (
                      <tr>
                        <td colSpan={3} className="text-muted small">
                          Run financial refresh to seed defaults, or open support.
                        </td>
                      </tr>
                    )}
                    {definitions.map((d) => (
                      <tr key={String(d.id)}>
                        <td>{String(d.sloKey)}</td>
                        <td>{String(d.domain)}</td>
                        <td>
                          {String(d.targetValue)} ({String(d.targetKind)})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white">Measurements (window)</div>
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead>
                    <tr>
                      <th>SLO</th>
                      <th>Value</th>
                      <th>Breaches</th>
                    </tr>
                  </thead>
                  <tbody>
                    {measurements.length === 0 && (
                      <tr>
                        <td colSpan={3} className="text-muted small">
                          No measurements — run Refresh rollup on the financial dashboard (recomputes SLOs for the same window).
                        </td>
                      </tr>
                    )}
                    {measurements.map((m) => {
                      const slo = m.slo as { sloKey?: string } | undefined;
                      return (
                        <tr key={String(m.id)}>
                          <td>{slo?.sloKey ?? "—"}</td>
                          <td>{m.measuredValue != null ? String(m.measuredValue) : "—"}</td>
                          <td>{String(m.breachCount ?? "0")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
