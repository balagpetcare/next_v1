"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { putawayTasksList, warehouseAccessible, warehouseById } from "@/lib/api";
import StaffBranchLayout from "@/src/components/branch/StaffBranchLayout";
import { useBranchContext } from "@/lib/useBranchContext";
import { getWarehouseCapabilities } from "@/src/lib/warehouseRbac";
import { useToast } from "@/src/hooks/useToast";
import WarehouseAccessFallback from "../_components/WarehouseAccessFallback";
type PutawayTaskRow = {
  id: number;
  quantity?: number;
  grnLineId?: number | null;
  variant?: { sku?: string; title?: string };
  lot?: { lotCode?: string; expDate?: string };
  fromLocation?: { id?: number; name?: string };
  warehouse?: { id?: number; name?: string };
  recommendationJson?: { candidates?: Array<{ locationId?: number; locationName?: string; reasons?: string[] }> };
};

export default function StaffPutawayQueuePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const branchId = String(params?.branchId ?? "");
  const whQ = searchParams.get("wh");
  const { myAccess } = useBranchContext(branchId);
  const caps = getWarehouseCapabilities(myAccess?.permissions ?? []);
  const toast = useToast();

  const [warehouses, setWarehouses] = useState<Array<{ id: number; name?: string; orgId?: number }>>([]);
  const [orgId, setOrgId] = useState<number | null>(null);
  const [selectedWhId, setSelectedWhId] = useState<number | null>(null);
  const [items, setItems] = useState<PutawayTaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);

  const canOps = caps.canViewOperations || caps.hasAnyWarehouseAccess;

  const loadWarehouses = useCallback(async () => {
    const list = await warehouseAccessible().catch(() => []);
    const arr = Array.isArray(list) ? list : [];
    setWarehouses(arr);
    const fromQ = whQ ? Number(whQ) : null;
    const pick =
      (fromQ && arr.some((w: { id: number }) => Number(w.id) === fromQ) ? fromQ : null) ??
      (arr[0]?.id ? Number(arr[0].id) : null);
    setSelectedWhId(pick);
    let oid: number | null = null;
    const wh = arr.find((w: { id: number }) => Number(w.id) === pick) as { orgId?: number } | undefined;
    if (wh?.orgId != null) oid = Number(wh.orgId);
    else if (pick) {
      const detail = (await warehouseById(pick).catch(() => null)) as { orgId?: number } | null;
      if (detail?.orgId != null) oid = Number(detail.orgId);
    }
    setOrgId(Number.isFinite(oid as number) ? (oid as number) : null);
  }, [whQ]);

  useEffect(() => {
    if (!canOps) {
      setLoading(false);
      return;
    }
    let c = false;
    (async () => {
      setLoading(true);
      try {
        await loadWarehouses();
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [canOps, loadWarehouses]);

  const loadTasks = useCallback(async () => {
    if (!orgId || !selectedWhId) {
      setItems([]);
      return;
    }
    setListLoading(true);
    try {
      const res = await putawayTasksList({
        orgId,
        warehouseId: selectedWhId,
        status: "OPEN",
        limit: 50,
      });
      setItems((res.items || []) as PutawayTaskRow[]);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load putaway tasks");
      setItems([]);
    } finally {
      setListLoading(false);
    }
  }, [orgId, selectedWhId, toast]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  if (loading) {
    return (
      <StaffBranchLayout branchId={branchId} requiredPermission={null}>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
        </div>
      </StaffBranchLayout>
    );
  }

  if (!canOps) {
    return (
      <StaffBranchLayout branchId={branchId} requiredPermission={null}>
        <WarehouseAccessFallback title="Putaway" message="You do not have warehouse operations access for this branch." />
      </StaffBranchLayout>
    );
  }

  return (
    <StaffBranchLayout branchId={branchId} requiredPermission={null}>
      <div className="container-fluid py-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h5 className="mb-0">Putaway queue</h5>
            <p className="text-muted small mb-0">Open tasks for the selected warehouse</p>
          </div>
          <Link href={`/staff/branch/${branchId}/warehouse`} className="btn btn-outline-secondary btn-sm">
            ← Warehouse
          </Link>
        </div>

        {warehouses.length > 0 && (
          <div className="mb-3">
            <label className="form-label small text-muted">Warehouse</label>
            <select
              className="form-select form-select-sm"
              style={{ maxWidth: 320 }}
              value={selectedWhId ?? ""}
              onChange={async (e) => {
                const wid = Number(e.target.value) || null;
                setSelectedWhId(wid);
                if (!wid) return;
                const wh = warehouses.find((w) => Number(w.id) === wid) as { orgId?: number } | undefined;
                if (wh?.orgId != null) {
                  setOrgId(Number(wh.orgId));
                  return;
                }
                const detail = (await warehouseById(wid).catch(() => null)) as { orgId?: number } | null;
                if (detail?.orgId != null) setOrgId(Number(detail.orgId));
              }}
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name || `Warehouse #${w.id}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {listLoading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary spinner-border-sm" />
          </div>
        ) : (
          <div className="list-group">
            {items.map((t) => {
              const rec = t.recommendationJson?.candidates?.[0];
              return (
                <Link
                  key={t.id}
                  href={`/staff/branch/${branchId}/warehouse/putaway/${t.id}?wh=${selectedWhId ?? ""}`}
                  className="list-group-item list-group-item-action d-flex justify-content-between align-items-start gap-2"
                >
                  <div>
                    <div className="fw-semibold">
                      {t.variant?.sku} · {t.variant?.title}
                    </div>
                    <div className="small text-muted">
                      Lot {t.lot?.lotCode ?? "—"} · Qty {t.quantity ?? "—"} · From {t.fromLocation?.name ?? "—"}
                    </div>
                    {rec && (
                      <div className="small mt-1">
                        <span className="badge bg-primary-subtle text-primary">Suggested</span> {rec.locationName}
                      </div>
                    )}
                  </div>
                  <span className="btn btn-sm btn-outline-primary">Open</span>
                </Link>
              );
            })}
            {items.length === 0 && (
              <div className="text-muted small py-4 text-center">No open putaway tasks for this warehouse.</div>
            )}
          </div>
        )}
      </div>
    </StaffBranchLayout>
  );
}
