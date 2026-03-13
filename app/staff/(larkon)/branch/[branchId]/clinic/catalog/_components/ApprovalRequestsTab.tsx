"use client";

import { useCallback, useEffect, useState } from "react";
import { listApprovalRequests, decideApprovalRequest } from "./catalogApi";
import { formatApprovalRequestType } from "./catalogFormatters";
import CatalogStatusBadge from "./CatalogStatusBadge";
import { DataTableWrapper, EmptyState, ErrorState, LoadingState } from "@/src/components/dashboard";
import type { ClinicApprovalRequest } from "./catalogTypes";
import { formatPayloadForDisplay } from "@/src/lib/displayFormatters";

export default function ApprovalRequestsTab({
  branchId,
  statusFilter,
  canManage,
}: {
  branchId: string;
  statusFilter?: string;
  canManage?: boolean;
}) {
  const [requests, setRequests] = useState<ClinicApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [decidingId, setDecidingId] = useState<number | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError("");
    listApprovalRequests(branchId, {
      status: statusFilter && statusFilter !== "all" ? statusFilter : undefined,
      limit: 50,
    })
      .then(setRequests)
      .catch((e) => setError((e as Error)?.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, [branchId, statusFilter]);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleDecide = useCallback(
    (requestId: number, decision: "APPROVED" | "REJECTED") => {
      const reason = decision === "REJECTED" ? window.prompt("Rejection reason (optional):") ?? undefined : undefined;
      setDecidingId(requestId);
      decideApprovalRequest(branchId, requestId, decision, reason)
        .then(() => reload())
        .catch((e) => setError((e as Error)?.message ?? "Failed to submit decision"))
        .finally(() => setDecidingId(null));
    },
    [branchId, reload]
  );

  if (loading && requests.length === 0) {
    return (
      <div className="card radius-12">
        <div className="card-body">
          <LoadingState message="Loading approval requests…" />
        </div>
      </div>
    );
  }

  if (error && requests.length === 0) {
    return (
      <div className="card radius-12">
        <div className="card-body">
          <ErrorState message={error} onRetry={reload} />
        </div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="card radius-12">
        <div className="card-body">
          <EmptyState
            title="No approval requests"
            description="Create package or discount requests to see them here."
          />
        </div>
      </div>
    );
  }

  return (
    <DataTableWrapper emptyState={null}>
      <div className="table-responsive">
        <table className="table table-hover mb-0">
          <thead className="table-light">
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Entity</th>
              <th>Details</th>
              <th>Status</th>
              <th>Submitted</th>
              {canManage && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{formatApprovalRequestType(r.requestType)}</td>
                <td>{r.entityType}{r.entityId != null ? ` #${r.entityId}` : ""}</td>
                <td className="small text-muted">{formatPayloadForDisplay(r.payload)}</td>
                <td><CatalogStatusBadge status={r.status} /></td>
                <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</td>
                {canManage && (
                  <td>
                    {r.status === "PENDING" && (
                      <span className="d-flex gap-1">
                        <button
                          type="button"
                          className="btn btn-sm btn-success radius-8"
                          disabled={decidingId === r.id}
                          onClick={() => handleDecide(r.id, "APPROVED")}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger radius-8"
                          disabled={decidingId === r.id}
                          onClick={() => handleDecide(r.id, "REJECTED")}
                        >
                          Reject
                        </button>
                      </span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DataTableWrapper>
  );
}
