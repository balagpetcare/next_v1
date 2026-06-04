"use client";

/**
 * Physical GRN detail page for Turbopack / Next 16 nested dynamic stability.
 *
 * Public URL (unchanged in browser): /staff/branch/[branchId]/warehouse/vendor-receipts/[grnId]
 * next.config.js `beforeFiles` rewrites that URL → this route; proxy.ts also rewrites when authenticated.
 */

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import StaffBranchLayout from "@/src/components/branch/StaffBranchLayout";
import { useBranchContext } from "@/lib/useBranchContext";
import WarehouseAccessFallback from "../../_components/WarehouseAccessFallback";
import { grnGet } from "@/lib/api";
import {
  VendorReceiveGrnCard,
  type VendorReceiveGrnDraft,
} from "../../receive-po/_components/VendorReceiveGrnCard";
import { ManagerReceiveEditor } from "../../receive-po/_components/ManagerReceiveEditor";
import { useToast } from "@/src/hooks/useToast";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";
import {
  GrnStatusTimeline,
  VendorReceiptDetailHeader,
  VendorReceiptDetailPrintActions,
  VendorReceiptDetailSkeleton,
  VendorReceiptDetailKpiStrip,
  VendorReceiptDetailSectionTabs,
} from "@/src/components/warehouse/vendor-receipts";
import { canExecuteVendorReceive, canConfirmGrn } from "@/src/lib/vendorReceipt/permissions";
import { asVendorReceiptGrnRow, isGrnNotFoundMessage } from "@/src/lib/vendorReceiptTypes";

function tabFromQuery(q: string | null): "overview" | "items" | "discrepancies" | "activity" | "documents" | null {
  if (q === "overview" || q === "items" || q === "discrepancies" || q === "activity" || q === "documents") return q;
  return null;
}

export default function StaffWarehouseVendorReceiptGrnDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = String(params?.branchId ?? "");
  const grnId = Number(params?.grnId);
  const toast = useToast();
  const loadErrToastRef = useRef<string | null>(null);
  const { branch, myAccess, isLoading } = useBranchContext(branchId);
  const focusConfirm = searchParams.get("focus") === "confirm";
  const focusDiscrepancy = searchParams.get("focus") === "discrepancy";
  const initialTab = tabFromQuery(searchParams.get("tab"));

  const perms = myAccess?.permissions ?? [];
  const canReceive = useMemo(() => canExecuteVendorReceive(perms), [perms]);
  const isManager = useMemo(() => canConfirmGrn(perms), [perms]);

  const rawOrg = branch && typeof branch === "object" && "orgId" in branch ? (branch as { orgId?: number }).orgId : undefined;
  const fallbackOrgId = rawOrg != null && Number.isFinite(Number(rawOrg)) ? Number(rawOrg) : null;

  const [grn, setGrn] = useState<VendorReceiveGrnDraft | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const invalidGrnParam = !Number.isFinite(grnId) || grnId <= 0;

  const listHref = `/staff/branch/${branchId}/warehouse/vendor-receipts`;

  const afterPosted = useCallback(() => {
    router.push(`${listHref}?tab=history&posted=1`);
  }, [listHref, router]);

  const onConfirmedPosted = useCallback(() => {
    toast.success("Vendor receipt confirmed. Stock posted to inventory.");
    afterPosted();
  }, [afterPosted, toast]);

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
      const friendly = isGrnNotFoundMessage(raw) ? "GRN not found for this warehouse branch." : raw;
      setLoadError(friendly);
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

  useEffect(() => {
    if (!loadError) {
      loadErrToastRef.current = null;
      return;
    }
    if (loadError === loadErrToastRef.current) return;
    loadErrToastRef.current = loadError;
    toast.error(loadError);
  }, [loadError, toast]);

  const showManagerEditor = useMemo(() => {
    if (!grn || !isManager) return false;
    if (grn.status !== "DRAFT") return false;
    const sess = (grn as unknown as { vendorReceiveSession?: { status?: string } | null }).vendorReceiveSession?.status;
    if (sess === "POSTED" || sess === "CANCELLED") return false;
    return true;
  }, [grn, isManager]);

  const hasDiscrepancy = grn?.lines?.some(
    (l) => l.quantityDamaged > 0 || l.quantityShort > 0 || (l.quantityExtra ?? 0) > 0
  );

  if (isLoading || loading) {
    return (
      <StaffBranchLayout branchId={branchId} requiredPermission={null}>
        <VendorReceiptDetailSkeleton />
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

  const row = grn ? asVendorReceiptGrnRow(grn) : null;

  return (
    <StaffBranchLayout branchId={branchId} requiredPermission={null}>
      <div className="container-fluid py-3 px-2 px-sm-3">
        <VendorReceiptDetailHeader branchId={branchId} grnId={grnId} listHref={listHref} grn={grn} />

        {loadError && !grn && (
          <div className="alert alert-danger radius-12 py-2 px-3 mb-0">
            {loadError}
            <div className="mt-3">
              <button type="button" className="btn btn-sm btn-outline-dark me-2" onClick={() => router.push(listHref)}>
                Back to list
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => {
                  loadErrToastRef.current = null;
                  void loadOne().then((r) => {
                    if (r) toast.success("GRN loaded.");
                  });
                }}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {grn && row && (
          <>
            <VendorReceiptDetailKpiStrip branchId={branchId} grn={row} />

            <GrnStatusTimeline grn={row} />

            <VendorReceiptDetailSectionTabs
              branchId={branchId}
              grnDraft={grn}
              grnRow={row}
              initialTab={initialTab}
              focusDiscrepancy={focusDiscrepancy}
            />

            <div className="card radius-12 border mb-4">
              <div className="card-header py-2 px-3">
                <h6 className="mb-0 fw-semibold">Workflow</h6>
              </div>
              <div className="card-body py-3 px-3">
                <p className="text-muted small mb-3 mb-md-2">
                  Confirm receive posts stock to branch inventory. Additional prints are under the Documents tab.
                </p>
                <VendorReceiptDetailPrintActions grnId={grn.id} hasDiscrepancy={!!hasDiscrepancy} />

                {showManagerEditor && (
                  <div className="mt-3 pt-3 border-top">
                    <ManagerReceiveEditor
                      grn={grn}
                      suppressSuccessToast
                      onDraftSaved={() => void loadOne()}
                      onDone={async () => {
                        const next = await loadOne();
                        if (next?.status === "RECEIVED") onConfirmedPosted();
                      }}
                    />
                  </div>
                )}

                {!showManagerEditor && grn.status !== "RECEIVED" && (
                  <div className="mt-3 pt-3 border-top">
                    <VendorReceiveGrnCard
                      grn={grn}
                      perms={perms}
                      branchId={branchId}
                      hideLinesTable
                      hideVendorReceiptPrints
                      suppressManagerConfirmToast
                      initialOpenManagerEditor={focusConfirm && isManager}
                      onRefresh={async () => {
                        const next = await loadOne();
                        if (next?.status === "RECEIVED") onConfirmedPosted();
                      }}
                    />
                  </div>
                )}

                {!showManagerEditor && grn.status === "RECEIVED" && (
                  <div className="alert alert-success radius-12 py-2 px-3 small mb-0 mt-3">
                    <i className="ri-checkbox-circle-line me-1" />
                    Stock has been posted to branch inventory for this GRN. View it in the list under{" "}
                    <Link href={`${listHref}?tab=history`}>History</Link>.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </StaffBranchLayout>
  );
}
