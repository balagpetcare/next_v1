"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import LkFormGroup from "@larkon-ui/components/LkFormGroup";
import LkSelect from "@larkon-ui/components/LkSelect";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffStockRequestCreatePath, staffStockRequestDetailPath } from "@/lib/staffInventoryRoutes";
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
      
      {/* Page Header with Breadcrumbs */}
      <nav aria-label="breadcrumb" className="mb-2">
        <ol className="breadcrumb mb-0 small">
          <li className="breadcrumb-item"><Link href="/staff">Staff</Link></li>
          <li className="breadcrumb-item"><Link href="/staff/branch">Branches</Link></li>
          <li className="breadcrumb-item"><Link href={`/staff/branch/${branchId}`}>{branch?.name || `Branch #${branchId}`}</Link></li>
          <li className="breadcrumb-item"><Link href={`/staff/branch/${branchId}/inventory`}>Inventory</Link></li>
          <li className="breadcrumb-item active">Stock Requests</li>
        </ol>
      </nav>
      
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <div>
          <h5 className="mb-0">Stock Requests</h5>
          <p className="text-muted small mb-0">Request stock from warehouse or owner</p>
        </div>
        {canCreate && (
          <Link href={staffStockRequestCreatePath(branchId)} className="btn btn-primary btn-sm radius-12">
            <i className="ri-add-line me-1" aria-hidden />
            New Request
          </Link>
        )}
      </div>
      {error && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between mb-3 radius-12">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setError("")}>Dismiss</button>
        </div>
      )}
      <Card>
        <div className="mb-16">
          <LkFormGroup label="Status" className="d-inline-block me-8">
            <LkSelect
              size="sm"
              className="d-inline-block radius-12"
              style={{ width: "auto" }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </LkSelect>
          </LkFormGroup>
        </div>
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" aria-label="Loading" />
            <p className="mt-2 text-secondary small">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-5 px-3">
            <div className="mb-3 text-muted">
              <i className="ri-file-list-3-line display-4" aria-hidden />
            </div>
            <h6 className="fw-semibold mb-2">No stock requests found</h6>
            <p className="text-muted small mb-4">
              {statusFilter ? "Try adjusting your filters" : "Create a stock request to order products from warehouse or owner"}
            </p>
            {canCreate && !statusFilter && (
              <Link href={staffStockRequestCreatePath(branchId)} className="btn btn-primary btn-sm radius-12">
                <i className="ri-add-line me-1" aria-hidden />
                Create Stock Request
              </Link>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm table-hover">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th>Total Qty</th>
                  <th>Requester</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => {
                  const totalQty = (r.items || []).reduce((sum, item) => sum + (item.requestedQty || 0), 0);
                  return (
                    <tr key={r.id}>
                      <td>#{r.id}</td>
                      <td>{formatDate(r.createdAt)}</td>
                      <td><span className={`badge ${statusBadgeClass(r.status)}`}>{r.status}</span></td>
                      <td>{r.items?.length ?? 0}</td>
                      <td className="fw-semibold">{totalQty}</td>
                      <td>{r.requester?.profile?.displayName ?? `User ${r.requesterUserId}`}</td>
                      <td>
                        <Link href={staffStockRequestDetailPath(branchId, r.id)} className="btn btn-sm btn-outline-primary radius-12">
                          <i className="ri-eye-line me-1" aria-hidden />
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
