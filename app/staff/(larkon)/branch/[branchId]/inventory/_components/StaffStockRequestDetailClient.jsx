"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffStockRequestListPath } from "@/lib/staffInventoryRoutes";
import { staffStockRequestGet, staffStockRequestSubmit, staffStockRequestCancel } from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { useToast } from "@/src/hooks/useToast";

const REQUIRED_PERM = "inventory.read";

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
  return new Date(d).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function StaffStockRequestDetailClient() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const requestId = useMemo(() => String(params?.requestId ?? params?.id ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading, errorCode, hasViewPermission } = useBranchContext(branchId);
  const toast = useToast();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const permissions = myAccess?.permissions ?? [];
  const canRead = permissions.includes(REQUIRED_PERM);
  const canSubmit = permissions.includes("inventory.update") || permissions.includes("inventory.transfer");

  const listPath = staffStockRequestListPath(branchId);

  useEffect(() => {
    if (errorCode === "unauthorized") router.replace("/staff/login");
  }, [errorCode, router]);

  useEffect(() => {
    if (!canRead) return;
    const idNum = Number(requestId);
    if (!requestId || !Number.isFinite(idNum) || idNum < 1) {
      setLoading(false);
      setRequest(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    staffStockRequestGet(idNum)
      .then((data) => { if (!cancelled) setRequest(data); })
      .catch((e) => { if (!cancelled) setError(e?.message ?? "Failed to load"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [requestId, canRead]);

  const handleSubmit = async () => {
    if (!request || request.status !== "DRAFT") return;
    setActionLoading(true);
    setError("");
    try {
      await staffStockRequestSubmit(request.id);
      setRequest((r) => (r ? { ...r, status: "SUBMITTED", submittedAt: new Date().toISOString() } : r));
      toast.success("Stock request submitted successfully");
    } catch (e) {
      const msg = e?.message ?? "Failed to submit";
      setError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!request || !["DRAFT", "SUBMITTED"].includes(request.status)) return;
    if (typeof window !== "undefined" && !window.confirm("Cancel this request?")) return;
    setActionLoading(true);
    setError("");
    try {
      await staffStockRequestCancel(request.id);
      setRequest((r) => (r ? { ...r, status: "CANCELLED" } : r));
      toast.success("Stock request cancelled");
    } catch (e) {
      const msg = e?.message ?? "Failed to cancel";
      setError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const totalQty = useMemo(() => {
    return (request?.items || []).reduce((sum, item) => sum + (item.requestedQty || 0), 0);
  }, [request]);

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
        onBack={() => router.push(listPath)}
      />
    );
  }

  if (loading || !request) {
    return (
      <div className="container py-24">
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        {loading ? <p className="text-secondary-light">Loading...</p> : <p className="text-danger">Request not found.</p>}
        <Link href={listPath}>← Back to list</Link>
      </div>
    );
  }

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />

      <nav aria-label="breadcrumb" className="mb-2">
        <ol className="breadcrumb mb-0 small">
          <li className="breadcrumb-item"><Link href="/staff">Staff</Link></li>
          <li className="breadcrumb-item"><Link href="/staff/branch">Branches</Link></li>
          <li className="breadcrumb-item"><Link href={`/staff/branch/${branchId}`}>{branch?.name || `Branch #${branchId}`}</Link></li>
          <li className="breadcrumb-item"><Link href={`/staff/branch/${branchId}/inventory`}>Inventory</Link></li>
          <li className="breadcrumb-item"><Link href={listPath}>Stock Requests</Link></li>
          <li className="breadcrumb-item active">#{request.id}</li>
        </ol>
      </nav>

      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <div className="d-flex align-items-center gap-3">
          <Link href={listPath} className="btn btn-outline-secondary btn-sm radius-12">← Back</Link>
          <h5 className="mb-0">Stock Request #{request.id}</h5>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <span className={`badge ${statusBadgeClass(request.status)}`}>{request.status}</span>
          {request.requestIntent === "PROCUREMENT" ? (
            <span className="badge bg-warning text-dark">Procurement</span>
          ) : (
            <span className="badge bg-light text-dark">Transfer</span>
          )}
          {request.linkedPurchaseOrderId && (
            <span className="badge bg-info text-white">PO #{request.linkedPurchaseOrderId}</span>
          )}
        </div>
      </div>

      {request.requestIntent === "PROCUREMENT" && request.procurementNote && (
        <div className="alert alert-warning py-2 mb-3">
          <strong className="small">Procurement note:</strong>{" "}
          <span className="small">{request.procurementNote}</span>
        </div>
      )}

      <div className="row g-2 mb-3">
        <div className="col-6 col-md-3">
          <Card className="h-100">
            <div className="card-body py-2 px-3 d-flex align-items-center justify-content-between">
              <div>
                <div className="small text-muted">Items</div>
                <div className="fw-bold fs-5">{request.items?.length ?? 0}</div>
              </div>
              <i className="ri-shopping-cart-line text-primary fs-4" aria-hidden />
            </div>
          </Card>
        </div>
        <div className="col-6 col-md-3">
          <Card className="h-100">
            <div className="card-body py-2 px-3 d-flex align-items-center justify-content-between">
              <div>
                <div className="small text-muted">Total Quantity</div>
                <div className="fw-bold fs-5">{totalQty}</div>
              </div>
              <i className="ri-stack-line text-success fs-4" aria-hidden />
            </div>
          </Card>
        </div>
        <div className="col-6 col-md-3">
          <Card className="h-100">
            <div className="card-body py-2 px-3 d-flex align-items-center justify-content-between">
              <div>
                <div className="small text-muted">Requester</div>
                <div className="fw-semibold small">{request.requester?.profile?.displayName ?? `User ${request.requesterUserId}`}</div>
              </div>
              <i className="ri-user-line text-info fs-4" aria-hidden />
            </div>
          </Card>
        </div>
        <div className="col-6 col-md-3">
          <Card className="h-100">
            <div className="card-body py-2 px-3 d-flex align-items-center justify-content-between">
              <div>
                <div className="small text-muted">Branch</div>
                <div className="fw-semibold small">{branch?.name || `#${branchId}`}</div>
              </div>
              <i className="ri-building-line text-secondary fs-4" aria-hidden />
            </div>
          </Card>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between mb-3 radius-12">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setError("")}>Dismiss</button>
        </div>
      )}

      <Card title="Status Timeline" className="mb-3">
        <ul className="list-unstyled mb-0">
          <li className="d-flex align-items-center gap-2 mb-2">
            <i className="ri-file-add-line text-primary" aria-hidden />
            <span><strong>Created:</strong> {formatDate(request.createdAt)}</span>
          </li>
          {request.submittedAt && (
            <li className="d-flex align-items-center gap-2 mb-2">
              <i className="ri-send-plane-line text-info" aria-hidden />
              <span><strong>Submitted:</strong> {formatDate(request.submittedAt)}</span>
            </li>
          )}
          {request.transfers?.[0] && (
            <li className="d-flex align-items-center gap-2 mb-2">
              <i className="ri-truck-line text-success" aria-hidden />
              <span>
                <strong>Transfer #{request.transfers[0].id}:</strong> {request.transfers[0].status}
                {request.transfers[0].sentAt && ` (sent ${formatDate(request.transfers[0].sentAt)})`}
              </span>
            </li>
          )}
        </ul>
      </Card>

      <Card title="Request Items">
        <div className="table-responsive">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Product</th>
                <th>Variant / SKU</th>
                <th className="text-end">Requested Qty</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {(request.items || []).map((item) => (
                <tr key={item.id}>
                  <td className="fw-semibold">{item.product?.name ?? item.productId}</td>
                  <td>
                    <div>{item.variant?.title ?? item.variant?.sku ?? item.variantId}</div>
                    {item.variant?.sku && <small className="text-muted">{item.variant.sku}</small>}
                  </td>
                  <td className="text-end fw-semibold">{item.requestedQty}</td>
                  <td>{item.note ? <span className="small">{item.note}</span> : <span className="text-muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {request.status === "DRAFT" && canSubmit && (
        <div className="mt-3 d-flex gap-2">
          <button type="button" className="btn btn-primary btn-sm radius-12" onClick={handleSubmit} disabled={actionLoading}>
            <i className="ri-send-plane-line me-1" aria-hidden />
            {actionLoading ? "Submitting…" : "Submit Request"}
          </button>
          <button type="button" className="btn btn-outline-danger btn-sm radius-12" onClick={handleCancel} disabled={actionLoading}>
            <i className="ri-close-line me-1" aria-hidden />
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
