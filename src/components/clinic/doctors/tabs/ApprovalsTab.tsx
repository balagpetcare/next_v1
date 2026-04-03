"use client";

import { useState, useCallback } from "react";
import { staffApprovalDecide } from "@/lib/api";
import { useToast } from "@/src/hooks/useToast";
import { formatPayloadForDisplay, humanizeEnum } from "@/src/lib/displayFormatters";

function hasPerm(permissions: string[], perm: string): boolean {
  return permissions.includes(perm);
}

type Props = {
  branchId: string;
  memberId: number;
  approvals: any[];
  loading?: boolean;
  permissions: string[];
  onRefresh?: () => void;
};

export default function ApprovalsTab({ branchId, approvals, loading, permissions, onRefresh }: Props) {
  const [decidingId, setDecidingId] = useState<number | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: number } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const toast = useToast();
  const canDecide = hasPerm(permissions, "approvals.manage");

  const handleApprove = useCallback(
    async (requestId: number) => {
      if (!canDecide || !confirm("Approve this request?")) return;
      setDecidingId(requestId);
      try {
        await staffApprovalDecide(branchId, requestId, { decision: "APPROVED" });
        toast.success("Request approved");
        onRefresh?.();
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to approve");
      } finally {
        setDecidingId(null);
      }
    },
    [branchId, canDecide, onRefresh, toast]
  );

  const handleRejectClick = useCallback((id: number) => {
    setRejectModal({ id });
    setRejectReason("");
  }, []);

  const handleRejectSubmit = useCallback(
    async () => {
      if (!rejectModal || !canDecide) return;
      const reason = rejectReason.trim();
      if (!reason) {
        toast.error("A rejection reason is required");
        return;
      }
      setDecidingId(rejectModal.id);
      try {
        await staffApprovalDecide(branchId, rejectModal.id, {
          decision: "REJECTED",
          rejectReason: reason,
        });
        toast.success("Request rejected");
        setRejectModal(null);
        setRejectReason("");
        onRefresh?.();
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to reject");
      } finally {
        setDecidingId(null);
      }
    },
    [branchId, canDecide, rejectModal, rejectReason, onRefresh, toast]
  );

  if (loading) {
    return (
      <div className="card radius-12">
        <div className="card-body text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="text-muted mt-2 mb-0">Loading approval history...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card radius-12">
        <div className="card-body">
          <h6 className="mb-3">Approval history</h6>
          {approvals.length ? (
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Requester</th>
                    <th>Approver</th>
                    <th>Remarks</th>
                    <th>Created</th>
                    <th>Decided</th>
                    {canDecide && <th className="text-end">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {approvals.map((a: any) => (
                    <tr key={a.id}>
                      <td>{a.requestType}</td>
                      <td>
                        <span className={`badge radius-8 ${a.status === "APPROVED" ? "bg-success-subtle text-success-emphasis" : a.status === "REJECTED" ? "bg-danger-subtle text-danger-emphasis" : "bg-warning-subtle text-warning-emphasis"}`}>
                          {humanizeEnum(a.status)}
                        </span>
                      </td>
                      <td>{a.requestedBy?.profile?.displayName ?? a.requestedByUserId ?? "—"}</td>
                      <td>{a.approvedBy?.profile?.displayName ?? a.approvedByUserId ?? "—"}</td>
                      <td className="small">{a.rejectReason ? String(a.rejectReason) : formatPayloadForDisplay(a.payload)}</td>
                      <td className="small text-muted">{a.createdAt ? new Date(a.createdAt).toLocaleString() : "—"}</td>
                      <td className="small text-muted">{a.approvedAt ? new Date(a.approvedAt).toLocaleString() : "—"}</td>
                      {canDecide && (
                        <td className="text-end">
                          {a.status === "PENDING" ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-success btn-sm radius-8 me-1"
                                disabled={decidingId != null}
                                onClick={() => handleApprove(a.id)}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm radius-8"
                                disabled={decidingId != null}
                                onClick={() => handleRejectClick(a.id)}
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-5">
              <i className="ri-file-list-3-line fs-1 text-muted d-block mb-2" aria-hidden />
              <p className="text-muted small mb-0">No approval history.</p>
            </div>
          )}
        </div>
      </div>

      {rejectModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h6 className="modal-title">Reject request</h6>
                <button type="button" className="btn-close" onClick={() => setRejectModal(null)} aria-label="Close" />
              </div>
              <div className="modal-body">
                <label className="form-label small">Reason (required)</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection"
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary btn-sm radius-8" onClick={() => setRejectModal(null)}>Cancel</button>
                <button type="button" className="btn btn-danger btn-sm radius-8" disabled={decidingId != null} onClick={handleRejectSubmit}>
                  {decidingId != null ? "..." : "Reject"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
