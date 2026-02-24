"use client";

import { useState } from "react";

export default function InviteStaffModal({ show, onClose, formData, setFormData, onSubmit, loading, roles, inviteResult, onClearInviteResult }) {
  const [copied, setCopied] = useState(false);
  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.email?.trim() && !formData.phone?.trim()) return;
    onSubmit();
  };

  const handleCopyLink = () => {
    if (!inviteResult?.inviteLink) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(inviteResult.inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    onClearInviteResult?.();
    onClose();
  };

  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="inviteStaffTitle">
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h5 className="modal-title" id="inviteStaffTitle">Invite Staff Member</h5>
                <button type="button" className="btn-close" onClick={handleClose} aria-label="Close" />
              </div>
              <div className="modal-body">
                {!inviteResult ? (
                  <>
                    <p className="text-secondary small mb-3">
                      Enter email or phone. If they already have an account, they will receive an in-app invitation. If not, we&apos;ll send an invitation to register.
                    </p>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={formData.email || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="staff@example.com"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Phone (optional if email provided)</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={formData.phone || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="01XXXXXXXXX"
                  />
                </div>
                <div className="mb-0">
                  <label className="form-label">Role</label>
                  <select
                    className="form-select"
                    value={formData.roleKey || "PRODUCER_VIEWER"}
                    onChange={(e) => setFormData((prev) => ({ ...prev, roleKey: e.target.value }))}
                  >
                    {roles.map((role) => (
                      <option key={role.key} value={role.key}>
                        {role.label} — {role.description}
                      </option>
                    ))}
                  </select>
                </div>
                  </>
                ) : (
                  <>
                    <p className="text-success small mb-2">Invitation created successfully.</p>
                    {inviteResult.inviteLink && (
                      <div className="mb-0">
                        <label className="form-label small">Share this link with the invitee</label>
                        <div className="input-group input-group-sm">
                          <input
                            type="text"
                            className="form-control font-monospace small"
                            readOnly
                            value={inviteResult.inviteLink}
                          />
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={handleCopyLink}
                          >
                            {copied ? "Copied!" : "Copy link"}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="modal-footer">
                {inviteResult ? (
                  <button type="button" className="btn btn-primary" onClick={handleClose}>
                    Done
                  </button>
                ) : (
                  <>
                    <button type="button" className="btn btn-outline-secondary" onClick={handleClose}>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading || (!(formData.email || "").trim() && !(formData.phone || "").trim())}
                    >
                      {loading ? "Sending…" : "Send Invitation"}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}
