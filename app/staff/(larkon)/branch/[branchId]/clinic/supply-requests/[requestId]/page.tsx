"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  staffClinicSupplyRequestById,
  staffClinicSupplyRequestSubmit,
} from "@/lib/api";

type RequestDetail = {
  id: number;
  requestNo: string;
  status: string;
  priority: string;
  note?: string | null;
  requestedAt?: string;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  branch?: { id: number; name: string };
  requestedBy?: { id: number };
  reviewedBy?: { id: number } | null;
  items?: Array<{
    id: number;
    clinicalItemId: number;
    variantId?: number | null;
    requestedQty: number;
    approvedQty?: number | null;
    fulfilledQty?: number;
    note?: string | null;
    clinicalItem?: { id: number; name: string; itemCode?: string };
    variant?: { id: number; variantName: string } | null;
  }>;
};

function statusBadgeClass(status: string): string {
  switch (status) {
    case "DRAFT":
      return "bg-secondary";
    case "OWNER_REVIEW":
      return "bg-warning text-dark";
    case "APPROVED":
      return "bg-success";
    case "PARTIAL_APPROVED":
      return "bg-info";
    case "REJECTED":
      return "bg-danger";
    case "DISPATCHED":
      return "bg-primary";
    case "RECEIVED":
    case "CLOSED":
      return "bg-dark";
    default:
      return "bg-secondary";
  }
}

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

  useEffect(() => {
    if (!branchId || !requestId) return;
    let cancelled = false;
    staffClinicSupplyRequestById(branchId, Number(requestId))
      .then((data) => {
        if (!cancelled && data) setRequest(data as RequestDetail);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error)?.message || "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, requestId]);

  const handleSubmit = async () => {
    if (!branchId || !requestId) return;
    try {
      setError("");
      setSubmitting(true);
      await staffClinicSupplyRequestSubmit(branchId, Number(requestId));
      setSuccess("Request submitted for owner review.");
      const updated = await staffClinicSupplyRequestById(branchId, Number(requestId));
      if (updated) setRequest(updated as RequestDetail);
    } catch (e) {
      setError((e as Error)?.message || "Submit failed");
    } finally {
      setSubmitting(false);
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
        <Link
          href={`/staff/branch/${branchId}/clinic/supply-requests`}
          className="btn btn-outline-primary btn-sm radius-8"
        >
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h5 mb-0">Supply request {request.requestNo}</h1>
        <Link
          href={`/staff/branch/${branchId}/clinic/supply-requests`}
          className="btn btn-outline-secondary btn-sm radius-8"
        >
          Back to list
        </Link>
      </div>

      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}
      {success && <div className="alert alert-success radius-12 mb-3">{success}</div>}

      {/* Status timeline */}
      <div className="card radius-12 mb-3">
        <div className="card-body p-24">
          <h6 className="mb-3 fw-semibold">Status timeline</h6>
          <ul className="list-unstyled mb-0 small">
            <li className="d-flex align-items-start gap-2 mb-2">
              <span className="badge bg-success rounded-circle p-1" style={{ width: "1.25rem", height: "1.25rem" }} title="Done" />
              <span>
                <strong>Created</strong>
                {request.requestedAt && ` — ${new Date(request.requestedAt).toLocaleString()}`}
              </span>
            </li>
            {request.status !== "DRAFT" && (
              <li className="d-flex align-items-start gap-2 mb-2">
                <span className="badge bg-success rounded-circle p-1" style={{ width: "1.25rem", height: "1.25rem" }} title="Done" />
                <span><strong>Submitted</strong> for owner review</span>
              </li>
            )}
            {request.reviewedAt && (
              <li className="d-flex align-items-start gap-2 mb-2">
                <span className="badge bg-success rounded-circle p-1" style={{ width: "1.25rem", height: "1.25rem" }} title="Done" />
                <span>
                  <strong>Reviewed</strong> — {request.status}
                  {` — ${new Date(request.reviewedAt).toLocaleString()}`}
                  {request.reviewNote && ` (${request.reviewNote})`}
                </span>
              </li>
            )}
          </ul>
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
              <span className={`badge ${statusBadgeClass(request.status)}`}>{request.status}</span>
            </div>
            <div className="col-md-2">
              <span className="text-muted small d-block">Priority</span>
              <span>{request.priority}</span>
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
          {request.note && (
            <div className="mt-3 pt-3 border-top">
              <span className="text-muted small d-block">Note</span>
              <p className="mb-0 small">{request.note}</p>
            </div>
          )}
          {request.reviewNote && (
            <div className="mt-3 pt-3 border-top">
              <span className="text-muted small d-block">Review note</span>
              <p className="mb-0 small">{request.reviewNote}</p>
            </div>
          )}
          {request.status === "DRAFT" && (
            <div className="mt-3 pt-3 border-top">
              <button
                type="button"
                className="btn btn-primary radius-8"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Submitting…" : "Submit for review"}
              </button>
            </div>
          )}
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
                    <th>Variant</th>
                    <th>Requested</th>
                    <th>Approved</th>
                    <th>Fulfilled</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {request.items.map((row) => (
                    <tr key={row.id}>
                      <td>{row.clinicalItem?.name ?? row.clinicalItemId}</td>
                      <td>{row.variant?.variantName ?? (row.variantId ? String(row.variantId) : "—")}</td>
                      <td>{row.requestedQty}</td>
                      <td>{row.approvedQty ?? "—"}</td>
                      <td>{row.fulfilledQty ?? 0}</td>
                      <td className="text-muted small">{row.note ?? "—"}</td>
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
