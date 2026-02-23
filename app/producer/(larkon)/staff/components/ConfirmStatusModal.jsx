"use client";

export default function ConfirmStatusModal({ show, member, status, onConfirm, onCancel, loading }) {
  if (!show || !member) return null;
  const isSuspend = status === "SUSPENDED";

  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{isSuspend ? "Suspend Staff" : "Activate Staff"}</h5>
              <button type="button" className="btn-close" onClick={onCancel} aria-label="Close" />
            </div>
            <div className="modal-body">
              {isSuspend ? (
                <p className="mb-0">
                  Suspend <strong>{member.user?.profile?.displayName || member.user?.displayName || "this staff member"}</strong>? They will not be able to access the Producer panel until activated again.
                </p>
              ) : (
                <p className="mb-0">
                  Activate <strong>{member.user?.profile?.displayName || member.user?.displayName || "this staff member"}</strong>? They will be able to access the Producer panel with their assigned role.
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
                Cancel
              </button>
              <button
                type="button"
                className={isSuspend ? "btn btn-warning" : "btn btn-success"}
                onClick={onConfirm}
                disabled={loading}
              >
                {loading ? "Updating…" : isSuspend ? "Suspend" : "Activate"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}
