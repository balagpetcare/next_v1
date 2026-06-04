"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { pickListsList } from "@/lib/api";
import StaffBranchLayout from "@/src/components/branch/StaffBranchLayout";
import { useBranchContext } from "@/lib/useBranchContext";
import { getWarehouseCapabilities } from "@/src/lib/warehouseRbac";
import WarehouseAccessFallback from "../_components/WarehouseAccessFallback";

export default function StaffPickListsPage() {
  const params = useParams();
  const branchId = String(params?.branchId ?? "");
  const { myAccess } = useBranchContext(branchId);
  const caps = getWarehouseCapabilities(myAccess?.permissions ?? []);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!caps.canViewPickLists) {
      setLoading(false);
      setError("");
      return;
    }
    let c = false;
    (async () => {
      try {
        const bid = parseInt(branchId, 10);
        const res = await pickListsList({
          workQueue: true,
          branchId: Number.isFinite(bid) ? bid : undefined,
        });
        if (!c) setItems(res.items || []);
      } catch (e: any) {
        if (!c) setError(e?.message || "Failed to load");
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [caps.canViewPickLists, branchId]);

  return (
    <StaffBranchLayout branchId={branchId} requiredPermission={null}>
      {!caps.canViewPickLists ? (
        <WarehouseAccessFallback
          branchId={branchId}
          title="Pick list permission required"
          message="Your role can access warehouse pages, but Pick Lists are restricted."
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
              <li className="breadcrumb-item active">Pick Lists</li>
            </ol>
          </nav>
          <h5 className="mb-1 fw-semibold">Pick lists</h5>
          <p className="text-muted small mb-0">Unclaimed pick lists and picks assigned to you for this branch.</p>
        </div>
      </div>
      {error && (
        <div className="alert alert-danger radius-12 d-flex align-items-center justify-content-between mb-3">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setError("")}>Dismiss</button>
        </div>
      )}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
          <p className="mt-2 text-muted">Loading pick lists...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="alert alert-info radius-12 mb-3">No pick lists in your queue for this branch.</div>
      ) : (
        <div className="card radius-12 border">
          <div className="table-responsive">
            <table className="table table-sm mb-0">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Plan</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>
                      <span className="badge bg-secondary">{p.status}</span>
                    </td>
                    <td>{p.allocationPlanId}</td>
                    <td className="text-end">
                      <Link href={`/staff/branch/${branchId}/warehouse/pick-lists/${p.id}`} className="btn btn-sm btn-outline-primary radius-12">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </>
      )}
    </StaffBranchLayout>
  );
}
