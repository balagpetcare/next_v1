"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import { putawayRecommendations, putawayTaskConfirm, putawayTasksList } from "@/lib/api";
import { useToast } from "@/src/hooks/useToast";

type TaskRow = {
  id: number;
  grnLineId?: number | null;
  quantity?: number;
  variant?: { sku?: string; title?: string };
  lot?: { lotCode?: string };
  fromLocation?: { name?: string };
  recommendationJson?: { candidates?: Array<{ locationId?: number; locationName?: string; reasons?: string[]; score?: number }> };
};

export default function PutawayPage() {
  const toast = useToast();
  const [items, setItems] = useState<TaskRow[]>([]);
  const [orgId, setOrgId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [locInput, setLocInput] = useState<Record<number, string>>({});
  const [apiRec, setApiRec] = useState<Record<number, { candidates?: Array<{ locationId?: number; locationName?: string; reasons?: string[]; score?: number }> } | null>>({});
  const [recLoading, setRecLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await ownerGet<{ organizations?: { id: number }[] }>("/api/v1/owner/me");
      const orgs = me?.organizations ?? (me as any)?.data?.organizations ?? [];
      if (orgs[0]?.id) setOrgId(orgs[0].id);
    })();
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await putawayTasksList({ orgId: orgId ?? undefined, status: "OPEN", limit: 50 });
      setItems((res.items || []) as TaskRow[]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!orgId || items.length === 0) return;
    let cancelled = false;
    (async () => {
      setRecLoading(true);
      try {
        const next: Record<number, { candidates?: Array<{ locationId?: number; locationName?: string; reasons?: string[]; score?: number }> } | null> = {};
        await Promise.all(
          items.map(async (t) => {
            if (!t.grnLineId) {
              next[t.id] = null;
              return;
            }
            try {
              const data = (await putawayRecommendations(t.grnLineId, orgId)) as {
                candidates?: Array<{ locationId?: number; locationName?: string; reasons?: string[]; score?: number }>;
              } | null;
              next[t.id] = data && typeof data === "object" ? data : null;
            } catch {
              next[t.id] = null;
            }
          })
        );
        if (!cancelled) setApiRec(next);
      } finally {
        if (!cancelled) setRecLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId, items]);

  async function confirm(id: number) {
    const toLocationId = Number(locInput[id]);
    if (!Number.isFinite(toLocationId) || toLocationId < 1) {
      toast.error("Enter target location ID");
      return;
    }
    try {
      await putawayTaskConfirm(id, { toLocationId, orgId: orgId ?? undefined });
      toast.success("Putaway confirmed");
      setItems((prev) => prev.filter((x) => x.id !== id));
      setApiRec((prev) => {
        const n = { ...prev };
        delete n[id];
        return n;
      });
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    }
  }

  return (
    <div className="container-fluid py-4">
      <PageHeader
        title="Putaway queue"
        subtitle="Move received stock from dock to storage. Ranked targets load from the recommendations API (merged with task snapshot)."
      />
      <div className="d-flex gap-2 mb-3 flex-wrap align-items-center">
        <Link href="/owner/inventory/receipts" className="btn btn-outline-secondary btn-sm">
          ← Receipts
        </Link>
        <button type="button" className="btn btn-outline-primary btn-sm" disabled={loading || recLoading} onClick={() => loadTasks()}>
          Refresh tasks
        </button>
        {recLoading && <span className="small text-muted">Updating suggestions…</span>}
      </div>
      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <div className="row g-3">
          {items.map((t) => {
            const merged = apiRec[t.id]?.candidates?.length
              ? apiRec[t.id]?.candidates
              : t.recommendationJson?.candidates;
            const rec = merged?.[0] ?? t.recommendationJson?.candidates?.[0];
            return (
              <div key={t.id} className="col-12">
                <div className="card border-0 shadow-sm">
                  <div className="card-body">
                    <div className="d-flex flex-wrap justify-content-between gap-2">
                      <div>
                        <div className="fw-semibold">
                          {t.variant?.sku} · {t.variant?.title}
                        </div>
                        <div className="text-muted small">
                          Lot {t.lot?.lotCode} · Qty {t.quantity} · From {t.fromLocation?.name}
                        </div>
                        {merged && merged.length > 0 && (
                          <div className="mt-2 small">
                            <div className="text-muted mb-1">Top suggestions</div>
                            <ul className="list-unstyled mb-0">
                              {merged.slice(0, 5).map((c, i) => (
                                <li key={`${t.id}-c-${i}`}>
                                  <span className="badge bg-primary-subtle text-primary me-1">#{i + 1}</span>
                                  <strong>{c.locationName || c.locationId}</strong>
                                  {c.score != null && <span className="text-muted ms-1">({String(c.score)})</span>}
                                  {c.reasons?.length ? (
                                    <span className="text-muted ms-1">— {c.reasons.slice(0, 2).join(", ")}</span>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <div className="d-flex flex-wrap gap-2 align-items-center">
                        <input
                          className="form-control form-control-sm"
                          style={{ width: 140 }}
                          placeholder="To location ID"
                          value={locInput[t.id] ?? (rec?.locationId ? String(rec.locationId) : "")}
                          onChange={(e) => setLocInput((s) => ({ ...s, [t.id]: e.target.value }))}
                        />
                        <button type="button" className="btn btn-sm btn-success" onClick={() => confirm(t.id)}>
                          Confirm move
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {items.length === 0 ? <p className="text-muted">No open putaway tasks.</p> : null}
        </div>
      )}
    </div>
  );
}
