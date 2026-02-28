"use client";

import { useState } from "react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function validateEmail(email) {
  if (!email?.trim()) return null;
  return EMAIL_REGEX.test(email.trim()) ? null : "Enter a valid email address.";
}

function validatePhone(phone) {
  if (!phone?.trim()) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return "Phone should be 10–15 digits.";
  return null;
}

export default function InviteStaffModal({ show, onClose, formData, setFormData, onSubmit, loading, roles, inviteResult, onClearInviteResult }) {
  const [copied, setCopied] = useState(false);
  const [touched, setTouched] = useState({ email: false, phone: false });
  if (!show) return null;

  const emailError = touched.email ? validateEmail(formData.email) : null;
  const phoneError = touched.phone ? validatePhone(formData.phone) : null;
  const hasEmailOrPhone = (formData.email || "").trim() || (formData.phone || "").trim();
  const validEmail = !formData.email?.trim() || !validateEmail(formData.email);
  const validPhone = !formData.phone?.trim() || !validatePhone(formData.phone);
  const canSubmit = hasEmailOrPhone && validEmail && validPhone;

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched({ email: true, phone: true });
    if (!canSubmit) return;
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
                    className={`form-control ${emailError ? "is-invalid" : ""}`}
                    value={formData.email || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                    placeholder="staff@example.com"
                  />
                  {emailError && <div className="invalid-feedback">{emailError}</div>}
                </div>
                <div className="mb-3">
                  <label className="form-label">Phone (optional if email provided)</label>
                  <input
                    type="tel"
                    className={`form-control ${phoneError ? "is-invalid" : ""}`}
                    value={formData.phone || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    onBlur={() => setTouched((p) => ({ ...p, phone: true }))}
                    placeholder="10–15 digits"
                  />
                  {phoneError && <div className="invalid-feedback">{phoneError}</div>}
                </div>
                <div className="mb-3">
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
                <div className="mb-0">
                  <label className="form-label">Personal message (optional)</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={formData.message || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                    placeholder="Add a note to the invitation email…"
                  />
                </div>
                  </>
                ) : (
                  <>
                    <p className="text-success small mb-2">Invitation created successfully.</p>
                    {inviteResult.expiresAt && (
                      <p className="text-muted small mb-2">
                        Expires in {Math.max(0, Math.ceil((new Date(inviteResult.expiresAt) - new Date()) / (24 * 60 * 60 * 1000)))} days.
                      </p>
                    )}
                    {inviteResult.inviteLink && (
                      <div className="mb-0">
                        <label className="form-label small">Share this link with the invitee</label>
                        <div className="input-group">
                          <input
                            type="text"
                            className="form-control font-monospace small"
                            readOnly
                            value={inviteResult.inviteLink}
                          />
                          <button
                            type="button"
                            className="btn btn-primary"
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
                      disabled={loading || !canSubmit}
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
