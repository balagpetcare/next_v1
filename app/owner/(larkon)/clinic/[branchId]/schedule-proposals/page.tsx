"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ownerClinicScheduleProposalsList,
  ownerClinicScheduleProposalReview,
  ownerClinicBranches,
  type ScheduleProposalRow,
} from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

export default function ClinicScheduleProposalsPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const [branchName, setBranchName] = useState("");
  const [proposals, setProposals] = useState<ScheduleProposalRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<"APPROVED" | "REJECTED" | null>(null);

  const load = useCallback(async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      setError("");
      const [list, branchesRes] = await Promise.all([
        ownerClinicScheduleProposalsList(branchId, statusFilter ? { status: statusFilter } : undefined),
        ownerClinicBranches(),
      ]);
      const branches = Array.isArray((branchesRes as { data?: unknown[] })?.data) ? (branchesRes as { data: { id: number; name?: string }[] }).data : [];
      const branch = branches.find((b) => String(b.id) === String(branchId));
      setBranchName(branch?.name ?? `Branch #${branchId}`);
      setProposals(Array.isArray(list) ? list : []);
    } catch (e) {
      setError((e as Error)?.message || "Failed to load proposals");
      setProposals([]);
    } finally {
      setLoading(false);
    }
  }, [branchId, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const openReview = (id: number, action: "APPROVED" | "REJECTED") => {
    setReviewingId(id);
    setReviewAction(action);
    setReviewNote("");
    setReviewModalOpen(true);
  };

  const submitReview = async () => {
    if (!branchId || reviewingId == null || !reviewAction) return;
    setError("");
    try {
      await ownerClinicScheduleProposalReview(branchId, reviewingId, {
        status: reviewAction,
        reviewNote: reviewNote.trim() || undefined,
      });
      setReviewModalOpen(false);
      setReviewingId(null);
      setReviewAction(null);
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Failed to submit review");
    }
  };

  if (!branchId) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">Invalid branch.</div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Schedule proposals"
        subtitle={branchName}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Schedule", href: `/owner/clinic/${branchId}/schedule` },
          { label: "Proposals", href: `/owner/clinic/${branchId}/schedule-proposals` },
        ]}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <select
          className="form-select form-select-sm w-auto radius-12"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <Link href={`/owner/clinic/${branchId}/schedule`} className="btn btn-outline-secondary btn-sm radius-12">
          Back to Schedule
        </Link>
      </div>

      {loading ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status" />
          </div>
        </div>
      ) : proposals.length === 0 ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <p className="text-muted mb-0">No schedule proposals.</p>
            <Link href={`/owner/clinic/${branchId}/schedule`} className="btn btn-outline-primary mt-3 radius-12">
              Schedule settings
            </Link>
          </div>
        </div>
      ) : (
        <div className="card radius-12">
          <div className="card-body p-24">
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th>Reviewed</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map((p) => (
                    <tr key={p.id}>
                      <td>{p.doctor?.displayName ?? `Member #${p.branchMemberId}`}</td>
                      <td>{p.createdAt ? new Date(p.createdAt).toLocaleString() : "—"}</td>
                      <td>
                        <span className={`badge radius-8 ${p.status === "PENDING" ? "bg-warning" : p.status === "APPROVED" ? "bg-success" : "bg-secondary"}`}>
                          {p.status}
                        </span>
                      </td>
                      <td>{p.reviewedAt ? new Date(p.reviewedAt).toLocaleString() : "—"}</td>
                      <td>
                        {p.status === "PENDING" && (
                          <>
                            <button type="button" className="btn btn-sm btn-success radius-8 me-1" onClick={() => openReview(p.id, "APPROVED")}>
                              Approve
                            </button>
                            <button type="button" className="btn btn-sm btn-outline-danger radius-8" onClick={() => openReview(p.id, "REJECTED")}>
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {reviewModalOpen && reviewingId != null && reviewAction && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h5 className="modal-title">{reviewAction === "APPROVED" ? "Approve" : "Reject"} proposal</h5>
                <button type="button" className="btn-close" onClick={() => setReviewModalOpen(false)} aria-label="Close" />
              </div>
              <div className="modal-body">
                <label className="form-label">Review note (optional)</label>
                <textarea
                  className="form-control radius-12"
                  rows={3}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Add a note for the doctor"
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary radius-12" onClick={() => setReviewModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className={`btn radius-12 ${reviewAction === "APPROVED" ? "btn-success" : "btn-danger"}`}
                  onClick={submitReview}
                >
                  {reviewAction === "APPROVED" ? "Approve" : "Reject"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
