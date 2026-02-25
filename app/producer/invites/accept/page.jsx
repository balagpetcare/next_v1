"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { producerStaffInvitesAcceptPublic } from "../../_lib/producerApi";

export default function ProducerInviteAcceptPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState("loading"); // loading | ready | accepting | done | error
  const [message, setMessage] = useState("");
  const [doneAction, setDoneAction] = useState(null); // "accepted"
  const [producerName, setProducerName] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!token || !token.trim()) {
      setStatus("error");
      setMessage("Invalid invite link: missing token.");
      return;
    }
    setStatus("ready");
  }, [token]);

  const handleAccept = async () => {
    if (!token || status !== "ready") return;
    if (!password || password.length < 4) {
      setStatus("error");
      setMessage("Password is required (min 4 chars).");
      return;
    }
    setStatus("accepting");
    try {
      const data = await producerStaffInvitesAcceptPublic({ token, password, name: name || undefined });
      setProducerName(data?.producerName || "the producer");
      setDoneAction("accepted");
      setStatus("done");
      const next = data?.default_redirect || "/producer/dashboard";
      setTimeout(() => router.replace(next), 300);
    } catch (e) {
      setStatus("error");
      setMessage(e?.message || "Failed to accept invite.");
    }
  };

  if (status === "loading") {
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
            <p className="text-success mb-3">
              {producerName ? `You have joined ${producerName} as staff.` : "You have accepted the invitation."}
            </p>
            <a href="/producer/dashboard" className="btn btn-primary">Go to Dashboard</a>
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
            Set a password to activate your staff access.
          </p>
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
              placeholder="Create a password"
              type="password"
            />
            <small className="text-secondary">Minimum 4 characters.</small>
          </div>
          <div className="d-flex gap-2 justify-content-end">
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
