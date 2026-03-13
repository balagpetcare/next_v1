"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import { apiGet } from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";

const MEDICINE_PERMS = ["medicine.policy.read", "medicine.dispense.request", "medicine.dispense.approve", "medicine.vial.open"];

export default function MedicineControlDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = MEDICINE_PERMS.some((p) => permissions.includes(p));

  useEffect(() => {
    if (!branchId || !hasAccess) return;
    let cancelled = false;
    setLoading(true);
    apiGet(`/api/v1/clinic/branches/${branchId}/medicine-control/dashboard/branch`)
      .then((res) => { if (!cancelled) setDashboard(res?.data ?? {}); })
      .catch(() => { if (!cancelled) setDashboard({}); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [branchId, hasAccess]);

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        missingPerm="medicine.policy.read"
        onBack={() => router.push(`/staff/branch/${branchId}/clinic`)}
      />
    );
  }

  const base = `/staff/branch/${branchId}/clinic/medicine-control`;
  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex align-items-center gap-12 mb-24">
        <Link href={`/staff/branch/${branchId}/clinic`} className="btn btn-outline-secondary btn-sm">
          ← Clinic
        </Link>
        <h5 className="mb-0">Medicine Control (CCMLPA)</h5>
      </div>

      {loading && <div className="mb-24 text-center text-secondary-light">Loading...</div>}
      {!loading && dashboard && (
        <div className="row g-3 mb-24">
          <div className="col-md-2">
            <div className="card radius-12 h-100">
              <div className="card-body">
                <h6 className="text-muted text-uppercase small mb-1">Issued today</h6>
                <p className="mb-0 fs-4 fw-semibold">{dashboard.issuedToday ?? 0}</p>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card radius-12 h-100">
              <div className="card-body">
                <h6 className="text-muted text-uppercase small mb-1">Unresolved returns</h6>
                <p className="mb-0 fs-4 fw-semibold">{dashboard.unresolvedReturns ?? 0}</p>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card radius-12 h-100">
              <div className="card-body">
                <h6 className="text-muted text-uppercase small mb-1">Active vials</h6>
                <p className="mb-0 fs-4 fw-semibold">{dashboard.activeSessions ?? 0}</p>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card radius-12 h-100">
              <div className="card-body">
                <h6 className="text-muted text-uppercase small mb-1">Pending approvals</h6>
                <p className="mb-0 fs-4 fw-semibold">{dashboard.pendingApprovals ?? 0}</p>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card radius-12 h-100">
              <div className="card-body">
                <h6 className="text-muted text-uppercase small mb-1">Tokens generated</h6>
                <p className="mb-0 fs-4 fw-semibold">{dashboard?.injectionMonitor?.tokensGenerated ?? 0}</p>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card radius-12 h-100">
              <div className="card-body">
                <h6 className="text-muted text-uppercase small mb-1">Flagged recon</h6>
                <p className="mb-0 fs-4 fw-semibold">{dashboard?.reconciliation?.flaggedOpen ?? 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card radius-12">
        <div className="card-body">
          <h6 className="mb-16">Quick links</h6>
          <div className="d-flex flex-wrap gap-2">
            <Link href={`${base}/dispense-requests`} className="btn btn-outline-primary btn-sm">Dispense Requests</Link>
            <Link href={`${base}/active-vials`} className="btn btn-outline-primary btn-sm">Active Vials</Link>
            <Link href={`${base}/returns`} className="btn btn-outline-primary btn-sm">Vial Returns</Link>
            <Link href={`${base}/audit-bins`} className="btn btn-outline-primary btn-sm">Audit Bins</Link>
            <Link href={`${base}/policies`} className="btn btn-outline-primary btn-sm">Policies</Link>
            <Link href={`${base}/injection-tokens`} className="btn btn-outline-primary btn-sm">Injection Tokens</Link>
            <Link href={`${base}/injection-room`} className="btn btn-outline-primary btn-sm">Injection Room</Link>
            <Link href={`${base}/injection-monitor`} className="btn btn-outline-primary btn-sm">Injection Monitor</Link>
            <Link href={`${base}/reconciliation`} className="btn btn-outline-primary btn-sm">Reconciliation</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
