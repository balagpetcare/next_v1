"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  producerStaffInvitePreview,
  producerStaffInvitesAccept,
  producerStaffInvitesAcceptPublic,
  producerStaffInvitesDecline,
  producerMe,
  clearProducerMeCache,
} from "../../_lib/producerApi";
import { normalizeApiError, useApiErrorPopup } from "../../_lib/apiErrorPopup";

export default function ProducerInviteAcceptPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showApiErrorPopup, ApiErrorModal } = useApiErrorPopup();
  const token = searchParams.get("token");
  const [status, setStatus] = useState("loading"); // loading | ready_logged_in | ready_register | accepting | declining | done | error
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(null);
  const [producerName, setProducerName] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showRegisterForm, setShowRegisterForm] = useState(false);

  useEffect(() => {
    if (!token || !token.trim()) {
      setStatus("error");
      setMessage(searchParams.get("error") === "missing" ? "Invalid invite link: missing token." : "Invalid invite link: missing token.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await producerStaffInvitePreview(token);
        if (cancelled) return;
        setPreview(data);
        try {
          await producerMe(false);
          if (cancelled) return;
          setStatus("ready_logged_in");
        } catch {
          if (cancelled) return;
          setStatus("ready_register");
        }
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        showApiErrorPopup(normalizeApiError(e));
      }
    })();
    return () => { cancelled = true; };
  }, [token, searchParams]);

  const handleAcceptLoggedIn = async () => {
    if (!token) return;
    setStatus("accepting");
    try {
      const data = await producerStaffInvitesAccept({ token });
      clearProducerMeCache();
      setProducerName(data?.producerName || preview?.orgName || "the producer");
      setStatus("done");
      setTimeout(() => router.replace("/producer/dashboard"), 1500);
    } catch (e) {
      setStatus("ready_logged_in");
      showApiErrorPopup(normalizeApiError(e));
    }
  };

  const handleDecline = async () => {
    if (!token) return;
    setStatus("declining");
    try {
      await producerStaffInvitesDecline({ token });
      setStatus("done");
      setMessage("You declined the invitation.");
    } catch (e) {
      setStatus("ready_logged_in");
      showApiErrorPopup(normalizeApiError(e));
    }
  };

  const handleAcceptPublic = async () => {
    if (!token || !password || password.length < 4) {
      setMessage("Password is required (min 4 characters).");
      return;
    }
    setStatus("accepting");
    setMessage("");
    try {
      const data = await producerStaffInvitesAcceptPublic({ token, password, name: name || undefined });
      setProducerName(data?.producerName || preview?.orgName || "the producer");
      setStatus("done");
      setTimeout(() => router.replace("/producer/dashboard"), 1500);
    } catch (e) {
      setStatus("ready_register");
      showApiErrorPopup(normalizeApiError(e));
    }
  };

  if (status === "loading") {
    return (
      <>
        <ApiErrorModal />
        <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
          <p className="text-secondary mb-0">Loading invitation…</p>
        </div>
      </div>
      </>
    );
  }

  if (status === "error") {
    return (
      <>
        <ApiErrorModal />
        <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-3">
        <div className="card shadow-sm" style={{ maxWidth: 400 }}>
          <div className="card-body text-center">
            <h5 className="card-title text-danger mb-2">Invalid or expired invite link</h5>
            <p className="text-secondary mb-3">{message || "The link may be invalid or expired."}</p>
            <p className="small text-muted mb-4">
              The link may have expired or already been used. Ask the person who invited you to send a new invitation from the Producer Staff page.
            </p>
            <Link href="/producer" className="btn btn-primary">Go to Producer</Link>
          </div>
        </div>
      </div>
      </>
    );
  }

  if (status === "done") {
    return (
      <>
        <ApiErrorModal />
        <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-3">
        <div className="card shadow-sm" style={{ maxWidth: 400 }}>
          <div className="card-body text-center">
            {producerName ? (
              <p className="text-success mb-3">You have joined <strong>{producerName}</strong> as staff.</p>
            ) : message ? (
              <p className="text-secondary mb-3">{message}</p>
            ) : (
              <p className="text-success mb-3">You have accepted the invitation.</p>
            )}
            <Link href="/producer/dashboard" className="btn btn-primary">Go to Dashboard</Link>
          </div>
        </div>
      </div>
      </>
    );
  }

  if (status === "ready_logged_in") {
    return (
      <>
        <ApiErrorModal />
        <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-3">
        <div className="card shadow-sm" style={{ maxWidth: 400 }}>
          <div className="card-body">
            <h5 className="card-title">Staff invitation</h5>
            <p className="text-secondary mb-3">
              You have been invited to join <strong>{preview?.orgName || "this producer"}</strong> as <strong>{preview?.roleLabel || "staff"}</strong>.
            </p>
            {message && <div className="alert alert-warning small mb-3">{message}</div>}
            <div className="d-flex gap-2 flex-wrap">
              <button
                type="button"
                className="btn btn-primary"
                disabled={status === "accepting" || status === "declining"}
                onClick={handleAcceptLoggedIn}
              >
                {status === "accepting" ? "Accepting…" : "Accept"}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={status === "accepting" || status === "declining"}
                onClick={handleDecline}
              >
                {status === "declining" ? "Declining…" : "Decline"}
              </button>
            </div>
          </div>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      <ApiErrorModal />
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-3">
      <div className="card shadow-sm" style={{ maxWidth: 440 }}>
        <div className="card-body">
          <h5 className="card-title">Staff invitation</h5>
          <p className="text-secondary mb-3">
            You have been invited to join <strong>{preview?.orgName || "this producer"}</strong> as <strong>{preview?.roleLabel || "staff"}</strong>.
          </p>
          {!showRegisterForm ? (
            <>
              <p className="small text-muted mb-3">Log in with your existing account to accept, or create an account below.</p>
              <Link
                href={`/producer/login?returnUrl=${encodeURIComponent(typeof window !== "undefined" ? "/producer/invites/accept?token=" + (token || "") : "/producer/invites/accept")}`}
                className="btn btn-primary me-2"
              >
                Log in to accept
              </Link>
              <button type="button" className="btn btn-outline-secondary" onClick={() => setShowRegisterForm(true)}>
                I don’t have an account
              </button>
            </>
          ) : (
            <>
              <p className="small text-muted mb-3">Create a password to join. Use the same email or phone this invite was sent to.</p>
              {message && <div className="alert alert-warning small mb-3">{message}</div>}
              <div className="mb-3">
                <label className="form-label">Name (optional)</label>
                <input
                  className="form-control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  type="text"
                />
              </div>
              <div className="mb-4">
                <label className="form-label">Password</label>
                <input
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password (min 4 characters)"
                  type="password"
                />
              </div>
              <div className="d-flex gap-2 flex-wrap">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={status === "accepting"}
                  onClick={handleAcceptPublic}
                >
                  {status === "accepting" ? "Accepting…" : "Accept & join"}
                </button>
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowRegisterForm(false)}>
                  Back
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
