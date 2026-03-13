"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffClinicInjectionMonitor } from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";

const PERMS = ["medicine.reconciliation.read", "medicine.dose.read"];

export default function StaffInjectionMonitorPage() {
  const params = useParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading } = useBranchContext(branchId);
  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = PERMS.some((p) => permissions.includes(p));

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const load = useCallback(async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      const row = await staffClinicInjectionMonitor(branchId, date);
      setData(row ?? null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [branchId, date]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) return <div className="container py-40 text-center"><div className="spinner-border text-primary" /></div>;
  if (!hasAccess) return <AccessDenied missingPerm="medicine.reconciliation.read" onBack={() => window.history.back()} />;

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex align-items-center gap-12 mb-24 flex-wrap">
        <Link href={`/staff/branch/${branchId}/clinic/medicine-control`} className="btn btn-outline-secondary btn-sm">
          ← Medicine Control
        </Link>
        <h5 className="mb-0">Injection Monitor</h5>
        <input
          type="date"
          className="form-control form-control-sm radius-8 w-auto"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <button type="button" className="btn btn-sm btn-outline-primary radius-8" onClick={load} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-3">
          <div className="card radius-12"><div className="card-body"><small className="text-muted">Pending Tokens</small><div className="fs-5 fw-semibold">{Number(data?.tokens?.PENDING ?? 0)}</div></div></div>
        </div>
        <div className="col-md-3">
          <div className="card radius-12"><div className="card-body"><small className="text-muted">Used Tokens</small><div className="fs-5 fw-semibold">{Number(data?.tokens?.USED ?? 0)}</div></div></div>
        </div>
        <div className="col-md-3">
          <div className="card radius-12"><div className="card-body"><small className="text-muted">Injections</small><div className="fs-5 fw-semibold">{Number(data?.administrations?.count ?? 0)}</div></div></div>
        </div>
        <div className="col-md-3">
          <div className="card radius-12"><div className="card-body"><small className="text-muted">mL Used</small><div className="fs-5 fw-semibold">{Number(data?.administrations?.totalMlUsed ?? 0)}</div></div></div>
        </div>
      </div>

      <div className="card radius-12">
        <div className="card-body">
          <h6 className="mb-3">Pending token queue</h6>
          {loading ? (
            <div className="text-muted">Loading...</div>
          ) : !Array.isArray(data?.pendingTokens) || data.pendingTokens.length === 0 ? (
            <div className="text-muted">No pending tokens.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Token</th>
                    <th>Visit</th>
                    <th>Variant</th>
                    <th>Dose</th>
                    <th>Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pendingTokens.map((t: any) => (
                    <tr key={t.id}>
                      <td>{t.tokenCode}</td>
                      <td>{t.visitId ?? "—"}</td>
                      <td>{t.variant?.title ?? t.variantId ?? "—"}</td>
                      <td>{String(t.expectedDose ?? "—")} {t.unit ?? ""}</td>
                      <td>{t.expiresAt ? new Date(t.expiresAt).toLocaleString() : "—"}</td>
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

