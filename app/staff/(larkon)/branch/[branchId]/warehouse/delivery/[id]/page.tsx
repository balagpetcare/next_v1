"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { deliveryAssignmentById, deliveryStart, deliveryArrive, deliveryComplete, deliveryFail } from "@/lib/api";
import StaffBranchLayout from "@/src/components/branch/StaffBranchLayout";
import { useBranchContext } from "@/lib/useBranchContext";
import { getWarehouseCapabilities } from "@/src/lib/warehouseRbac";
import WarehouseAccessFallback from "../../_components/WarehouseAccessFallback";

type DispatchItemRow = {
  variant?: { sku?: string; title?: string };
  quantity?: number;
  qty?: number;
};

type DeliveryDispatchRow = {
  fromLocation?: { name?: string; type?: string };
  fromLocationId?: number;
  toLocation?: { name?: string; type?: string };
  toLocationId?: number;
  items?: DispatchItemRow[];
  proofOfDelivery?: { recipientPhone?: string; receivedAt?: string };
};

type DeliveryAssignmentRow = {
  id: number;
  status?: string;
  assignedAt?: string;
  startedAt?: string;
  arrivedAt?: string;
  completedAt?: string;
  assignedBy?: { name?: string; email?: string };
  receivedByName?: string;
  podNote?: string;
  failureReason?: string;
  dispatch?: DeliveryDispatchRow;
};

function statusBadge(s: string | null | undefined) {
  const u = (s || "").toUpperCase();
  if (u === "ASSIGNED") return "bg-info";
  if (u === "EN_ROUTE") return "bg-warning text-dark";
  if (u === "ARRIVED") return "bg-primary";
  if (u === "COMPLETED") return "bg-success";
  if (u === "FAILED") return "bg-danger";
  return "bg-secondary";
}

export default function StaffDeliveryDetailPage() {
  const params = useParams();
  const branchId = String(params?.branchId ?? "");
  const assignmentId = Number(params?.id);
  const { myAccess } = useBranchContext(branchId);
  const caps = getWarehouseCapabilities(myAccess?.permissions ?? []);

  const [assignment, setAssignment] = useState<DeliveryAssignmentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  // POD fields
  const [receivedByName, setReceivedByName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [podNote, setPodNote] = useState("");
  const [failReason, setFailReason] = useState("");

  async function loadAssignment() {
    try {
      const data = await deliveryAssignmentById(assignmentId);
      setAssignment(data as DeliveryAssignmentRow);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load assignment");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!caps.canViewDeliveries) {
      setLoading(false);
      return;
    }
    if (!assignmentId) return;
    loadAssignment();
     
  }, [assignmentId, caps.canViewDeliveries]);

  async function handleAction(action: string) {
    setActing(true);
    setError(null);
    try {
      if (action === "start") {
        await deliveryStart(assignmentId);
      } else if (action === "arrive") {
        await deliveryArrive(assignmentId);
      } else if (action === "complete") {
        await deliveryComplete(assignmentId, { receivedByName, podNote });
      } else if (action === "fail") {
        if (!failReason.trim()) { setError("Failure reason is required"); setActing(false); return; }
        await deliveryFail(assignmentId, failReason);
      }
      await loadAssignment();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <StaffBranchLayout branchId={branchId} requiredPermission={null}>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2 text-muted">Loading delivery…</p>
        </div>
      </StaffBranchLayout>
    );
  }

  if (!caps.canViewDeliveries) {
    return (
      <StaffBranchLayout branchId={branchId} requiredPermission={null}>
        <WarehouseAccessFallback
          branchId={branchId}
          title="Delivery permission required"
          message="Delivery assignment details are restricted to delivery-enabled roles."
        />
      </StaffBranchLayout>
    );
  }

  if (!assignment) {
    return (
      <StaffBranchLayout branchId={branchId} requiredPermission={null}>
        <div className="alert alert-danger radius-12">{error || "Assignment not found"}</div>
        <Link href={`/staff/branch/${branchId}/warehouse`} className="btn btn-outline-secondary radius-12">← Back to Warehouse</Link>
      </StaffBranchLayout>
    );
  }

  const a = assignment;
  const d = a.dispatch || {};
  const dispatchItems = d.items ?? [];
  const status = (a.status || "").toUpperCase();

  return (
    <StaffBranchLayout branchId={branchId} requiredPermission={null}>
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
        <div>
          <nav aria-label="breadcrumb" className="mb-2">
            <ol className="breadcrumb mb-0 small">
              <li className="breadcrumb-item"><Link href="/staff">Staff</Link></li>
              <li className="breadcrumb-item"><Link href="/staff/branch">Branches</Link></li>
              <li className="breadcrumb-item"><Link href={`/staff/branch/${branchId}`}>Branch #{branchId}</Link></li>
              <li className="breadcrumb-item"><Link href={`/staff/branch/${branchId}/warehouse`}>Warehouse</Link></li>
              <li className="breadcrumb-item active">Delivery #{a.id}</li>
            </ol>
          </nav>
          <h5 className="mb-1 fw-semibold">
            Delivery Assignment #{a.id}
            <span className={`badge ${statusBadge(status)} ms-2`}>{status}</span>
          </h5>
          <p className="text-muted small mb-0">Delivery assignment details and actions.</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3 mb-4">
        {/* Route Info */}
        <div className="col-md-6">
          <div className="card border h-100">
            <div className="card-header"><h6 className="mb-0">Route</h6></div>
            <div className="card-body">
              <div className="mb-2">
                <span className="text-muted small">From:</span>
                <div className="fw-medium">{d.fromLocation?.name || `Location #${d.fromLocationId}`}</div>
                {d.fromLocation?.type && <span className="badge bg-secondary small">{d.fromLocation.type}</span>}
              </div>
              <div className="text-center my-2"><i className="ti ti-arrow-down fs-4 text-muted" /></div>
              <div>
                <span className="text-muted small">To:</span>
                <div className="fw-medium">{d.toLocation?.name || `Location #${d.toLocationId}`}</div>
                {d.toLocation?.type && <span className="badge bg-secondary small">{d.toLocation.type}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="col-md-6">
          <div className="card border h-100">
            <div className="card-header"><h6 className="mb-0">Timeline</h6></div>
            <div className="card-body">
              <table className="table table-sm mb-0">
                <tbody>
                  <tr><td className="text-muted">Assigned</td><td>{a.assignedAt ? new Date(a.assignedAt).toLocaleString() : "—"}</td></tr>
                  <tr><td className="text-muted">Started</td><td>{a.startedAt ? new Date(a.startedAt).toLocaleString() : "—"}</td></tr>
                  <tr><td className="text-muted">Arrived</td><td>{a.arrivedAt ? new Date(a.arrivedAt).toLocaleString() : "—"}</td></tr>
                  <tr><td className="text-muted">Completed</td><td>{a.completedAt ? new Date(a.completedAt).toLocaleString() : "—"}</td></tr>
                </tbody>
              </table>
              {a.assignedBy && (
                <div className="mt-2 small text-muted">
                  Assigned by: {a.assignedBy.name || a.assignedBy.email || "—"}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dispatch Items */}
      {dispatchItems.length > 0 && (
        <div className="card border mb-4">
          <div className="card-header"><h6 className="mb-0">Items ({dispatchItems.length})</h6></div>
          <div className="card-body p-0">
            <table className="table table-sm mb-0">
              <thead className="table-light">
                <tr><th>SKU</th><th>Product</th><th>Qty</th></tr>
              </thead>
              <tbody>
                {dispatchItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="text-muted small">{item.variant?.sku || "—"}</td>
                    <td>{item.variant?.title || "—"}</td>
                    <td className="fw-medium">{item.quantity ?? item.qty ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actions */}
      {status === "ASSIGNED" && (
        <div className="card border mb-3">
          <div className="card-body">
            <p className="mb-2">Start this delivery to mark it as <strong>En Route</strong>.</p>
            <button className="btn btn-primary" onClick={() => handleAction("start")} disabled={acting}>
              {acting ? "Starting…" : "Start Delivery"}
            </button>
          </div>
        </div>
      )}

      {status === "EN_ROUTE" && (
        <div className="card border mb-3">
          <div className="card-body">
            <p className="mb-2">Mark that you have arrived at the destination.</p>
            <button className="btn btn-info" onClick={() => handleAction("arrive")} disabled={acting}>
              {acting ? "Updating…" : "Mark Arrived"}
            </button>
          </div>
        </div>
      )}

      {(status === "EN_ROUTE" || status === "ARRIVED") && (
        <div className="card border mb-3">
          <div className="card-header"><h6 className="mb-0">Complete Delivery (Proof of Delivery)</h6></div>
          <div className="card-body">
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label className="form-label small">Received by (required)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Name of person receiving"
                  value={receivedByName}
                  onChange={(e) => setReceivedByName(e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small">Recipient phone</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Optional"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                />
              </div>
              <div className="col-md-12">
                <label className="form-label small">Note</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Optional delivery note"
                  value={podNote}
                  onChange={(e) => setPodNote(e.target.value)}
                />
              </div>
            </div>
            <button className="btn btn-success" onClick={() => handleAction("complete")} disabled={acting}>
              {acting ? "Completing…" : "Complete Delivery"}
            </button>
          </div>
        </div>
      )}

      {["ASSIGNED", "EN_ROUTE", "ARRIVED"].includes(status) && (
        <div className="card border border-danger mb-3">
          <div className="card-header bg-danger-subtle"><h6 className="mb-0 text-danger">Mark as Failed</h6></div>
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label small">Failure Reason</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Reason for delivery failure"
                value={failReason}
                onChange={(e) => setFailReason(e.target.value)}
              />
            </div>
            <button className="btn btn-danger" onClick={() => handleAction("fail")} disabled={acting}>
              {acting ? "Updating…" : "Mark as Failed"}
            </button>
          </div>
        </div>
      )}

      {/* Completed/Failed info */}
      {status === "COMPLETED" && (
        <div className="alert alert-success">
          <strong>Delivery completed.</strong>
          {a.receivedByName && <span> Received by: {a.receivedByName}</span>}
          {a.podNote && <span> — {a.podNote}</span>}
          {d.proofOfDelivery?.recipientPhone && (
            <div className="small mt-1">Phone: {d.proofOfDelivery.recipientPhone}</div>
          )}
          {d.proofOfDelivery?.receivedAt && (
            <div className="small text-muted mt-1">POD recorded: {new Date(d.proofOfDelivery.receivedAt).toLocaleString()}</div>
          )}
        </div>
      )}

      {status === "FAILED" && (
        <div className="alert alert-danger">
          <strong>Delivery failed.</strong>
          {a.failureReason && <span> Reason: {a.failureReason}</span>}
        </div>
      )}
    </StaffBranchLayout>
  );
}
