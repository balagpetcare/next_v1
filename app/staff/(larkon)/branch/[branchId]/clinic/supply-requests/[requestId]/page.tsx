"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  staffClinicSupplyRequestById,
  staffClinicSupplyRequestSubmit,
  staffClinicSupplyRequestCancel,
} from "@/lib/api";
import StatusBadge from "@/src/components/dashboard/StatusBadge";

type StatusHistoryEntry = {
  id: number;
  message: string;
  toStatus?: string;
  createdAt: string;
};

type RequestDetail = {
  id: number;
  requestNo: string;
  status: string;
  priority: string;
  department?: string | null;
  requestType?: string | null;
  neededBy?: string | null;
  note?: string | null;
  reason?: string | null;
  requestedAt?: string;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  branch?: { id: number; name: string };
  requestedBy?: { id: number };
  reviewedBy?: { id: number } | null;
  statusHistory?: StatusHistoryEntry[];
  items?: Array<{
    id: number;
    clinicalItemId?: number | null;
    variantId?: number | null;
    itemNameSnapshot?: string | null;
    itemCodeSnapshot?: string | null;
    unitSnapshot?: string | null;
    requestedQty: number;
    approvedQty?: number | null;
    fulfilledQty?: number;
    note?: string | null;
    lineNote?: string | null;
    clinicalItem?: { id: number; name: string; itemCode?: string } | null;
    variant?: { id: number; variantName: string } | null;
  }>;
};


export default function SupplyRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params?.branchId as string | undefined;
  const requestId = params?.requestId as string | undefined;
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    if (!branchId || !requestId) return;
    try {
      const data = await staffClinicSupplyRequestById(branchId, Number(requestId));
      if (data) setRequest(data as RequestDetail);
    } catch (e) {
      setError((e as Error)?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [branchId, requestId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async () => {
    if (!branchId || !requestId) return;
    try {
      setError("");
      setSubmitting(true);
      await staffClinicSupplyRequestSubmit(branchId, Number(requestId));
      setSuccess("Request submitted for owner review.");
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!branchId || !requestId || !confirm("Cancel this supply request? This cannot be undone.")) return;
    try {
      setError("");
      setCancelling(true);
      await staffClinicSupplyRequestCancel(branchId, Number(requestId));
      setSuccess("Request cancelled.");
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Cancel failed");
    } finally {
      setCancelling(false);
    }
  };

  if (!branchId || !requestId) {
    return (
      <div className="p-4">
        <div className="alert alert-warning">Invalid branch or request.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard-main-body">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
          <p className="text-muted mt-2 mb-0">Loading request…</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning">Supply request not found.</div>
        <Link href={`/staff/branch/${branchId}/clinic/supply-requests`} className="btn btn-outline-primary btn-sm radius-8">
          Back to list
        </Link>
      </div>
    );
  }

  const canEdit = request.status === "DRAFT";
  const canSubmit = request.status === "DRAFT";
  const canCancel = ["DRAFT", "OWNER_REVIEW", "SUBMITTED"].includes(request.status);
  const history = request.statusHistory ?? [];

  return (
    <div className="dashboard-main-body">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h5 mb-0">Supply request {request.requestNo}</h1>
        <div className="d-flex gap-2">
          {canEdit && (
            <Link
              href={`/staff/branch/${branchId}/clinic/supply-requests/${requestId}/edit`}
              className="btn btn-outline-primary btn-sm radius-8"
            >
              Edit draft
            </Link>
          )}
          <Link href={`/staff/branch/${branchId}/clinic/supply-requests`} className="btn btn-outline-secondary btn-sm radius-8">
            Back to list
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}
      {success && <div className="alert alert-success radius-12 mb-3">{success}</div>}

      {/* Status timeline: human-readable messages only */}
      <div className="card radius-12 mb-3">
        <div className="card-body p-24">
          <h6 className="mb-3 fw-semibold">Status timeline</h6>
          {history.length > 0 ? (
            <ul className="list-unstyled mb-0 small">
              {history.map((h) => (
                <li key={h.id} className="d-flex align-items-start gap-2 mb-2">
                  <span className="badge bg-success rounded-circle p-1" style={{ width: "1.25rem", height: "1.25rem" }} title="Done" />
                  <span>
                    {h.message}
                    {h.createdAt && ` — ${new Date(h.createdAt).toLocaleString()}`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="list-unstyled mb-0 small">
              <li className="d-flex align-items-start gap-2 mb-2">
                <span className="badge bg-success rounded-circle p-1" style={{ width: "1.25rem", height: "1.25rem" }} />
                <span>Created{request.requestedAt && ` — ${new Date(request.requestedAt).toLocaleString()}`}</span>
              </li>
              {request.status !== "DRAFT" && (
                <li className="d-flex align-items-start gap-2 mb-2">
                  <span className="badge bg-success rounded-circle p-1" style={{ width: "1.25rem", height: "1.25rem" }} />
                  <span>Submitted for owner review</span>
                </li>
              )}
              {request.reviewedAt && (
                <li className="d-flex align-items-start gap-2 mb-2">
                  <span className="badge bg-success rounded-circle p-1" style={{ width: "1.25rem", height: "1.25rem" }} />
                  <span>Reviewed — {statusDisplayLabel(request.status)} — {new Date(request.reviewedAt).toLocaleString()}</span>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Request header */}
      <div className="card radius-12 mb-4">
        <div className="card-body p-24">
          <div className="row g-3">
            <div className="col-md-2">
              <span className="text-muted small d-block">Request #</span>
              <span className="fw-semibold">{request.requestNo}</span>
            </div>
            <div className="col-md-2">
              <span className="text-muted small d-block">Status</span>
              <StatusBadge status={request.status} />
            </div>
            <div className="col-md-2">
              <span className="text-muted small d-block">Priority</span>
              <span>{request.priority ?? "—"}</span>
            </div>
            <div className="col-md-2">
              <span className="text-muted small d-block">Department</span>
              <span>{request.department ?? "—"}</span>
            </div>
            <div className="col-md-2">
              <span className="text-muted small d-block">Request type</span>
              <span>{request.requestType ?? "—"}</span>
            </div>
            <div className="col-md-2">
              <span className="text-muted small d-block">Needed by</span>
              <span>{request.neededBy ? new Date(request.neededBy).toLocaleDateString() : "—"}</span>
            </div>
            <div className="col-md-3">
              <span className="text-muted small d-block">Requested</span>
              <span>{request.requestedAt ? new Date(request.requestedAt).toLocaleString() : "—"}</span>
            </div>
            {request.reviewedAt && (
              <div className="col-md-3">
                <span className="text-muted small d-block">Reviewed</span>
                <span>{new Date(request.reviewedAt).toLocaleString()}</span>
              </div>
            )}
          </div>
          {(request.reason || request.note) && (
            <div className="mt-3 pt-3 border-top">
              <span className="text-muted small d-block">Reason / Note</span>
              <p className="mb-0 small">{request.reason || request.note}</p>
            </div>
          )}
          {request.reviewNote && (
            <div className="mt-3 pt-3 border-top">
              <span className="text-muted small d-block">Review note</span>
              <p className="mb-0 small">{request.reviewNote}</p>
            </div>
          )}
          <div className="mt-3 pt-3 border-top d-flex gap-2">
            {canSubmit && (
              <button type="button" className="btn btn-primary radius-8" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit for review"}
              </button>
            )}
            {canCancel && (
              <button type="button" className="btn btn-outline-danger radius-8" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? "Cancelling…" : "Cancel request"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Items table */}
      <div className="card radius-12">
        <div className="card-header bg-transparent p-24">
          <h6 className="mb-0 fw-semibold">Items ({(request.items?.length ?? 0)} line(s))</h6>
        </div>
        <div className="card-body p-24">
          {!request.items?.length ? (
            <p className="text-muted mb-0">No items on this request.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Item</th>
                    <th>Code</th>
                    <th>Unit</th>
                    <th>Requested</th>
                    <th>Approved</th>
                    <th>Received</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {request.items.map((row) => (
                    <tr key={row.id}>
                      <td>{row.itemNameSnapshot ?? row.clinicalItem?.name ?? row.clinicalItemId ?? "—"}</td>
                      <td>{row.itemCodeSnapshot ?? row.clinicalItem?.itemCode ?? "—"}</td>
                      <td>{row.unitSnapshot ?? row.variant?.variantName ?? (row.variantId ? String(row.variantId) : "—")}</td>
                      <td>{row.requestedQty}</td>
                      <td>{row.approvedQty ?? "—"}</td>
                      <td>{row.fulfilledQty ?? 0}</td>
                      <td className="text-muted small">{row.lineNote ?? row.note ?? "—"}</td>
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
