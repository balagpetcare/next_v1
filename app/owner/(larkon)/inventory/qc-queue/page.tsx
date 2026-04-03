"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet } from "@/app/owner/_lib/ownerApi";

function pickArray(resp: unknown): unknown[] {
  if (!resp) return [];
  const r = resp as Record<string, unknown>;
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(r.data)) return r.data as unknown[];
  if (Array.isArray(r.items)) return r.items as unknown[];
  const d = r.data as Record<string, unknown> | undefined;
  if (d && Array.isArray(d.items)) return d.items as unknown[];
  return [];
}

type Row = {
  id: number;
  status: string;
  expectedQty?: number;
  variant?: { sku?: string; title?: string };
  grn?: { id: number };
};

export default function OwnerQcQueuePage() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const loadOrg = useCallback(async () => {
    try {
      const orgsRes = await ownerGet("/api/v1/owner/organizations").catch(() => ({ data: [] }));
      const orgRows = pickArray(orgsRes) as { id?: number }[];
      const oid = orgRows[0]?.id != null ? Number(orgRows[0].id) : null;
      setOrgId(oid && Number.isFinite(oid) ? oid : null);
    } catch {
      setOrgId(null);
    }
  }, []);

  const loadQueue = useCallback(async () => {
    if (!orgId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const res = await ownerGet(`/api/v1/qc-inspections?orgId=${orgId}&status=PENDING&limit=100`);
      const items =
        (res as { data?: { items?: Row[] } })?.data?.items ??
        (res as { items?: Row[] })?.items ??
        [];
      setRows(Array.isArray(items) ? items : []);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadOrg();
  }, [loadOrg]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  return (
    <div className="container-fluid py-4">
      <PageHeader title="QC queue" subtitle="Pending inbound inspections" />
      <nav aria-label="breadcrumb" className="mb-2">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link href="/owner/inventory">Inventory</Link>
          </li>
          <li className="breadcrumb-item active">QC queue</li>
        </ol>
      </nav>
      {err && <div className="alert alert-danger">{err}</div>}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
        </div>
      ) : (
        <div className="table-responsive card border radius-12">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>ID</th>
                <th>Variant</th>
                <th>Qty</th>
                <th>GRN</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>
                    <span className="small text-muted d-block">{r.variant?.sku}</span>
                    {r.variant?.title}
                  </td>
                  <td>{r.expectedQty ?? "—"}</td>
                  <td>
                    {r.grn?.id ? (
                      <Link href={`/owner/inventory/grn/${r.grn.id}`} className="text-decoration-none">
                        #{r.grn.id}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{r.status}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    No pending QC rows.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
