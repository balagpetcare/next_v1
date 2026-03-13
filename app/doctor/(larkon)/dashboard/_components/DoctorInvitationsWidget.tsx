"use client";

import { useCallback, useEffect, useState } from "react";
import { getMeInvitations, acceptMeInvitation, declineMeInvitation } from "@/lib/api";

type InvitationItem = {
  id: number;
  branchId: number;
  branchName: string | null;
  orgName: string | null;
  role: string;
  status: string;
  inviteAsDoctor: boolean;
  expiresAt: string | null;
  createdAt: string | null;
};

export function DoctorInvitationsWidget() {
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getMeInvitations();
      setInvitations(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("Failed to load invitations:", e);
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pending = invitations.filter(
    (i) => i.status === "PENDING" && i.inviteAsDoctor
  );
  const actionablePending = pending.filter((i) => {
    if (!i.expiresAt) return true;
    return new Date(i.expiresAt).getTime() >= Date.now();
  });

  const handleAccept = async (id: number) => {
    if (processingId !== null) return;
    try {
      setProcessingId(id);
      await acceptMeInvitation(id);
      await load();
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (e) {
      alert((e as Error)?.message ?? "Failed to accept invitation");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (id: number) => {
    if (processingId !== null) return;
    try {
      setProcessingId(id);
      await declineMeInvitation(id);
      await load();
    } catch (e) {
      alert((e as Error)?.message ?? "Failed to decline invitation");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading || actionablePending.length === 0) {
    if (loading) {
      return (
        <div className="card radius-12 mb-3">
          <div className="card-body p-24">
            <div className="text-secondary text-center py-12 small">Loading invitations…</div>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="card radius-12 mb-3">
      <div className="card-body p-24">
        <div className="d-flex align-items-center justify-content-between mb-16">
          <h6 className="mb-0 fw-semibold">
            <i className="solar:letter-outline me-2" />
            Clinic invitations
          </h6>
          <span className="badge bg-primary">{actionablePending.length}</span>
        </div>
        <div className="d-flex flex-column gap-12">
          {actionablePending.map((inv) => {
            const isProcessing = processingId === inv.id;
            const expiresAt = inv.expiresAt ? new Date(inv.expiresAt) : null;
            const isExpired = expiresAt && expiresAt.getTime() < Date.now();

            return (
              <div
                key={inv.id}
                className="alert alert-info py-12 px-16 radius-8 mb-0 d-flex align-items-start justify-content-between gap-16"
                role="alert"
              >
                <div className="flex-grow-1">
                  <div className="fw-semibold mb-4">Invitation as Doctor</div>
                  <div className="small mb-2">
                    {inv.branchName && (
                      <span className="me-2">
                        <i className="solar:shop-2-outline me-1" />
                        <strong>{inv.branchName}</strong>
                      </span>
                    )}
                    {inv.orgName && (
                      <span className="text-muted">
                        <i className="solar:buildings-outline me-1" />
                        {inv.orgName}
                      </span>
                    )}
                  </div>
                  {expiresAt && (
                    <div className={`small ${isExpired ? "text-danger" : "text-muted"}`}>
                      {isExpired ? "Expired" : `Expires: ${expiresAt.toLocaleString()}`}
                    </div>
                  )}
                </div>
                <div className="d-flex gap-8 flex-shrink-0">
                  {!isExpired && (
                    <>
                      <button
                        type="button"
                        className="btn btn-success btn-sm px-12 py-8"
                        onClick={() => handleAccept(inv.id)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <span className="spinner-border spinner-border-sm me-1" />
                        ) : (
                          <i className="solar:check-circle-outline me-1" />
                        )}
                        Accept
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm px-12 py-8"
                        onClick={() => handleDecline(inv.id)}
                        disabled={isProcessing}
                      >
                        <i className="solar:close-circle-outline me-1" />
                        Decline
                      </button>
                    </>
                  )}
                  {isExpired && <span className="badge bg-danger">Expired</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
