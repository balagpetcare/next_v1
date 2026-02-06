// @ts-nocheck
"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api";

export default function StaffInvitationsPage() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("BRANCH_STAFF");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function sendInvite() {
    setMessage("");
    setLoading(true);
    try {
      // Backend endpoint may vary by version. This keeps the UI unblocked;
      // if the endpoint differs, you'll see the exact error message here.
      await apiPost("/api/v1/owner/staff-invites", {
        email: email || undefined,
        phone: phone || undefined,
        role,
      });
      setMessage("Invite sent (or queued). Check email/SMS logs.");
      setEmail("");
      setPhone("");
    } catch (e) {
      setMessage(e?.message || "Failed to send invite");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dashboard-main-body">
      <div className="card radius-12">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h6 className="mb-0">Staff Invitations</h6>
        </div>

        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-5">
              <label className="form-label">Email (optional)</label>
              <input
                className="form-control radius-12"
                placeholder="staff@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Phone (optional)</label>
              <input
                className="form-control radius-12"
                placeholder="01XXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Role</label>
              <select className="form-select radius-12" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="ORG_ADMIN">ORG_ADMIN</option>
                <option value="BRANCH_MANAGER">BRANCH_MANAGER</option>
                <option value="BRANCH_STAFF">BRANCH_STAFF</option>
                <option value="SELLER">SELLER</option>
              </select>
            </div>
          </div>

          <div className="d-flex gap-2 flex-wrap mt-3">
            <button className="btn btn-primary radius-12" onClick={sendInvite} disabled={loading || (!email && !phone)}>
              {loading ? "Sending..." : "Send Invitation"}
            </button>
            <div className="text-secondary-light" style={{ alignSelf: "center" }}>
              Use at least Email or Phone.
            </div>
          </div>

          {message ? (
            <div className="alert alert-info mt-3 mb-0" role="alert">
              {message}
            </div>
          ) : null}

          <div className="mt-3 text-secondary-light" style={{ fontSize: 13 }}>
            Tip: Once the backend endpoint is confirmed (invite-based registration), we can show pending/expired/accepted invites here.
          </div>
        </div>
      </div>
    </div>
  );
}
