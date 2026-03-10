"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";

export default function StaffApprovalsPage() {
  const params = useParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading } = useBranchContext(branchId);
  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = permissions.includes("approvals.view") || permissions.includes("approvals.manage");

  if (isLoading) {
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
        missingPerm="approvals.view"
        onBack={() => window.history.back()}
      />
    );
  }

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex align-items-center gap-12 mb-24 flex-wrap">
        <Link href={`/staff/branch/${branchId}`} className="btn btn-outline-secondary btn-sm">
          ← Branch
        </Link>
        <h5 className="mb-0">Approvals</h5>
      </div>
      <div className="card radius-12">
        <div className="card-body p-24">
          <h6 className="fw-semibold mb-2">Pending approvals</h6>
          <p className="text-muted small mb-3">
            Items that need your approval appear here. Use the links below for branch-specific approval queues.
          </p>
          <ul className="mb-0">
            <li>
              <Link href={`/staff/branch/${branchId}/inventory/transfers`}>Inventory transfers</Link> — Approve or reject transfer requests (if you have <code>inventory.transfer.approve</code> or <code>approvals.manage</code>).
            </li>
            <li>
              <Link href={`/staff/branch/${branchId}/clinic/medicine-control/dispense-requests`}>Dispense requests</Link> — Approve or issue medicine dispense requests (clinic branches, medicine control permission).
            </li>
            <li>
              Staff and branch access requests are managed from the Owner panel or Admin verification center.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
