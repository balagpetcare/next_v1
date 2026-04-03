"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet, getCostToServeDetail } from "@/app/owner/_lib/ownerApi";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

type BranchRow = { id: number; name?: string; org?: { id: number } };

function pickBranches(resp: unknown): BranchRow[] {
  if (!resp || typeof resp !== "object") return [];
  const r = resp as { data?: unknown };
  return Array.isArray(r.data) ? (r.data as BranchRow[]) : [];
}

function CtsVariantInner() {
  const routeParams = useParams();
  const searchParams = useSearchParams();
  const variantId = Number(routeParams?.variantId);
  const branchId = Number(searchParams.get("branchId"));
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const [orgId, setOrgId] = useState<number | null>(null);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
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
      if (!oid || !Number.isFinite(variantId) || !Number.isFinite(branchId) || !from || !to) {
        setData(null);
        return;
      }
      const res = await getCostToServeDetail({
        orgId: oid,
        variantId,
        branchId,
        from: `${from}T00:00:00.000Z`,
        to: `${to}T23:59:59.999Z`,
      });
      const payload = (res as { data?: Record<string, unknown> })?.data ?? res;
      setData((payload as Record<string, unknown>) ?? null);
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [variantId, branchId, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = data?.summary as Record<string, unknown> | undefined;
  const facts = (data?.facts as Record<string, unknown>[]) ?? [];
  const variant = summary?.variant as { sku?: string; title?: string } | undefined;

  return (
    <div className="container-fluid py-4">
      <PageHeader
        title={`CTS — ${variant?.sku ?? variantId}`}
        subtitle="Underlying cost facts for explainability (GRN-derived material lines)."
      />
      <Link href="/owner/inventory/financial-intelligence" className="btn btn-sm btn-outline-secondary mb-3">
        ← Back
      </Link>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <p className="text-muted">Loading…</p>}

      {!loading && orgId == null && <div className="alert alert-warning">No organization context.</div>}

      {!loading && orgId != null && (!Number.isFinite(branchId) || !from || !to) && (
        <div className="alert alert-warning">Missing branchId, from, or to query params.</div>
      )}

      {!loading && summary && (
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body">
            <div className="row">
              <div className="col-md-4">
                <div className="text-muted small">Unit CTS</div>
                <div className="fs-5 fw-semibold">{String(summary.unitCts ?? "—")}</div>
              </div>
              <div className="col-md-4">
                <div className="text-muted small">Confidence</div>
                <div>{String(summary.confidence ?? "—")}</div>
              </div>
              <div className="col-md-4">
                <div className="text-muted small">Units basis</div>
                <div>{String(summary.unitsBasis ?? "—")}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && facts.length > 0 && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white">Cost facts</div>
          <div className="table-responsive">
            <table className="table table-sm mb-0">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Amount</th>
                  <th>Ref</th>
                </tr>
              </thead>
              <tbody>
                {facts.map((f) => (
                  <tr key={String(f.id)}>
                    <td>{String(f.component)}</td>
                    <td>{String(f.amount)}</td>
                    <td className="small">
                      {String(f.refType)} #{String(f.refId)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CtsVariantPage() {
  return (
    <Suspense fallback={<div className="p-4 text-muted">Loading…</div>}>
      <CtsVariantInner />
    </Suspense>
  );
}
