"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { listScenarioRuns, ownerGet } from "@/app/owner/_lib/ownerApi";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

type BranchRow = { org?: { id: number } };

export default function ScenariosListPage() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const brRes = await ownerGet<{ data?: BranchRow[] }>("/api/v1/owner/branches");
      const list = (brRes as { data?: BranchRow[] })?.data;
      const oid = Array.isArray(list) && list[0]?.org?.id ? list[0].org.id : null;
      setOrgId(oid);
      if (!oid) {
        setRows([]);
        return;
      }
      const res = await listScenarioRuns({ orgId: oid });
      const data = (res as { data?: unknown[] })?.data ?? (res as unknown as unknown[]);
      setRows(Array.isArray(data) ? (data as Array<Record<string, unknown>>) : []);
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <PageHeader
        title="Scenario runs"
        subtitle="What-if simulations are sandbox-only: they persist result snapshots and never write StockLedger."
      />
      <Link href="/owner/inventory/network-command/scenarios/new" className="btn btn-primary btn-sm mb-3">
        New run
      </Link>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <p className="text-muted">Loading…</p>}
      <div className="table-responsive">
        <table className="table table-sm table-bordered bg-white">
          <thead>
            <tr>
              <th>ID</th>
              <th>Template</th>
              <th>Status</th>
              <th>Engine</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="text-muted">
                  No runs yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={String(r.id)}>
                <td>{String(r.id)}</td>
                <td>{String(r.templateKey)}</td>
                <td>{String(r.status)}</td>
                <td>
                  <code className="small">{String(r.engineVersion)}</code>
                </td>
                <td>{String(r.createdAt ?? "")}</td>
                <td>
                  <Link href={`/owner/inventory/network-command/scenarios/${r.id}`} className="btn btn-link btn-sm py-0">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
