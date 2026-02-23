"use client";

export default function ConfirmRemoveModal({ show, member, onConfirm, onCancel, loading, isSelf }) {
  if (!show || !member) return null;

  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title text-danger">Remove Staff</h5>
              <button type="button" className="btn-close" onClick={onCancel} aria-label="Close" />
            </div>
            <div className="modal-body">
              {isSelf ? (
                <p className="mb-0 text-danger">You cannot remove yourself from the organization.</p>
              ) : (
                <p className="mb-0">
                  Remove <strong>{member.user?.profile?.displayName || member.user?.displayName || "this staff member"}</strong> from your producer organization? This action cannot be undone.
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
                Cancel
              </button>
              {!isSelf && (
                <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={loading}>
                  {loading ? "Removing…" : "Remove"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}
