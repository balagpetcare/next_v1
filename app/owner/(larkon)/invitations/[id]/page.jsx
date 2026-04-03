"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ownerGetInvitation, ownerResendInvitation, ownerReinviteInvitation, ownerCancelInvitation } from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import StatusBadge from "@/app/owner/_components/StatusBadge";

export default function InvitationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const formatDate = (date) => {
    if (!date) return "—";
    try {
      return new Date(date).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return String(date);
    }
  };

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await ownerGetInvitation(id);
      setInvite(data);
    } catch (e) {
      setError(e?.message || "Failed to load invitation");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!confirm("Resend this invitation?")) return;
    setActionLoading(true);
    setError("");
    try {
      await ownerResendInvitation(id);
      await load();
      alert("Invitation resent successfully");
    } catch (e) {
      setError(e?.message || "Resend failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReinvite() {
    if (!confirm("Re-invite with a fresh link?")) return;
    setActionLoading(true);
    setError("");
    try {
      await ownerReinviteInvitation(id);
      await load();
      alert("Invitation re-issued successfully");
    } catch (e) {
      setError(e?.message || "Re-invite failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel this invitation?")) return;
    setActionLoading(true);
    setError("");
    try {
      await ownerCancelInvitation(id);
      router.push("/owner/staffs?status=INVITED");
    } catch (e) {
      setError(e?.message || "Cancel failed");
      setActionLoading(false);
    }
  }

  useEffect(() => {
    if (id) load();
  }, [id]);

  if (loading) {
    return (
      <div className="dashboard-main-body">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-danger">{error}</div>
        <Link href="/owner/staffs" className="btn btn-secondary">
          Back to Staffs
        </Link>
      </div>
    );
  }

  const displayName = invite?.displayName || invite?.email || invite?.phone || `Invite #${id}`;
  const expired = isExpired(invite?.expiresAt);
  const canEdit = invite?.status !== "ACCEPTED" && invite?.status !== "REVOKED" && invite?.status !== "CANCELLED";
  const canResend = invite?.status === "PENDING" && !expired;
  const canReinvite = (invite?.status === "EXPIRED" || expired || invite?.status === "REVOKED" || invite?.status === "CANCELLED") && invite?.status !== "ACCEPTED";
  const canCancel = invite?.status !== "ACCEPTED" && invite?.status !== "REVOKED" && invite?.status !== "CANCELLED";

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title={displayName}
        subtitle="Staff Invitation Details"
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Staffs", href: "/owner/staffs" },
          { label: "Invitation Details" },
        ]}
        actions={[
          <Link key="back" href="/owner/staffs" className="btn btn-outline-secondary radius-12">
            <i className="ri-arrow-left-line me-1" />
            Back to Staffs
          </Link>,
          canEdit && (
            <Link key="edit" href={`/owner/invitations/${id}/edit`} className="btn btn-primary radius-12">
              <i className="ri-edit-line me-1" />
              Edit
            </Link>
          ),
        ].filter(Boolean)}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      <div className="row g-4">
        <div className="col-12 col-lg-8">
          <div className="card radius-12 border-0 shadow-sm">
            <div className="card-body p-24">
              <h5 className="mb-24">Invitation Information</h5>

              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="text-muted small mb-1">Status</label>
                  <div>
                    <StatusBadge status={invite?.status} />
                    {expired && invite?.status === "PENDING" && (
                      <span className="badge bg-danger ms-2">Expired</span>
                    )}
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <label className="text-muted small mb-1">Role</label>
                  <div className="fw-semibold">{invite?.role || "—"}</div>
                </div>

                <div className="col-12 col-md-6">
                  <label className="text-muted small mb-1">Display Name</label>
                  <div className="fw-semibold">{invite?.displayName || "—"}</div>
                </div>

                <div className="col-12 col-md-6">
                  <label className="text-muted small mb-1">Email</label>
                  <div className="fw-semibold">
                    {invite?.email ? (
                      <a href={`mailto:${invite.email}`} className="text-decoration-none">
                        {invite.email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <label className="text-muted small mb-1">Phone</label>
                  <div className="fw-semibold">
                    {invite?.phone ? (
                      <a href={`tel:${invite.phone}`} className="text-decoration-none">
                        {invite.phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <label className="text-muted small mb-1">Invite as Doctor</label>
                  <div className="fw-semibold">
                    {invite?.inviteAsDoctor ? (
                      <span className="badge bg-info">Yes</span>
                    ) : (
                      <span className="badge bg-secondary">No</span>
                    )}
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <label className="text-muted small mb-1">Branch</label>
                  <div className="fw-semibold">
                    {invite?.branch?.name ? (
                      <Link href={`/owner/branches/${invite.branchId}`} className="text-decoration-none">
                        {invite.branch.name}
                        <i className="ri-external-link-line ms-1" style={{ fontSize: "12px" }} />
                      </Link>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <label className="text-muted small mb-1">Organization</label>
                  <div className="fw-semibold">{invite?.org?.name || "—"}</div>
                </div>

                <div className="col-12 col-md-6">
                  <label className="text-muted small mb-1">Expires At</label>
                  <div className="fw-semibold">
                    {formatDate(invite?.expiresAt)}
                    {expired && <span className="text-danger ms-2">(Expired)</span>}
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <label className="text-muted small mb-1">Created At</label>
                  <div className="fw-semibold">{formatDate(invite?.createdAt)}</div>
                </div>

                {invite?.invitedBy && (
                  <div className="col-12">
                    <label className="text-muted small mb-1">Invited By</label>
                    <div className="fw-semibold">
                      {invite.invitedBy.profile?.displayName || invite.invitedBy.auth?.email || `User #${invite.invitedBy.id}`}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="card radius-12 border-0 shadow-sm">
            <div className="card-body p-24">
              <h5 className="mb-24">Actions</h5>

              <div className="d-grid gap-2">
                {canResend && (
                  <button
                    className="btn btn-warning radius-12"
                    onClick={handleResend}
                    disabled={actionLoading}
                  >
                    <i className="ri-refresh-line me-1" />
                    Resend Invitation
                  </button>
                )}

                {canReinvite && (
                  <button
                    className="btn btn-warning radius-12"
                    onClick={handleReinvite}
                    disabled={actionLoading}
                  >
                    <i className="ri-refresh-line me-1" />
                    Re-invite
                  </button>
                )}

                {canEdit && (
                  <Link
                    href={`/owner/invitations/${id}/edit`}
                    className="btn btn-primary radius-12"
                  >
                    <i className="ri-edit-line me-1" />
                    Edit Invitation
                  </Link>
                )}

                {canCancel && (
                  <button
                    className="btn btn-danger radius-12"
                    onClick={handleCancel}
                    disabled={actionLoading}
                  >
                    <i className="ri-close-circle-line me-1" />
                    Cancel Invitation
                  </button>
                )}
              </div>

              {actionLoading && (
                <div className="text-center mt-3">
                  <div className="spinner-border spinner-border-sm text-primary" role="status">
                    <span className="visually-hidden">Processing...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
