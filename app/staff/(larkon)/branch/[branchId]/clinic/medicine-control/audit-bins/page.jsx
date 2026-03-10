"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffClinicAuditBinsList } from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";

const PERMS = ["medicine.audit.bin.view", "medicine.audit.bin.manage"];

export default function AuditBinsPage() {
  const params = useParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading } = useBranchContext(branchId);
  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = PERMS.some((p) => permissions.includes(p));

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!branchId) return;
    setLoading(true);
    staffClinicAuditBinsList(branchId)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) return <div className="container py-40 text-center"><div className="spinner-border text-primary" /></div>;
  if (!hasAccess) return <AccessDenied missingPerm="medicine.audit.bin.view" onBack={() => window.history.back()} />;

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex align-items-center gap-12 mb-24 flex-wrap">
        <Link href={`/staff/branch/${branchId}/clinic/medicine-control`} className="btn btn-outline-secondary btn-sm">← Medicine Control</Link>
        <h5 className="mb-0">Audit Bins</h5>
        <button type="button" className="btn btn-sm btn-outline-primary radius-12" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>
      <div className="card radius-12">
        <div className="card-body">
          <p className="text-muted small mb-3">Audit trail bins for returned vials and retention. Seal and destroy via API or future actions.</p>
          {loading ? (
            <div className="text-center py-4"><span className="spinner-border spinner-border-sm text-primary" /></div>
          ) : items.length === 0 ? (
            <p className="text-muted mb-0">No audit bins. Bins are created when returns are assigned to a bin.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Sealed / Destroyed</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((b) => (
                    <tr key={b.id}>
                      <td>{b.id}</td>
                      <td><span className="badge radius-8 bg-secondary">{b.status ?? "ACTIVE"}</span></td>
                      <td>{b.createdAt ? new Date(b.createdAt).toLocaleString() : "—"}</td>
                      <td>{b.sealedAt ? new Date(b.sealedAt).toLocaleString() : "—"} / {b.destroyedAt ? new Date(b.destroyedAt).toLocaleString() : "—"}</td>
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
