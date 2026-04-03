"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { warehouseAccessible, qcInspectionsList } from "@/lib/api";
import StaffBranchLayout from "@/src/components/branch/StaffBranchLayout";
import { useBranchContext } from "@/lib/useBranchContext";
import { getWarehouseCapabilities } from "@/src/lib/warehouseRbac";
import WarehouseAccessFallback from "../_components/WarehouseAccessFallback";

export default function StaffWarehouseQcPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const branchId = String(params?.branchId ?? "");
  const whQ = searchParams.get("wh");
  const { myAccess } = useBranchContext(branchId);
  const caps = getWarehouseCapabilities(myAccess?.permissions ?? []);

  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWhId, setSelectedWhId] = useState<number | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!caps.canViewQc) {
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await warehouseAccessible().catch(() => []);
        const arr = Array.isArray(list) ? list : [];
        if (cancelled) return;
        setWarehouses(arr);
        const fromQ = whQ ? Number(whQ) : null;
        const pick =
          (fromQ && arr.some((w) => Number(w.id) === fromQ) ? fromQ : null) ??
          (arr[0]?.id ? Number(arr[0].id) : null);
        setSelectedWhId(pick);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [whQ, caps.canViewQc]);

  const selectedWh = useMemo(
    () => warehouses.find((w) => Number(w.id) === selectedWhId) || null,
    [warehouses, selectedWhId]
  );

  useEffect(() => {
    if (!selectedWhId || !selectedWh?.orgId) {
      setData(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setListLoading(true);
      try {
        const q = await qcInspectionsList(selectedWh.orgId, {
          warehouseId: selectedWhId,
          status: "PENDING",
          page: 1,
        });
        if (!cancelled) setData(q);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load queue");
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedWhId, selectedWh?.orgId]);

  const items = (data as any)?.items ?? [];

  if (loading) {
    return (
      <StaffBranchLayout branchId={branchId} requiredPermission={null}>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
          <p className="mt-2 text-muted">Loading QC queue...</p>
        </div>
      </StaffBranchLayout>
    );
  }

  return (
    <StaffBranchLayout branchId={branchId} requiredPermission={null}>
      {!caps.canViewQc ? (
        <WarehouseAccessFallback
          branchId={branchId}
          title="QC queue permission required"
          message="QC queue is available only for staff with quality-control access."
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
              <li className="breadcrumb-item active">QC Queue</li>
            </ol>
          </nav>
          <h5 className="mb-1 fw-semibold">QC Queue</h5>
          <p className="text-muted small mb-0">Quality control inspections and approvals.</p>
        </div>
        {warehouses.length > 0 && (
          <select
            className="form-select form-select-sm"
            style={{ maxWidth: 280 }}
            value={selectedWhId ?? ""}
            onChange={(e) => {
              const id = Number(e.target.value) || null;
              setSelectedWhId(id);
              if (id) {
                window.history.replaceState(null, "", `/staff/branch/${branchId}/warehouse/qc?wh=${id}`);
              }
            }}
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} (#{w.id})
              </option>
            ))}
          </select>
        )}
      </div>
      
      {selectedWh && <p className="text-muted small mb-3">{selectedWh.name}</p>}
      {error && (
        <div className="alert alert-danger radius-12 d-flex align-items-center justify-content-between mb-3">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      {!selectedWhId && (
        <div className="alert alert-info radius-12 mb-3">No warehouse access.</div>
      )}

      {selectedWhId && (
        <div className="card radius-12 border">
          <div className="card-body p-0">
            {listLoading ? (
              <div className="text-center py-4 text-muted">Loading…</div>
            ) : items.length === 0 ? (
              <div className="text-center py-5 text-muted">No pending QC.</div>
            ) : (
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>GRN</th>
                    <th>SKU</th>
                    <th>Qty</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((row: any) => (
                    <tr key={row.id}>
                      <td>{row.id}</td>
                      <td>{row.grnId}</td>
                      <td>{row.variant?.sku}</td>
                      <td>{row.expectedQty}</td>
                      <td>
                        <Link
                          href={`/staff/branch/${branchId}/warehouse/qc/${row.id}?wh=${selectedWhId}`}
                          className="btn btn-sm btn-outline-primary radius-12"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
        </>
      )}
    </StaffBranchLayout>
  );
}
