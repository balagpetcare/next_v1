"use client";

/**
 * Canonical manager GRN detail (review / edit / confirm). Filesystem-backed; no rewrites.
 * Queue: /staff/branch/:branchId/warehouse/receive-po
 * Detail: /staff/branch/:branchId/warehouse/vendor-receipts/:grnId
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import StaffBranchLayout from "@/src/components/branch/StaffBranchLayout";
import { useBranchContext } from "@/lib/useBranchContext";
import WarehouseAccessFallback from "../../_components/WarehouseAccessFallback";
import { grnGet } from "@/lib/api";
import {
  VendorReceiveGrnCard,
  canExecuteVendorReceive,
  canConfirmGrn,
  type VendorReceiveGrnDraft,
} from "../../receive-po/_components/VendorReceiveGrnCard";
import { ManagerReceiveEditor } from "../../receive-po/_components/ManagerReceiveEditor";
import { useToast } from "@/src/hooks/useToast";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

function isNotFoundError(msg: string): boolean {
  const m = msg.toLowerCase();
  return m.includes("not found") || m.includes("404");
}

export default function StaffWarehouseVendorReceiptGrnDetailPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = String(params?.branchId ?? "");
  const grnId = Number(params?.grnId);
  const toast = useToast();
  const { branch, myAccess, isLoading } = useBranchContext(branchId);

  const perms = myAccess?.permissions ?? [];
  const canReceive = useMemo(() => canExecuteVendorReceive(perms), [perms]);
  const isManager = useMemo(() => canConfirmGrn(perms), [perms]);

  const rawOrg = branch && typeof branch === "object" && "orgId" in branch ? (branch as { orgId?: number }).orgId : undefined;
  const fallbackOrgId = rawOrg != null && Number.isFinite(Number(rawOrg)) ? Number(rawOrg) : null;

  const [grn, setGrn] = useState<VendorReceiveGrnDraft | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const invalidGrnParam = !Number.isFinite(grnId) || grnId <= 0;

  const loadOne = useCallback(async (): Promise<VendorReceiveGrnDraft | null> => {
    if (!fallbackOrgId || invalidGrnParam) return null;
    setLoading(true);
    setLoadError(null);
    try {
      const data = (await grnGet(grnId, fallbackOrgId)) as VendorReceiveGrnDraft & {
        location?: { branch?: { id?: number } | null } | null;
        vendorReceiveSession?: { status?: string } | null;
      };
      if (!data || typeof data !== "object") {
        setLoadError("GRN not found for this warehouse branch.");
        setGrn(null);
        return null;
      }
      const locBranchId = data.location?.branch?.id;
      if (locBranchId != null && Number(locBranchId) !== Number(branchId)) {
        setLoadError(
          "This GRN is not for this branch’s warehouse. Open vendor receipts from the branch that owns the receiving location, or ask an administrator if the location is wrong."
        );
        setGrn(null);
        return null;
      }
      setGrn(data as VendorReceiveGrnDraft);
      return data as VendorReceiveGrnDraft;
    } catch (e: unknown) {
      const raw = getMessageFromApiError(e instanceof Error ? e : new Error(String(e)));
      setLoadError(isNotFoundError(raw) ? "GRN not found for this warehouse branch." : raw);
      setGrn(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fallbackOrgId, grnId, branchId, invalidGrnParam]);

  useEffect(() => {
    if (invalidGrnParam) {
      setLoading(false);
      setLoadError("Invalid GRN reference. Use a link from the vendor receipts queue or your notification.");
      return;
    }
    if (fallbackOrgId) loadOne();
  }, [fallbackOrgId, grnId, loadOne, invalidGrnParam]);

  const showManagerEditor = useMemo(() => {
    if (!grn || !isManager) return false;
    if (grn.status !== "DRAFT") return false;
    const sess = (grn as unknown as { vendorReceiveSession?: { status?: string } | null }).vendorReceiveSession?.status;
    if (sess === "POSTED" || sess === "CANCELLED") return false;
    return true;
  }, [grn, isManager]);

  if (isLoading || loading) {
    return (
      <StaffBranchLayout branchId={branchId} requiredPermission={null}>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2 text-muted small">Loading GRN…</p>
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
          message="Purchase receive / GRN post permissions are required to review vendor receipts."
        />
      </StaffBranchLayout>
    );
  }

  return (
    <StaffBranchLayout branchId={branchId} requiredPermission={null}>
      <div className="container-fluid py-3">
        <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
          <Link href={`/staff/branch/${branchId}/warehouse/receive-po`} className="btn btn-sm btn-outline-secondary">
            ← Vendor receipts
          </Link>
          <h5 className="mb-0">Review vendor receive</h5>
        </div>

        {loadError && (
          <div className="alert alert-danger">
            {loadError}
            <div className="mt-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-dark"
                onClick={() => router.push(`/staff/branch/${branchId}/warehouse/receive-po`)}
              >
                Back to queue
              </button>
            </div>
          </div>
        )}

        {grn && showManagerEditor && (
          <ManagerReceiveEditor
            grn={grn}
            onDraftSaved={() => void loadOne()}
            onDone={async () => {
              const next = await loadOne();
              if (next?.status === "RECEIVED") {
                toast.success("Stock posted.");
                router.push(`/staff/branch/${branchId}/warehouse/receive-po`);
              }
            }}
          />
        )}

        {grn && !showManagerEditor && (
          <VendorReceiveGrnCard
            grn={grn}
            perms={perms}
            branchId={branchId}
            onRefresh={async () => {
              const next = await loadOne();
              if (next?.status === "RECEIVED") {
                toast.success("Stock posted.");
                router.push(`/staff/branch/${branchId}/warehouse/receive-po`);
              }
            }}
          />
        )}
      </div>
    </StaffBranchLayout>
  );
}
