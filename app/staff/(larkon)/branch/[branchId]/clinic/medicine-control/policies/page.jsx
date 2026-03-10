"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffClinicMedicinePoliciesList } from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";

const PERMS = ["medicine.policy.read", "medicine.policy.manage"];

export default function MedicinePoliciesPage() {
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
    staffClinicMedicinePoliciesList(branchId)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) return <div className="container py-40 text-center"><div className="spinner-border text-primary" /></div>;
  if (!hasAccess) return <AccessDenied missingPerm="medicine.policy.read" onBack={() => window.history.back()} />;

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex align-items-center gap-12 mb-24 flex-wrap">
        <Link href={`/staff/branch/${branchId}/clinic/medicine-control`} className="btn btn-outline-secondary btn-sm">← Medicine Control</Link>
        <h5 className="mb-0">Medicine Policies</h5>
        <button type="button" className="btn btn-sm btn-outline-primary radius-12" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>
      <div className="card radius-12">
        <div className="card-body">
          <p className="text-muted small mb-3">Policies per variant (reuse, return window, retention). Configure via API or future form.</p>
          {loading ? (
            <div className="text-center py-4"><span className="spinner-border spinner-border-sm text-primary" /></div>
          ) : items.length === 0 ? (
            <p className="text-muted mb-0">No policies configured. Use API <code>POST /medicine-control/policy</code> to create.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Variant ID</th>
                    <th>Reuse allowed</th>
                    <th>Return window (days)</th>
                    <th>Retention (days)</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p.variantId ?? p.id}>
                      <td>{p.variantId ?? p.id ?? "—"}</td>
                      <td>{p.reuseAllowed == null ? "—" : p.reuseAllowed ? "Yes" : "No"}</td>
                      <td>{p.returnWindowDays ?? "—"}</td>
                      <td>{p.retentionDays ?? "—"}</td>
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
