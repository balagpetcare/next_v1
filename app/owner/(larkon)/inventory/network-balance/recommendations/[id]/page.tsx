"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { getNetworkRecommendation } from "@/app/owner/_lib/ownerApi";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

export default function NetworkRecommendationDetailPage() {
  const params = useParams();
  const id = Number(params?.id);
  const [orgId, setOrgId] = useState<number | null>(null);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!orgId || !Number.isFinite(id)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getNetworkRecommendation(id, orgId);
      const r = res as { data?: Record<string, unknown> } | null;
      setData(r?.data ?? null);
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
    } finally {
      setLoading(false);
    }
  }, [orgId, id]);

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

  const explain = (data?.explainJson ?? {}) as Record<string, unknown>;

  return (
    <div className="container-fluid py-4">
      <PageHeader title="Rebalance recommendation" subtitle="Explainability payload for network transfer." />
      <Link href="/owner/inventory/network-balance" className="btn btn-link btn-sm px-0 mb-3">
        ← Back to network balance
      </Link>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <p className="text-muted">Loading…</p>}
      {!loading && !data && !error && <div className="alert alert-light border">No recommendation data.</div>}
      {!loading && data && (
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <pre className="small bg-light p-3 rounded mb-0 overflow-auto" style={{ maxHeight: 420 }}>
              {JSON.stringify({ row: data, explain }, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
