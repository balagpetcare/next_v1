"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import EmptyState from "@/src/components/dashboard/EmptyState";
import StatusBadge from "@/src/components/dashboard/StatusBadge";
import { staffClinicApprovalRequestsList, staffApprovalDecide } from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";

const REQUEST_TYPE_LABELS = {
  PACKAGE_CREATE: "Create Package",
  PACKAGE_UPDATE: "Update Package",
  DOCTOR_INVITE: "Doctor Invite",
  DOCTOR_SCHEDULE: "Doctor Schedule",
  DISCOUNT_CHANGE: "Discount Change",
  SERVICE_CREATE: "New Service",
  INVENTORY_PURCHASE: "Inventory Purchase",
  DOCTOR_FEE_CHANGE: "Doctor Fee Change",
  DOCTOR_ACTIVATION: "Doctor Activation",
  DOCTOR_DEACTIVATION: "Doctor Deactivation",
  DOCTOR_SERVICE_PRIVILEGE: "Doctor Service Privilege",
  DOCTOR_PACKAGE_PRIVILEGE: "Doctor Package Privilege",
  DOCTOR_LEAVE: "Doctor Leave",
  DOCTOR_CREDENTIAL: "Doctor Credential",
};

function labelForType(type) {
  return REQUEST_TYPE_LABELS[type] ?? type ?? "—";
}

export default function StaffApprovalsPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading } = useBranchContext(branchId);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [actioningId, setActioningId] = useState(null);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = permissions.includes("approvals.view") || permissions.includes("approvals.manage");
  const canDecide = permissions.includes("approvals.manage");

  const loadRequests = useCallback(() => {
    if (!branchId) return;
    setLoading(true);
    setError("");
    staffClinicApprovalRequestsList(branchId, { status: statusFilter || undefined })
      .then((list) => setRequests(Array.isArray(list) ? list : []))
      .catch((e) => {
        setError(e?.message ?? "Failed to load approvals");
        setRequests([]);
      })
      .finally(() => setLoading(false));
  }, [branchId, statusFilter]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  async function handleDecide(requestId, decision, rejectReason) {
    if (!branchId || !canDecide) return;
    setActioningId(requestId);
    setError("");
    try {
      await staffApprovalDecide(branchId, requestId, { decision, rejectReason });
      await loadRequests();
    } catch (e) {
      setError(e?.message ?? "Action failed");
    } finally {
      setActioningId(null);
    }
  }

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
        onBack={() => router.back()}
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

      {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

      <Card title="Clinic approval queue" subtitle="Pending and recent approval requests for this branch.">
        <div className="mb-3">
          <select
            className="form-select form-select-sm"
            style={{ width: 160 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="">All</option>
          </select>
        </div>
        {loading ? (
          <div className="py-24 text-center text-secondary-light">Loading…</div>
        ) : requests.length === 0 ? (
          <EmptyState
            title="No approval requests"
            description="When colleagues request package changes, doctor invites, or other approvals, they will appear here."
            icon="ri:checkbox-multiple-line"
            action={
              <div className="d-flex flex-wrap justify-content-center gap-2">
                <Link href={`/staff/branch/${branchId}/clinic/doctors/approvals`} className="btn btn-outline-primary btn-sm radius-8">
                  Doctor approvals
                </Link>
                <Link href={`/staff/branch/${branchId}/clinic/catalog`} className="btn btn-outline-secondary btn-sm radius-8">
                  Catalog
                </Link>
              </div>
            }
          />
        ) : (
          <div className="table-responsive">
            <table className="table table-sm table-hover">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Requested by</th>
                  <th>Created</th>
                  <th>Status</th>
                  {canDecide && statusFilter === "PENDING" && <th className="text-end">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => {
                  const requestedBy = r.requestedBy?.profile?.displayName ?? r.requestedBy?.auth?.email ?? "—";
                  const created = r.createdAt ? new Date(r.createdAt).toLocaleString() : "—";
                  const acting = actioningId === r.id;
                  return (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>{labelForType(r.requestType)}</td>
                      <td>{requestedBy}</td>
                      <td>{created}</td>
                      <td><StatusBadge status={r.status} /></td>
                      {canDecide && statusFilter === "PENDING" && (
                        <td className="text-end">
                          {r.status === "PENDING" && (
                            <div className="btn-group btn-group-sm">
                              <button
                                type="button"
                                className="btn btn-outline-success"
                                onClick={() => handleDecide(r.id, "APPROVED")}
                                disabled={acting}
                              >
                                {acting ? "…" : "Approve"}
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-danger"
                                onClick={() => {
                                  const reason = window.prompt("Reject reason (optional):");
                                  handleDecide(r.id, "REJECTED", reason ?? undefined);
                                }}
                                disabled={acting}
                              >
                                {acting ? "…" : "Reject"}
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="card radius-12 mt-3">
        <div className="card-body p-24">
          <h6 className="fw-semibold mb-2">Other approval queues</h6>
          <ul className="mb-0">
            <li>
              <Link href={`/staff/branch/${branchId}/inventory/transfers`}>Inventory transfers</Link> — Approve or reject transfer requests.
            </li>
            <li>
              <Link href={`/staff/branch/${branchId}/clinic/medicine-control/dispense-requests`}>Dispense requests</Link> — Approve or issue medicine dispense requests (clinic branches).
            </li>
            <li>
              <Link href={`/staff/branch/${branchId}/clinic/doctors/approvals`}>Doctor approvals</Link> — Doctor-specific pending approvals.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
