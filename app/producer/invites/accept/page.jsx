"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { producerMe, producerStaffInvitesAccept, producerStaffInvitesDecline } from "../../_lib/producerApi";

export default function ProducerInviteAcceptPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState("loading"); // loading | need-auth | ready | accepting | declining | done | error
  const [message, setMessage] = useState("");
  const [doneAction, setDoneAction] = useState(null); // "accepted" | "declined"
  const [producerName, setProducerName] = useState("");

  useEffect(() => {
    if (!token || !token.trim()) {
      setStatus("error");
      setMessage("Invalid invite link: missing token.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await producerMe();
        if (cancelled) return;
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        if (e?.status === 401) {
          const returnTo = encodeURIComponent(`/producer/invites/accept?token=${encodeURIComponent(token)}`);
          window.location.href = `/producer/login?returnTo=${returnTo}`;
          return;
        }
        setStatus("error");
        setMessage(e?.message || "Something went wrong.");
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const handleAccept = async () => {
    if (!token || status !== "ready") return;
    setStatus("accepting");
    try {
      const data = await producerStaffInvitesAccept({ token });
      setProducerName(data?.producerName || "the producer");
      setDoneAction("accepted");
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setMessage(e?.message || "Failed to accept invite.");
    }
  };

  const handleDecline = async () => {
    if (!token || status !== "ready") return;
    setStatus("declining");
    try {
      await producerStaffInvitesDecline({ token });
      setDoneAction("declined");
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setMessage(e?.message || "Failed to decline invite.");
    }
  };

  if (status === "loading" || status === "need-auth") {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
          <p className="text-secondary mb-0">Loading invitation…</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-3">
        <div className="card shadow-sm" style={{ maxWidth: 400 }}>
          <div className="card-body text-center">
            <p className="text-danger mb-3">{message}</p>
            <a href="/producer" className="btn btn-primary">Go to Producer dashboard</a>
          </div>
        </div>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-3">
        <div className="card shadow-sm" style={{ maxWidth: 400 }}>
          <div className="card-body text-center">
            {doneAction === "accepted" ? (
              <p className="text-success mb-3">
                {producerName ? `You have joined ${producerName} as staff.` : "You have accepted the invitation."}
              </p>
            ) : (
              <p className="text-secondary mb-3">You have declined the invitation.</p>
            )}
            <a href="/producer/staff" className="btn btn-primary">Go to Staff</a>
            <a href="/producer/dashboard" className="btn btn-outline-secondary ms-2">Dashboard</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-3">
      <div className="card shadow-sm" style={{ maxWidth: 400 }}>
        <div className="card-body">
          <h5 className="card-title">Staff invitation</h5>
          <p className="text-secondary mb-4">
            You have been invited to join a producer organization as staff. Accept to get access to their producer dashboard.
          </p>
          <div className="d-flex gap-2 justify-content-end">
            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={status === "declining"}
              onClick={handleDecline}
            >
              {status === "declining" ? "Declining…" : "Decline"}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={status === "accepting"}
              onClick={handleAccept}
            >
              {status === "accepting" ? "Accepting…" : "Accept"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
