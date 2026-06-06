"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { putawayRecommendations, putawayTaskConfirm, putawayTasksList, warehouseAccessible, warehouseById } from "@/lib/api";
import StaffBranchLayout from "@/src/components/branch/StaffBranchLayout";
import { useBranchContext } from "@/lib/useBranchContext";
import { getWarehouseCapabilities } from "@/src/lib/warehouseRbac";
import { useToast } from "@/src/hooks/useToast";
import WarehouseAccessFallback from "../../_components/WarehouseAccessFallback";

type Candidate = { locationId?: number; locationName?: string; score?: number; reasons?: string[] };

export default function StaffPutawayTaskDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const branchId = String(params?.branchId ?? "");
  const taskId = Number(params?.taskId);
  const whQ = searchParams.get("wh");

  const { myAccess } = useBranchContext(branchId);
  const caps = getWarehouseCapabilities(myAccess?.permissions ?? []);
  const toast = useToast();

  const [warehouses, setWarehouses] = useState<Array<{ id: number; name?: string; orgId?: number }>>([]);
  const [selectedWhId, setSelectedWhId] = useState<number | null>(null);
  const [orgId, setOrgId] = useState<number | null>(null);
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<{ candidates?: Candidate[] } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [toLocationId, setToLocationId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canOps = caps.canViewOperations || caps.hasAnyWarehouseAccess;

  const selectedWh = useMemo(
    () => warehouses.find((w) => Number(w.id) === selectedWhId) || null,
    [warehouses, selectedWhId]
  );

  useEffect(() => {
    let c = false;
    (async () => {
      const list = await warehouseAccessible().catch(() => []);
      const arr = (Array.isArray(list) ? list : []) as Array<{ id: number; name?: string; orgId?: number }>;
      if (c) return;
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
    })();
    return () => {
      c = true;
    };
  }, [whQ]);

  const loadTask = useCallback(async () => {
    if (!taskId || !orgId || !selectedWhId) return;
    setLoading(true);
    try {
      const res = await putawayTasksList({
        orgId,
        warehouseId: selectedWhId,
        status: "OPEN",
        limit: 200,
      });
      const rows = (res.items || []) as any[];
      const found = rows.find((r) => Number(r.id) === taskId);
      setTask(found || null);
      const rec0 = found?.recommendationJson?.candidates?.[0];
      if (rec0?.locationId) setToLocationId(String(rec0.locationId));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load task");
      setTask(null);
    } finally {
      setLoading(false);
    }
  }, [taskId, orgId, selectedWhId, toast]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  async function loadPreview() {
    const glId = task?.grnLineId;
    if (!glId || !orgId) {
      toast.error("Missing GRN line on task");
      return;
    }
    setPreviewLoading(true);
    try {
      const data = (await putawayRecommendations(Number(glId), orgId)) as { candidates?: Candidate[] } | null;
      setPreview(data && typeof data === "object" ? data : null);
      const first = data?.candidates?.[0];
      if (first?.locationId) setToLocationId(String(first.locationId));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load recommendations");
    } finally {
      setPreviewLoading(false);
    }
  }

  useEffect(() => {
    if (task?.grnLineId && orgId) {
      loadPreview();
    }
     
  }, [task?.id, task?.grnLineId, orgId]);

  async function confirm() {
    const n = Number(toLocationId);
    if (!Number.isFinite(n) || n < 1) {
      toast.error("Enter a valid target location ID");
      return;
    }
    setSubmitting(true);
    try {
      await putawayTaskConfirm(taskId, { toLocationId: n, orgId: orgId ?? undefined });
      toast.success("Putaway confirmed");
      window.location.href = `/staff/branch/${branchId}/warehouse/putaway?wh=${selectedWhId ?? ""}`;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Confirm failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!canOps) {
    return (
      <StaffBranchLayout branchId={branchId} requiredPermission={null}>
        <WarehouseAccessFallback
          branchId={branchId}
          title="Putaway"
          message="You do not have warehouse operations access for this branch."
        />
      </StaffBranchLayout>
    );
  }

  return (
    <StaffBranchLayout branchId={branchId} requiredPermission={null}>
      <div className="container-fluid py-3">
        <div className="mb-3">
          <Link
            href={`/staff/branch/${branchId}/warehouse/putaway?wh=${selectedWhId ?? ""}`}
            className="btn btn-outline-secondary btn-sm"
          >
            ← Putaway queue
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" />
          </div>
        ) : !task ? (
          <div className="alert alert-warning">Task not found in open queue (it may be completed).</div>
        ) : (
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="mb-2">
                Putaway task #{task.id}
              </h5>
              <div className="small text-muted mb-3">
                {task.variant?.sku} · {task.variant?.title}
                <br />
                Lot {task.lot?.lotCode ?? "—"} · Qty {task.quantity ?? "—"} · From {task.fromLocation?.name ?? "—"}
              </div>

              <div className="mb-3">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  disabled={previewLoading}
                  onClick={loadPreview}
                >
                  {previewLoading ? "Loading…" : "Refresh recommendations"}
                </button>
              </div>

              {(preview?.candidates?.length || task.recommendationJson?.candidates?.length) ? (
                <div className="table-responsive mb-3">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Location</th>
                        <th>Score</th>
                        <th>Reasons</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(preview?.candidates || task.recommendationJson?.candidates || []).map((c: Candidate, i: number) => (
                        <tr key={`${c.locationId}-${i}`}>
                          <td>{i + 1}</td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-link btn-sm p-0"
                              onClick={() => c.locationId && setToLocationId(String(c.locationId))}
                            >
                              {c.locationName || c.locationId || "—"}
                            </button>
                          </td>
                          <td>{c.score != null ? String(c.score) : "—"}</td>
                          <td className="small">{(c.reasons || []).slice(0, 3).join(", ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="small text-muted">No ranked candidates yet. Tap refresh after receive.</p>
              )}

              <div className="d-flex flex-wrap gap-2 align-items-center">
                <label className="small mb-0">Target location ID</label>
                <input
                  className="form-control form-control-sm"
                  style={{ width: 160 }}
                  value={toLocationId}
                  onChange={(e) => setToLocationId(e.target.value)}
                />
                <button type="button" className="btn btn-success btn-sm" disabled={submitting} onClick={confirm}>
                  {submitting ? "…" : "Confirm move"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </StaffBranchLayout>
  );
}
