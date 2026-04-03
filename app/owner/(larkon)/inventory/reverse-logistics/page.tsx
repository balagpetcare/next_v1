"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { listReverseStockReturns, listReverseLogisticsCases } from "@/app/owner/_lib/ownerApi";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

export default function ReverseLogisticsHubPage() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [returns, setReturns] = useState<{ items?: any[] } | null>(null);
  const [cases, setCases] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const [r, c] = await Promise.all([
        listReverseStockReturns({ orgId, limit: 30 }),
        listReverseLogisticsCases(orgId),
      ]);
      setReturns(r as { items?: any[] });
      const cr = c as { data?: any[] } | null;
      setCases(Array.isArray(cr?.data) ? cr.data : []);
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    (async () => {
      const br = await fetch("/api/v1/owner/branches", { credentials: "include" }).then((r) => r.json());
      const rows = (br?.data ?? []) as { org?: { id: number } }[];
      setOrgId(rows[0]?.org?.id ?? null);
    })();
  }, []);

  useEffect(() => {
    if (orgId) load();
  }, [orgId, load]);

  return (
    <div className="container-fluid py-4">
      <PageHeader
        title="Reverse logistics"
        subtitle="Branch → DC stock returns, disposition, and case links. Customer POS returns remain in retail workflows."
      />
      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <p className="text-muted">Loading…</p>}

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <span className="nav-link active">Stock returns</span>
        </li>
        <li className="nav-item">
          <Link className="nav-link" href="/owner/inventory/reverse-logistics/intake">
            New return (intake)
          </Link>
        </li>
        <li className="nav-item">
          <Link className="nav-link" href="/owner/inventory/vendor-returns">
            Vendor returns
          </Link>
        </li>
      </ul>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white fw-semibold">Cases</div>
        <div className="card-body">
          {!cases?.length && <p className="text-muted mb-0">No cases yet.</p>}
          {!!cases?.length && (
            <ul className="list-group list-group-flush">
              {cases.map((x: any) => (
                <li key={x.id} className="list-group-item d-flex justify-content-between">
                  <span>
                    {x.caseType} · {x.primaryEntityType} #{x.primaryEntityId}
                  </span>
                  <span className="badge bg-secondary">{x.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white fw-semibold d-flex justify-content-between align-items-center">
          <span>Stock returns (branch → warehouse)</span>
          <Link href="/owner/inventory/reverse-logistics/intake" className="btn btn-sm btn-primary">
            New stock return
          </Link>
        </div>
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>Disposition</th>
                <th>From → To</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(returns?.items ?? []).map((r: any) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.status}</td>
                  <td>{r.disposition ?? "—"}</td>
                  <td className="small">
                    {r.fromLocation?.name} → {r.toLocation?.name}
                  </td>
                  <td className="text-end">
                    <Link href={`/owner/inventory/reverse-logistics/stock-returns/${r.id}`} className="btn btn-sm btn-outline-primary">
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
              {!(returns?.items ?? []).length && (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    No stock returns.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
