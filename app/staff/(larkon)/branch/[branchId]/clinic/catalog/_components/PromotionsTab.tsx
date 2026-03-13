"use client";

import { useCallback, useEffect, useState } from "react";
import { listDiscountPolicies } from "./catalogApi";
import { formatDiscountType, formatDiscountSummary } from "./catalogFormatters";
import CatalogStatusBadge from "./CatalogStatusBadge";
import { DataTableWrapper, EmptyState, ErrorState, LoadingState } from "@/src/components/dashboard";
import DiscountFormDrawer from "./DiscountFormDrawer";
import type { DiscountPolicy } from "./catalogTypes";

export default function PromotionsTab({
  branchId,
  canManage,
}: {
  branchId: string;
  canManage: boolean;
}) {
  const [policies, setPolicies] = useState<DiscountPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError("");
    listDiscountPolicies(branchId)
      .then((r) => setPolicies(r.items ?? []))
      .catch((e) => setError((e as Error)?.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, [branchId]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (loading && policies.length === 0) {
    return (
      <div className="card radius-12">
        <div className="card-body">
          <LoadingState message="Loading discount policies…" />
        </div>
      </div>
    );
  }

  if (error && policies.length === 0) {
    return (
      <div className="card radius-12">
        <div className="card-body">
          <ErrorState message={error} onRetry={reload} />
        </div>
      </div>
    );
  }

  return (
    <>
      {canManage && (
        <div className="d-flex justify-content-end mb-3">
          <button
            type="button"
            className="btn btn-primary btn-sm radius-8"
            onClick={() => { setEditingId(null); setDrawerOpen(true); }}
          >
            Add promotion / discount
          </button>
        </div>
      )}
      <DiscountFormDrawer
        branchId={branchId}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditingId(null); }}
        onSaved={reload}
        policyId={editingId ?? undefined}
        initialPolicy={editingId ? policies.find((p) => p.id === editingId) : undefined}
      />
      <DataTableWrapper
        emptyState={policies.length === 0 ? <EmptyState title="No promotions" description="Add a discount policy to get started." /> : undefined}
      >
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Summary</th>
                <th>Valid period</th>
                <th>Status</th>
                {canManage && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{formatDiscountType(p.discountType)}</td>
                  <td>{formatDiscountSummary(p)}</td>
                  <td>
                    {p.validFrom || p.validTo
                      ? `${p.validFrom ? new Date(p.validFrom).toLocaleDateString() : "—"} to ${p.validTo ? new Date(p.validTo).toLocaleDateString() : "—"}`
                      : "—"}
                  </td>
                  <td><CatalogStatusBadge status={p.status} /></td>
                  {canManage && (
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary radius-8"
                        onClick={() => { setEditingId(p.id); setDrawerOpen(true); }}
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataTableWrapper>
    </>
  );
}
