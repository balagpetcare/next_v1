"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { pickListsList, warehouseAccessible, warehouseDispatches } from "@/lib/api";
import { useToast } from "@/src/hooks/useToast";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";
import StaffBranchLayout from "@/src/components/branch/StaffBranchLayout";
import { useBranchContext } from "@/lib/useBranchContext";
import { getWarehouseCapabilities } from "@/src/lib/warehouseRbac";
import WarehouseAccessFallback from "../_components/WarehouseAccessFallback";

export default function WarehouseOperationsPage() {
  const params = useParams();
  const branchId = String(params?.branchId ?? "");
  const toast = useToast();
  const { myAccess } = useBranchContext(branchId);
  const caps = getWarehouseCapabilities(myAccess?.permissions ?? []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [picks, setPicks] = useState<any[]>([]);
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [whId, setWhId] = useState<number | null>(null);

  useEffect(() => {
    if (!caps.canViewOperations) {
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const whList = await warehouseAccessible().catch(() => []);
        const first = Array.isArray(whList) && whList.length ? Number((whList[0] as any)?.id) : null;
        if (!cancelled) setWhId(Number.isFinite(first) ? first : null);

        const [pl, disp] = await Promise.all([
          pickListsList({}).catch(() => ({ items: [] })),
          first
            ? warehouseDispatches(first, { take: 20 }).catch(() => [])
            : Promise.resolve([]),
        ]);
        if (!cancelled) {
          setPicks(Array.isArray((pl as any)?.items) ? (pl as any).items : []);
          setDispatches(Array.isArray(disp) ? disp : []);
        }
      } catch (e: any) {
        if (!cancelled) {
          const msg = getMessageFromApiError(e);
          setError(msg);
          toast.error(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [branchId, toast, caps.canViewOperations]);

  return (
    <StaffBranchLayout branchId={branchId} requiredPermission={null}>
      {!caps.canViewOperations ? (
        <WarehouseAccessFallback
          branchId={branchId}
          title="Operations hub permission required"
          message="You can open the warehouse workspace, but Operations Hub needs additional permission."
        />
      ) : (
        <>
      {/* Page title + breadcrumb */}
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
        <div>
          <nav aria-label="breadcrumb" className="mb-2">
            <ol className="breadcrumb mb-0 small">
              <li className="breadcrumb-item"><Link href="/staff">Staff</Link></li>
              <li className="breadcrumb-item"><Link href="/staff/branch">Branches</Link></li>
              <li className="breadcrumb-item"><Link href={`/staff/branch/${branchId}`}>Branch #{branchId}</Link></li>
              <li className="breadcrumb-item"><Link href={`/staff/branch/${branchId}/warehouse`}>Warehouse</Link></li>
              <li className="breadcrumb-item active">Operations</li>
            </ol>
          </nav>
          <h5 className="mb-1 fw-semibold">Fulfillment Operations</h5>
          <p className="text-muted small mb-0">Pick queues and outbound dispatches for your organization.</p>
        </div>
      </div>

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2 text-muted small">Loading operations...</p>
        </div>
      )}
      {error && !loading && (
        <div className="alert alert-danger radius-12 d-flex align-items-center justify-content-between mb-3">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {!loading && !error && (
        <div className="row g-3">
          <div className="col-lg-6">
            <div className="card radius-12 border">
              <div className="card-header border-bottom py-3">
                <strong>Open pick lists</strong>
              </div>
              <div className="card-body p-0">
                {picks.length === 0 ? (
                  <div className="p-4 text-muted text-center">No pick lists.</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover mb-0 align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>ID</th>
                          <th>Status</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {picks.map((p: any) => (
                          <tr key={p.id}>
                            <td>#{p.id}</td>
                            <td>
                              <span className="badge bg-secondary-subtle text-dark">{p.status ?? "—"}</span>
                            </td>
                            <td className="text-end">
                              <Link
                                className="btn btn-sm btn-outline-primary"
                                href={`/staff/branch/${branchId}/warehouse/operations/picks/${p.id}`}
                              >
                                Open
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="card radius-12 border">
              <div className="card-header border-bottom py-3 d-flex justify-content-between align-items-center">
                <strong>Recent dispatches</strong>
                {whId ? (
                  <span className="text-muted small">WH #{whId}</span>
                ) : (
                  <span className="text-muted small">No warehouse</span>
                )}
              </div>
              <div className="card-body p-0">
                {dispatches.length === 0 ? (
                  <div className="p-4 text-muted text-center">No dispatches.</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover mb-0 align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>ID</th>
                          <th>Status</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {(dispatches as any[]).map((d: any) => (
                          <tr key={d.id}>
                            <td>#{d.id}</td>
                            <td>
                              <span className="badge bg-info-subtle text-dark">{d.status ?? "—"}</span>
                            </td>
                            <td className="text-end">
                              <Link
                                className="btn btn-sm btn-outline-secondary"
                                href={`/staff/branch/${branchId}/inventory/receive-dispatch/${d.id}`}
                              >
                                Receive
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </StaffBranchLayout>
  );
}
