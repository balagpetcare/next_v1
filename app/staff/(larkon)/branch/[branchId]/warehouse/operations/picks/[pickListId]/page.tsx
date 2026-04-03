"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { pickListComplete, pickListGet, pickListStart, pickListUpdateLine } from "@/lib/api";
import { useToast } from "@/src/hooks/useToast";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";
import StaffBranchLayout from "@/src/components/branch/StaffBranchLayout";
import { useBranchContext } from "@/lib/useBranchContext";
import { getWarehouseCapabilities } from "@/src/lib/warehouseRbac";
import WarehouseAccessFallback from "../../../_components/WarehouseAccessFallback";

export default function StaffPickListDetailPage() {
  const params = useParams();
  const branchId = String(params?.branchId ?? "");
  const pickListId = String(params?.pickListId ?? "");
  const { myAccess } = useBranchContext(branchId);
  const caps = getWarehouseCapabilities(myAccess?.permissions ?? []);
  const toast = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!pickListId) return;
    setLoading(true);
    setError(null);
    try {
      const pl = await pickListGet(Number(pickListId));
      setData(pl);
    } catch (e: any) {
      setError(getMessageFromApiError(e));
    } finally {
      setLoading(false);
    }
  }, [pickListId]);

  useEffect(() => {
    if (!caps.canViewPickLists) {
      setLoading(false);
      setError(null);
      return;
    }
    load();
  }, [load, caps.canViewPickLists]);

  const lines = Array.isArray(data?.lines) ? data.lines : [];

  return (
    <StaffBranchLayout branchId={branchId} requiredPermission={null}>
      {!caps.canViewPickLists ? (
        <WarehouseAccessFallback
          branchId={branchId}
          title="Pick list permission required"
          message="You need pick list permission to access this page."
        />
      ) : (
        <>
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
        <div>
          <nav aria-label="breadcrumb" className="mb-2">
            <ol className="breadcrumb mb-0 small">
              <li className="breadcrumb-item"><Link href="/staff">Staff</Link></li>
              <li className="breadcrumb-item"><Link href="/staff/branch">Branches</Link></li>
              <li className="breadcrumb-item"><Link href={`/staff/branch/${branchId}`}>Branch #{branchId}</Link></li>
              <li className="breadcrumb-item"><Link href={`/staff/branch/${branchId}/warehouse`}>Warehouse</Link></li>
              <li className="breadcrumb-item"><Link href={`/staff/branch/${branchId}/warehouse/operations`}>Operations</Link></li>
              <li className="breadcrumb-item active">Pick #{pickListId}</li>
            </ol>
          </nav>
          <h5 className="mb-1 fw-semibold">Pick List #{pickListId}</h5>
          <p className="text-muted small mb-0">Pick list details and line items.</p>
        </div>
      </div>

      {loading && <div className="placeholder-glow py-5"><div className="placeholder col-12" /></div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && data && (
        <>
          <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
            <h4 className="mb-0">Pick list #{data.id}</h4>
            <span className="badge bg-secondary">{data.status}</span>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={busy || ["COMPLETED", "CANCELLED"].includes(String(data.status))}
              onClick={async () => {
                setBusy(true);
                try {
                  await pickListStart(Number(pickListId));
                  toast.success("Picking started");
                  await load();
                } catch (e: any) {
                  toast.error(getMessageFromApiError(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Start
            </button>
            <button
              type="button"
              className="btn btn-sm btn-success"
              disabled={busy || ["COMPLETED", "CANCELLED"].includes(String(data.status))}
              onClick={async () => {
                setBusy(true);
                try {
                  await pickListComplete(Number(pickListId));
                  toast.success("Pick completed");
                  await load();
                } catch (e: any) {
                  toast.error(getMessageFromApiError(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Complete pick
            </button>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="table-responsive">
              <table className="table mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Variant</th>
                    <th>Lot</th>
                    <th>To pick</th>
                    <th>Picked</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((ln: any) => (
                    <tr key={ln.id}>
                      <td>{ln.variant?.sku ?? ln.variantId}</td>
                      <td>{ln.lot?.lotCode ?? ln.lotId}</td>
                      <td>{ln.quantityToPick}</td>
                      <td>{ln.quantityPicked}</td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          disabled={busy}
                          onClick={async () => {
                            const v = window.prompt("Quantity picked", String(ln.quantityToPick ?? ""));
                            if (v == null) return;
                            const n = parseInt(v, 10);
                            if (!Number.isFinite(n) || n < 0) return;
                            setBusy(true);
                            try {
                              await pickListUpdateLine(Number(pickListId), ln.id, { quantityPicked: n });
                              toast.success("Line updated");
                              await load();
                            } catch (e: any) {
                              toast.error(getMessageFromApiError(e));
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          Set qty
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
        </>
      )}
    </StaffBranchLayout>
  );
}
