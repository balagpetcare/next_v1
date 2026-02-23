"use client";

export default function ConfirmRoleModal({ show, member, newRoleKey, roles, onConfirm, onCancel, loading }) {
  if (!show || !member) return null;
  const roleLabel = roles.find((r) => r.key === newRoleKey)?.label || newRoleKey;

  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Change Role</h5>
              <button type="button" className="btn-close" onClick={onCancel} aria-label="Close" />
            </div>
            <div className="modal-body">
              Change role for <strong>{member.user?.profile?.displayName || member.user?.displayName || "this staff member"}</strong> to <strong>{roleLabel}</strong>?
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={loading}>
                {loading ? "Updating…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}
