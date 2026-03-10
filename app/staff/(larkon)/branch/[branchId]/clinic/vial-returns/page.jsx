"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffClinicVialReturnsPending, staffClinicVialReturnMarkReturned } from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { toast } from "react-toastify";

export default function StaffClinicVialReturnsPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [markingId, setMarkingId] = useState(null);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasRead = permissions.some((p) => p === "clinic.consumption.read");
  const hasWrite = permissions.some((p) => p === "clinic.consumption.write");

  const load = useCallback(() => {
    if (!branchId) return;
    setLoading(true);
    staffClinicVialReturnsPending(branchId, { overdueOnly })
      .then((list) => setItems(Array.isArray(list) ? list : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [branchId, overdueOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkReturned = useCallback(
    (controlId) => {
      if (!branchId || !hasWrite) return;
      setMarkingId(controlId);
      staffClinicVialReturnMarkReturned(branchId, controlId)
        .then(() => {
          toast.success("Marked as returned.");
          load();
        })
        .catch((e) => toast.error(e?.message || "Failed"))
        .finally(() => setMarkingId(null));
    },
    [branchId, hasWrite, load]
  );

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }

  if (!hasRead) {
    return (
      <AccessDenied
        missingPerm="clinic.consumption.read"
        onBack={() => router.push(`/staff/branch/${branchId}/clinic`)}
      />
    );
  }

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex align-items-center gap-12 mb-24 flex-wrap">
        <Link href={`/staff/branch/${branchId}/clinic`} className="btn btn-outline-secondary btn-sm">
          ← Clinic
        </Link>
        <h5 className="mb-0">Vial returns (surgery / consumption)</h5>
      </div>

      <div className="card radius-12 mb-4">
        <div className="card-body">
          <div className="d-flex align-items-center gap-3 mb-3">
            <label className="form-check mb-0">
              <input
                type="checkbox"
                className="form-check-input"
                checked={overdueOnly}
                onChange={(e) => setOverdueOnly(e.target.checked)}
              />
              <span className="form-check-label small">Overdue only</span>
            </label>
            <button type="button" className="btn btn-sm btn-primary radius-12" onClick={load} disabled={loading}>
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
          {loading ? (
            <div className="text-center py-4">
              <span className="spinner-border spinner-border-sm text-primary" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-muted mb-0">No pending vial returns.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Variant (SKU / Title)</th>
                    <th>Due date</th>
                    <th>Case</th>
                    {hasWrite && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id}>
                      <td>{row.id}</td>
                      <td>
                        {row.variant ? `${row.variant.sku ?? ""} — ${row.variant.title ?? ""}` : "—"}
                      </td>
                      <td>{row.returnDueAt ? new Date(row.returnDueAt).toLocaleDateString() : "—"}</td>
                      <td>{row.clinicalCaseId != null ? `#${row.clinicalCaseId}` : "—"}</td>
                      {hasWrite && (
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-success radius-8"
                            onClick={() => handleMarkReturned(row.id)}
                            disabled={markingId === row.id}
                          >
                            {markingId === row.id ? "…" : "Mark returned"}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
