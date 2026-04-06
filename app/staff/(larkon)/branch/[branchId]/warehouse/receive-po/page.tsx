"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import StaffBranchLayout from "@/src/components/branch/StaffBranchLayout";
import { useBranchContext } from "@/lib/useBranchContext";
import WarehouseAccessFallback from "../_components/WarehouseAccessFallback";
import BulkReceivePage from "@/app/owner/(larkon)/inventory/receipts/bulk/BulkReceivePage";
import {
  VendorReceiveGrnCard,
  canExecuteVendorReceive,
  type VendorReceiveGrnDraft,
} from "./_components/VendorReceiveGrnCard";
import { useToast } from "@/src/hooks/useToast";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

export default function StaffWarehouseReceivePoPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const branchId = String(params?.branchId ?? "");
  const highlightGrnId = Number(searchParams.get("grnId")) || null;
  const { branch, myAccess, isLoading } = useBranchContext(branchId);
  const toast = useToast();
  const scrolledRef = useRef(false);

  const perms = myAccess?.permissions ?? [];
  const canReceive = useMemo(() => canExecuteVendorReceive(perms), [perms]);

  const rawOrg = branch && typeof branch === "object" && "orgId" in branch ? (branch as { orgId?: number }).orgId : undefined;
  const fallbackOrgId = rawOrg != null && Number.isFinite(Number(rawOrg)) ? Number(rawOrg) : null;

  const [draftGrns, setDraftGrns] = useState<VendorReceiveGrnDraft[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const loadDraftGrns = useCallback(async () => {
    if (!fallbackOrgId || !branchId) return;
    setLoadingDrafts(true);
    try {
      const base = typeof window !== "undefined" ? window.location.origin : "";
      const q = new URLSearchParams({
        orgId: String(fallbackOrgId),
        branchId: String(branchId),
        status: "DRAFT",
        limit: "100",
        page: "1",
      });
      const res = await fetch(`${base}/api/v1/grn?${q.toString()}`, { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || `Failed to load GRNs (${res.status})`);
      }
      const list = (json?.data ?? []) as VendorReceiveGrnDraft[];
      const arr = Array.isArray(list) ? list : [];
      setDraftGrns(arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (e: unknown) {
      setDraftGrns([]);
      toast.error(getMessageFromApiError(e instanceof Error ? e : new Error(String(e))));
    } finally {
      setLoadingDrafts(false);
    }
  }, [fallbackOrgId, branchId, toast]);

  useEffect(() => {
    if (canReceive && fallbackOrgId && branchId) loadDraftGrns();
  }, [canReceive, fallbackOrgId, branchId, loadDraftGrns]);

  const awaitingList = useMemo(
    () => draftGrns.filter((g) => g.vendorReceiveSession?.status === "AWAITING_CONFIRMATION"),
    [draftGrns]
  );
  const draftList = useMemo(
    () =>
      draftGrns.filter(
        (g) => g.vendorReceiveSession?.status === "DRAFT" || g.vendorReceiveSession == null
      ),
    [draftGrns]
  );

  useEffect(() => {
    if (!highlightGrnId || scrolledRef.current) return;
    const t = window.setTimeout(() => {
      const el = document.getElementById(`grn-card-${highlightGrnId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        scrolledRef.current = true;
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [highlightGrnId, draftGrns]);

  if (isLoading) {
    return (
      <StaffBranchLayout branchId={branchId} requiredPermission={null}>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2 text-muted small">Loading…</p>
        </div>
      </StaffBranchLayout>
    );
  }

  if (!canReceive) {
    return (
      <StaffBranchLayout branchId={branchId} requiredPermission={null}>
        <WarehouseAccessFallback
          branchId={branchId}
          title="Receiving permission required"
          message="Purchase receive / GRN post permissions are required to record vendor receipt against a purchase order. Ask an administrator to assign purchase.receive or grn.post."
        />
      </StaffBranchLayout>
    );
  }

  return (
    <StaffBranchLayout branchId={branchId} requiredPermission={null}>
      <div className="container-fluid py-3">
        <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <Link href={`/staff/branch/${branchId}/warehouse`} className="btn btn-sm btn-outline-secondary">
              ← Warehouse
            </Link>
            <h5 className="mb-0">Vendor receipts</h5>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? "Hide receive form" : "+ New receive"}
          </button>
        </div>

        <p className="text-muted small mb-3">
          Owner or admin <strong>bulk receive</strong> drafts submitted for confirmation appear here for this warehouse branch.
          Confirm to post stock into inventory.
        </p>

        {/* Pending draft / awaiting confirmation GRNs */}
        {loadingDrafts && <p className="text-muted small">Loading pending GRNs…</p>}
        {!loadingDrafts && awaitingList.length > 0 && (
          <div className="mb-4">
            <h6 className="text-warning-emphasis mb-2">Awaiting confirmation ({awaitingList.length})</h6>
            {awaitingList.map((grn) => (
              <VendorReceiveGrnCard
                key={grn.id}
                grn={grn}
                perms={perms}
                onRefresh={loadDraftGrns}
                highlight={highlightGrnId === grn.id}
                branchId={branchId}
                initialOpenManagerEditor={highlightGrnId === grn.id}
              />
            ))}
          </div>
        )}
        {!loadingDrafts && draftList.length > 0 && (
          <div className="mb-3">
            <h6 className="text-muted mb-2">Draft receives ({draftList.length})</h6>
            {draftList.map((grn) => (
              <VendorReceiveGrnCard
                key={grn.id}
                grn={grn}
                perms={perms}
                onRefresh={loadDraftGrns}
                highlight={highlightGrnId === grn.id}
                branchId={branchId}
                initialOpenManagerEditor={highlightGrnId === grn.id}
              />
            ))}
          </div>
        )}
        {!loadingDrafts && draftGrns.length === 0 && !showCreate && (
          <div className="alert alert-info radius-12">
            <p className="mb-2">
              No pending vendor receive confirmations or drafts for <strong>this warehouse branch</strong>.
            </p>
            <p className="mb-0 small text-muted">
              If you expected a GRN from an owner bulk receive, confirm you are on the branch whose warehouse location was used on the GRN.
              Use <strong>+ New receive</strong> to record a vendor receipt against a purchase order.
            </p>
          </div>
        )}

        {/* Create new receive */}
        {showCreate && <BulkReceivePage fallbackOrgId={fallbackOrgId} embedInStaff staffBranchId={branchId} />}
      </div>
    </StaffBranchLayout>
  );
}
