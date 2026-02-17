"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffStockRequestGet, staffStockRequestSubmit, staffStockRequestCancel } from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";

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

export default function StaffBranchStockRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const id = useMemo(() => params?.id ?? "", [params]);
  const { branch, myAccess, isLoading: ctxLoading, errorCode, hasViewPermission } = useBranchContext(branchId);

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const permissions = myAccess?.permissions ?? [];
  const canRead = permissions.includes(REQUIRED_PERM);
  const canSubmit = permissions.includes("inventory.update") || permissions.includes("inventory.transfer");

  useEffect(() => {
    if (errorCode === "unauthorized") router.replace("/staff/login");
  }, [errorCode, router]);

  useEffect(() => {
    if (!id || !canRead) return;
    let cancelled = false;
    setLoading(true);
    staffStockRequestGet(Number(id))
      .then((data) => { if (!cancelled) setRequest(data); })
      .catch((e) => { if (!cancelled) setError(e?.message ?? "Failed to load"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, canRead]);

  const handleSubmit = async () => {
    if (!request || request.status !== "DRAFT") return;
    setActionLoading(true);
    setError("");
    try {
      await staffStockRequestSubmit(request.id);
      setRequest((r) => (r ? { ...r, status: "SUBMITTED", submittedAt: new Date().toISOString() } : r));
    } catch (e) {
      setError(e?.message ?? "Failed to submit");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!request || !["DRAFT", "SUBMITTED"].includes(request.status)) return;
    if (!confirm("Cancel this request?")) return;
    setActionLoading(true);
    setError("");
    try {
      await staffStockRequestCancel(request.id);
      setRequest((r) => (r ? { ...r, status: "CANCELLED" } : r));
    } catch (e) {
      setError(e?.message ?? "Failed to cancel");
    } finally {
      setActionLoading(false);
    }
  };

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
        onBack={() => router.push(`/staff/branch/${branchId}/inventory/stock-requests`)}
      />
    );
  }

  if (loading || !request) {
    return (
      <div className="container py-24">
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        {loading ? <p className="text-secondary-light">Loading...</p> : <p className="text-danger">Request not found.</p>}
        <Link href={`/staff/branch/${branchId}/inventory/stock-requests`}>← Back to list</Link>
      </div>
    );
  }

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex flex-wrap align-items-center gap-16 mb-24">
        <Link href={`/staff/branch/${branchId}/inventory/stock-requests`} className="btn btn-outline-secondary btn-sm">← Back</Link>
        <h5 className="mb-0">Stock Request #{request.id}</h5>
        <span className={`badge ${statusBadgeClass(request.status)}`}>{request.status}</span>
      </div>
      {error && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setError("")}>Dismiss</button>
        </div>
      )}
      <Card title="Status timeline">
        <ul className="list-unstyled mb-0">
          <li>Created: {formatDate(request.createdAt)}</li>
          {request.submittedAt && <li>Submitted: {formatDate(request.submittedAt)}</li>}
          {request.transfer && (
            <li>Transfer #{request.transfer.id}: {request.transfer.status} {request.transfer.sentAt && `(sent ${formatDate(request.transfer.sentAt)})`}</li>
          )}
        </ul>
      </Card>
      <Card title="Items" className="mt-20">
        <div className="table-responsive">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Product</th>
                <th>Variant</th>
                <th>Requested Qty</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {(request.items || []).map((item) => (
                <tr key={item.id}>
                  <td>{item.product?.name ?? item.productId}</td>
                  <td>{item.variant?.title ?? item.variant?.sku ?? item.variantId}</td>
                  <td>{item.requestedQty}</td>
                  <td>{item.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {request.status === "DRAFT" && canSubmit && (
        <div className="mt-20 d-flex gap-12">
          <button type="button" className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={actionLoading}>
            {actionLoading ? "Submitting…" : "Submit request"}
          </button>
          <button type="button" className="btn btn-outline-danger btn-sm" onClick={handleCancel} disabled={actionLoading}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
