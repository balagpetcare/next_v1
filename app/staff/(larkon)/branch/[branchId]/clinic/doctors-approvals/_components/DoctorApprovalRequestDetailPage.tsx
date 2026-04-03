"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Modal from "react-bootstrap/Modal";
import { approvals, doctors } from "@/src/lib/doctorOperationsRoutes";
import { isDoctorApprovalQueueType } from "@/src/lib/clinicApprovalLabels";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffApprovalDecide, staffClinicApprovalRequestById } from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import {
  PageWorkspace,
  PageHeader,
  LoadingState,
  SectionCard,
  ErrorState,
} from "@/src/components/dashboard";
import { Doctor360Drawer } from "@/src/components/clinic/doctors";
import ApprovalRequestDetailSections from "./ApprovalRequestDetailSections";
import { useToast } from "@/src/hooks/useToast";

const DOCTORS_PERMS = ["clinic.doctors.view", "approvals.view"];

export type DoctorApprovalRequestDetailPageProps = {
  branchId: string;
  requestId: number;
};

/**
 * Full-page doctor approval request detail (queue item). Used by
 * `clinic/doctors/approvals/[approvalId]` and legacy redirects from flat routes.
 */
export default function DoctorApprovalRequestDetailPage({
  branchId,
  requestId,
}: DoctorApprovalRequestDetailPageProps) {
  const router = useRouter();
  const toast = useToast();

  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);

  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);
  const [drawerMemberId, setDrawerMemberId] = useState<number | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = DOCTORS_PERMS.some((p) => permissions.includes(p));
  const canApprove = permissions.includes("approvals.manage");

  const load = useCallback(async () => {
    if (!branchId || !hasAccess || !Number.isFinite(requestId)) return;
    setLoading(true);
    setError("");
    try {
      const data = await staffClinicApprovalRequestById(branchId, requestId);
      setDetail(data && typeof data === "object" ? (data as Record<string, unknown>) : null);
      if (!data) {
        setError("Approval request not found.");
      }
    } catch (e: unknown) {
      const err = e as Error & { status?: number };
      setDetail(null);
      setError(err?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [branchId, hasAccess, requestId]);

  useEffect(() => {
    void load();
  }, [load]);

  const requestType = detail ? String(detail.requestType ?? "") : "";
  const isDoctorQueueType = isDoctorApprovalQueueType(requestType);
  const statusPending = detail && String(detail.status) === "PENDING";

  const handleApprove = useCallback(async () => {
    if (!branchId || !canApprove || !Number.isFinite(requestId) || !statusPending) return;
    if (!window.confirm("Approve this request?")) return;
    setActing(true);
    try {
      await staffApprovalDecide(branchId, requestId, { decision: "APPROVED" });
      toast.success("Request approved");
      router.push(approvals(branchId));
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? "Failed to approve");
    } finally {
      setActing(false);
    }
  }, [branchId, canApprove, requestId, statusPending, router, toast]);

  const submitReject = useCallback(async () => {
    if (!branchId || !canApprove || !Number.isFinite(requestId)) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error("A rejection reason is required");
      return;
    }
    setActing(true);
    try {
      await staffApprovalDecide(branchId, requestId, {
        decision: "REJECTED",
        rejectReason: reason,
      });
      toast.success("Request rejected");
      setRejectModalOpen(false);
      setRejectReason("");
      router.push(approvals(branchId));
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? "Failed to reject");
    } finally {
      setActing(false);
    }
  }, [branchId, canApprove, requestId, rejectReason, router, toast]);

  if (ctxLoading) {
    return (
      <PageWorkspace>
        <LoadingState message="Loading..." />
      </PageWorkspace>
    );
  }

  if (!branch) {
    return (
      <PageWorkspace>
        <LoadingState message="Loading branch…" />
      </PageWorkspace>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        missingPerm="approvals.view"
        onBack={() => router.push(doctors(branchId))}
      />
    );
  }

  if (!Number.isFinite(requestId)) {
    return (
      <PageWorkspace>
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        <ErrorState message="Invalid request ID" onRetry={() => router.push(approvals(branchId))} />
      </PageWorkspace>
    );
  }

  const breadcrumbs = [
    { label: "Doctors", href: doctors(branchId) },
    { label: "Pending approvals", href: approvals(branchId) },
    { label: `Request #${requestId}` },
  ];

  const branchName = (branch as { name?: string }).name;

  return (
    <PageWorkspace>
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <PageHeader
        title={`Doctor approval #${requestId}`}
        subtitle={branchName ? `Branch: ${branchName}` : undefined}
        breadcrumbs={breadcrumbs}
        actions={
          <Link href={approvals(branchId)} className="btn btn-outline-secondary btn-sm radius-8">
            ← Back to queue
          </Link>
        }
      />

      {loading ? (
        <LoadingState message="Loading request…" />
      ) : error && !detail ? (
        <ErrorState
          message={error}
          onRetry={load}
          className="mb-3"
        />
      ) : detail ? (
        <>
          {!isDoctorQueueType && (
            <div className="alert alert-warning radius-8 mb-3" role="status">
              This request type is not part of the doctor operations queue. You can still review it here.{" "}
              <Link href={approvals(branchId)} className="alert-link">
                Back to doctor approvals
              </Link>
            </div>
          )}

          <div className="row g-3">
            <div className="col-lg-8">
              <ApprovalRequestDetailSections
                branchId={branchId}
                row={detail}
                loadError={Boolean(error)}
                isPartialRow={false}
                onOpenDoctor360={(id) => setDrawerMemberId(id)}
              />
            </div>
            <div className="col-lg-4">
              <SectionCard title="Actions" className="mb-3">
                {canApprove && statusPending ? (
                  <div className="d-flex flex-column gap-2">
                    <button
                      type="button"
                      className="btn btn-success btn-sm radius-8"
                      disabled={acting}
                      onClick={() => void handleApprove()}
                    >
                      {acting ? "…" : "Approve"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm radius-8"
                      disabled={acting}
                      onClick={() => {
                        setRejectModalOpen(true);
                        setRejectReason("");
                      }}
                    >
                      Reject
                    </button>
                    <p className="text-muted small mb-0">
                      Reject requires a reason. Approving applies the request per branch policy.
                    </p>
                  </div>
                ) : !canApprove ? (
                  <p className="text-muted small mb-0">You do not have permission to approve or reject.</p>
                ) : (
                  <p className="text-muted small mb-0">This request is already decided.</p>
                )}
              </SectionCard>
              <SectionCard title="Links" className="mb-0">
                <ul className="list-unstyled small mb-0">
                  <li className="mb-2">
                    <Link href={approvals(branchId)}>Doctor approvals queue</Link>
                  </li>
                  <li>
                    <Link href={doctors(branchId)}>Doctors</Link>
                  </li>
                </ul>
              </SectionCard>
            </div>
          </div>
        </>
      ) : null}

      <Doctor360Drawer
        open={drawerMemberId != null}
        onClose={() => setDrawerMemberId(null)}
        branchId={branchId}
        memberId={drawerMemberId}
      />

      <Modal
        show={rejectModalOpen}
        onHide={() => (acting ? undefined : setRejectModalOpen(false))}
        centered
        backdrop={acting ? "static" : true}
        aria-labelledby="doctor-approval-detail-reject-title"
      >
        <Modal.Header closeButton={!acting}>
          <Modal.Title id="doctor-approval-detail-reject-title" as="h6">
            Reject request #{requestId}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <label className="form-label small" htmlFor="doctor-approval-detail-reject-reason">
            Reason <span className="text-danger">*</span>
          </label>
          <textarea
            id="doctor-approval-detail-reject-reason"
            className="form-control form-control-sm"
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Explain why this request is rejected"
            required
            aria-required
          />
        </Modal.Body>
        <Modal.Footer>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm radius-8"
            onClick={() => setRejectModalOpen(false)}
            disabled={acting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm radius-8"
            disabled={acting || !rejectReason.trim()}
            onClick={() => void submitReject()}
          >
            {acting ? "…" : "Reject"}
          </button>
        </Modal.Footer>
      </Modal>
    </PageWorkspace>
  );
}
