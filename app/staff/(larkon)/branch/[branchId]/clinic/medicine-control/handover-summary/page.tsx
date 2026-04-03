"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffClinicHandoverSummary } from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace } from "@/src/components/dashboard";

const PERMS = ["medicine.reconciliation.read", "medicine.vial.use"];

export default function HandoverSummaryPage() {
  const params = useParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading } = useBranchContext(branchId);
  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = PERMS.some((p) => permissions.includes(p));

  const [data, setData] = useState<{
    activeVialSessions: Array<{ id: number; variantId: number; variantTitle: string; remainingQty: number; validUntil: string | null }>;
    pendingTokenCount: number;
    pendingTokens: Array<{ id: number; tokenCode: string; variantTitle: string; expectedDose: number }>;
    expiredVialsInWindow: Array<{ id: number; variantTitle: string; validUntil: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);

  const load = useCallback(() => {
    if (!branchId) return;
    setLoading(true);
    staffClinicHandoverSummary(branchId, { expiredWithinHours: hours })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [branchId, hours]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) {
    return (
      <div className="py-40 px-3 text-center">
        <div className="spinner-border text-primary" />
      </div>
    );
  }
  if (!hasAccess) {
    return <AccessDenied missingPerm="medicine.reconciliation.read" onBack={() => window.history.back()} />;
  }

  return (
    <PageWorkspace>
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex align-items-center gap-12 mb-24 flex-wrap">
        <Link href={`/staff/branch/${branchId}/clinic/medicine-control`} className="btn btn-outline-secondary btn-sm">
          ← Medicine Control
        </Link>
        <h5 className="mb-0">Handover Summary</h5>
        <select
          className="form-select form-select-sm w-auto"
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
        >
          <option value={12}>Expired in last 12h</option>
          <option value={24}>Expired in last 24h</option>
          <option value={48}>Expired in last 48h</option>
        </select>
        <button type="button" className="btn btn-sm btn-primary" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {loading && !data ? (
        <div className="text-center py-5 text-muted">Loading…</div>
      ) : (
        <div className="row g-3">
          <div className="col-12 col-lg-6">
            <div className="card radius-12 h-100">
              <div className="card-header">
                <strong>Active vial sessions</strong>
                <span className="badge bg-primary ms-2">{data?.activeVialSessions?.length ?? 0}</span>
              </div>
              <div className="card-body">
                {!data?.activeVialSessions?.length ? (
                  <p className="text-muted small mb-0">None</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm mb-0">
                      <thead>
                        <tr>
                          <th>Variant</th>
                          <th>Remaining</th>
                          <th>Valid until</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.activeVialSessions.map((v) => (
                          <tr key={v.id}>
                            <td>{v.variantTitle}</td>
                            <td>{v.remainingQty}</td>
                            <td>{v.validUntil ? new Date(v.validUntil).toLocaleString() : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-6">
            <div className="card radius-12 h-100">
              <div className="card-header">
                <strong>Pending tokens</strong>
                <span className="badge bg-warning text-dark ms-2">{data?.pendingTokenCount ?? 0}</span>
              </div>
              <div className="card-body">
                {!data?.pendingTokens?.length ? (
                  <p className="text-muted small mb-0">None</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm mb-0">
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Variant</th>
                          <th>Dose</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.pendingTokens.map((t) => (
                          <tr key={t.id}>
                            <td><code>{t.tokenCode}</code></td>
                            <td>{t.variantTitle}</td>
                            <td>{t.expectedDose}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="col-12">
            <div className="card radius-12">
              <div className="card-header">
                <strong>Expired vials in window</strong>
                <span className="badge bg-secondary ms-2">{data?.expiredVialsInWindow?.length ?? 0}</span>
              </div>
              <div className="card-body">
                {!data?.expiredVialsInWindow?.length ? (
                  <p className="text-muted small mb-0">None</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm mb-0">
                      <thead>
                        <tr>
                          <th>Variant</th>
                          <th>Valid until</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.expiredVialsInWindow.map((v) => (
                          <tr key={v.id}>
                            <td>{v.variantTitle}</td>
                            <td>{new Date(v.validUntil).toLocaleString()}</td>
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
    </PageWorkspace>
  );
}
