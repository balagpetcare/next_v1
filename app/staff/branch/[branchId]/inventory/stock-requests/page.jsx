"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffStockRequestsList } from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";

const REQUIRED_PERM = "inventory.read";
const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "OWNER_REVIEW", label: "Owner review" },
  { value: "FULFILLED_PARTIAL", label: "Fulfilled (partial)" },
  { value: "FULFILLED_FULL", label: "Fulfilled (full)" },
  { value: "DISPATCHED", label: "Dispatched" },
  { value: "RECEIVED_PARTIAL", label: "Received (partial)" },
  { value: "RECEIVED_FULL", label: "Received (full)" },
  { value: "CLOSED", label: "Closed" },
  { value: "CANCELLED", label: "Cancelled" },
];

function statusBadgeClass(status) {
  const s = String(status || "").toUpperCase();
  if (["DRAFT"].includes(s)) return "bg-secondary";
  if (["SUBMITTED", "OWNER_REVIEW"].includes(s)) return "bg-info";
  if (["FULFILLED_PARTIAL", "FULFILLED_FULL", "DISPATCHED"].includes(s)) return "bg-primary";
  if (["RECEIVED_PARTIAL", "RECEIVED_FULL", "CLOSED"].includes(s)) return "bg-success";
  if (["CANCELLED"].includes(s)) return "bg-danger";
  return "bg-light text-dark";
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" });
}

export default function StaffBranchStockRequestsPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading, errorCode, hasViewPermission } = useBranchContext(branchId);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const permissions = myAccess?.permissions ?? [];
  const canRead = permissions.includes(REQUIRED_PERM);
  const canCreate = permissions.includes("inventory.update") || permissions.includes("inventory.transfer");

  useEffect(() => {
    if (errorCode === "unauthorized") router.replace("/staff/login");
  }, [errorCode, router]);

  useEffect(() => {
    if (!branchId || !canRead) return;
    let cancelled = false;
    setLoading(true);
    staffStockRequestsList({ branchId, status: statusFilter || undefined, limit: 50 })
      .then((r) => {
        if (!cancelled) setRequests(r.items ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [branchId, canRead, statusFilter]);

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }
  if (errorCode === "forbidden" || !hasViewPermission || !canRead) {
    return (
      <AccessDenied
        missingPerm={REQUIRED_PERM}
        onBack={() => router.push(`/staff/branch/${branchId}`)}
      />
    );
  }

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-16 mb-24">
        <h5 className="mb-0">Stock Requests</h5>
        {canCreate && (
          <Link href={`/staff/branch/${branchId}/inventory/stock-requests/new`} className="btn btn-primary btn-sm">
            New Request
          </Link>
        )}
      </div>
      {error && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setError("")}>Dismiss</button>
        </div>
      )}
      <Card>
        <div className="mb-16">
          <label className="me-8">Status:</label>
          <select
            className="form-select form-select-sm d-inline-block"
            style={{ width: "auto" }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        {loading ? (
          <p className="text-secondary-light">Loading...</p>
        ) : requests.length === 0 ? (
          <p className="text-secondary-light mb-0">No stock requests. Create one to request stock from owner.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm table-hover">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th>Requester</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{formatDate(r.createdAt)}</td>
                    <td><span className={`badge ${statusBadgeClass(r.status)}`}>{r.status}</span></td>
                    <td>{r.items?.length ?? 0}</td>
                    <td>{r.requester?.profile?.displayName ?? `User ${r.requesterUserId}`}</td>
                    <td>
                      <Link href={`/staff/branch/${branchId}/inventory/stock-requests/${r.id}`} className="btn btn-sm btn-outline-primary">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
