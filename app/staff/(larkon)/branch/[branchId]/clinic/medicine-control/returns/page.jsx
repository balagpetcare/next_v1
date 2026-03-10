"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffClinicVialReturnsPending, staffClinicVialReturnMarkReturned } from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { toast } from "react-toastify";

const PERMS = ["medicine.return.submit", "medicine.return.verify"];

export default function VialReturnsPage() {
  const params = useParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading } = useBranchContext(branchId);
  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = PERMS.some((p) => permissions.includes(p));
  const canVerify = permissions.includes("medicine.return.verify");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);

  const load = useCallback(() => {
    if (!branchId) return;
    setLoading(true);
    staffClinicVialReturnsPending(branchId)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkReturned = useCallback(
    (controlId) => {
      if (!branchId) return;
      setActingId(controlId);
      staffClinicVialReturnMarkReturned(branchId, controlId)
        .then(() => {
          toast.success("Return verified.");
          load();
        })
        .catch((e) => toast.error(e?.message || "Failed"))
        .finally(() => setActingId(null));
    },
    [branchId, load]
  );

  if (isLoading) return <div className="container py-40 text-center"><div className="spinner-border text-primary" /></div>;
  if (!hasAccess) return <AccessDenied missingPerm="medicine.return.submit" onBack={() => window.history.back()} />;

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex align-items-center gap-12 mb-24 flex-wrap">
        <Link href={`/staff/branch/${branchId}/clinic/medicine-control`} className="btn btn-outline-secondary btn-sm">← Medicine Control</Link>
        <h5 className="mb-0">Vial Returns</h5>
        <button type="button" className="btn btn-sm btn-outline-primary radius-12" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>
      <div className="card radius-12">
        <div className="card-body">
          <p className="text-muted small mb-3">Pending returns (due or not yet returned). Submit returns via treatment/vial flow; verify below.</p>
          {loading ? (
            <div className="text-center py-4"><span className="spinner-border spinner-border-sm text-primary" /></div>
          ) : items.length === 0 ? (
            <p className="text-muted mb-0">No pending vial returns.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Variant / SKU</th>
                    <th>Return due</th>
                    <th>Case</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>{r.variant?.sku ?? r.variantId ?? "—"}</td>
                      <td>{r.returnDueAt ? new Date(r.returnDueAt).toLocaleString() : "—"}</td>
                      <td>{r.clinicalCaseId != null ? `#${r.clinicalCaseId}` : "—"}</td>
                      <td className="text-end">
                        {canVerify && (
                          <button type="button" className="btn btn-sm btn-outline-success radius-8" onClick={() => handleMarkReturned(r.id)} disabled={actingId === r.id}>
                            {actingId === r.id ? "…" : "Mark returned"}
                          </button>
                        )}
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
  );
}
