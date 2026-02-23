"use client";

import { getPermissionsForRole, groupPermissionsByCategory } from "../../../_lib/producerPermissions";

export default function PermissionsModal({ show, member, roles, onClose }) {
  if (!show || !member) return null;

  const role = member.role ? roles.find((r) => r.key === member.role?.key) || member.role : null;
  const permissionKeys = getPermissionsForRole(member.role);
  const groups = groupPermissionsByCategory(permissionKeys);

  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="permissionsTitle">
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="permissionsTitle">Permissions</h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>
            <div className="modal-body">
              <p className="mb-2">
                <strong>{member.user?.profile?.displayName || member.user?.displayName || "Staff"}</strong> — Role: <span className="badge bg-primary">{role?.label || member.role?.key || "—"}</span>
              </p>
              {permissionKeys.length === 0 ? (
                <p className="text-secondary mb-0">No permissions assigned.</p>
              ) : (
                <div className="small">
                  {Object.entries(groups).map(([category, keys]) => {
                    if (keys.length === 0) return null;
                    return (
                      <div key={category} className="mb-3">
                        <strong className="text-muted">{category}</strong>
                        <ul className="list-unstyled mb-0 mt-1">
                          {keys.map((key) => (
                            <li key={key} className="text-break">
                              <code className="bg-light px-1 rounded">{key}</code>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}
