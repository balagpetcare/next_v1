"use client";

import { getPermissionsForRole } from "../../../_lib/producerPermissions";

export default function ConfirmRoleModal({ show, member, newRoleKey, roles, onConfirm, onCancel, loading }) {
  if (!show || !member) return null;
  const roleLabel = roles.find((r) => r.key === newRoleKey)?.label || newRoleKey;
  const rolePerms = newRoleKey ? getPermissionsForRole({ key: newRoleKey }) : [];

  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Change Role</h5>
              <button type="button" className="btn-close" onClick={onCancel} aria-label="Close" />
            </div>
            <div className="modal-body">
              <p className="mb-3">
                Change role for <strong>{member.user?.profile?.displayName || member.user?.displayName || "this staff member"}</strong> to <strong>{roleLabel}</strong>?
              </p>
              {rolePerms.length > 0 && (
                <div className="small">
                  <span className="text-muted fw-semibold">Role capabilities (Preview)</span>
                  <p className="text-muted mb-1 mt-0" style={{ fontSize: "0.7rem" }}>Frontend-derived; may not reflect backend exactly.</p>
                  <ul className="list-unstyled mb-0 ps-2 border-start border-2 border-light">
                    {rolePerms.map((p) => (
                      <li key={p} className="py-0">{p}</li>
                    ))}
                  </ul>
                </div>
              )}
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
