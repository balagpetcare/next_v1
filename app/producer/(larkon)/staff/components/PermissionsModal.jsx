"use client";

import { useState, useMemo } from "react";
import {
  getPermissionsForRole,
} from "../../../_lib/producerPermissions";
import {
  getPermissionLabel,
  groupPermissionsByLabel,
  isPrivilegedPermission,
} from "../../../_lib/permissionLabels";

const IS_DEV = typeof process !== "undefined" && process.env.NODE_ENV !== "production";

const GROUP_ORDER = [
  "Organization",
  "KYC",
  "Staff",
  "Products",
  "Batch",
  "Codes",
  "Verification",
  "Analytics",
  "Other",
];

export default function PermissionsModal({ show, member, roles, onClose }) {
  const [search, setSearch] = useState("");
  const [openGroup, setOpenGroup] = useState(null);

  const role = member?.role ? roles?.find((r) => r.key === member.role?.key) || member.role : null;
  const permissionKeys = member?.role ? getPermissionsForRole(member.role) : [];
  const groups = groupPermissionsByLabel(permissionKeys);

  const searchLower = search.trim().toLowerCase();
  const filteredGroups = useMemo(() => {
    if (!searchLower) return groups;
    const out = {};
    Object.entries(groups).forEach(([group, keys]) => {
      const filtered = keys.filter((key) => {
        const { title, description } = getPermissionLabel(key);
        return (
          title.toLowerCase().includes(searchLower) ||
          description.toLowerCase().includes(searchLower)
        );
      });
      if (filtered.length) out[group] = filtered;
    });
    return out;
  }, [groups, searchLower]);

  if (!show || !member) return null;

  const emailOrPhone =
    member.user?.auth?.email ||
    member.user?.auth?.phone ||
    member.user?.email ||
    member.user?.phone ||
    "—";
  const displayName =
    member.user?.profile?.displayName || member.user?.displayName || "Staff";
  const privilegedCount = permissionKeys.filter(isPrivilegedPermission).length;

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="permissionsTitle"
      >
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="permissionsTitle">
                Permissions
              </h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>
            <div className="modal-body">
              {/* Summary */}
              <div className="card bg-light border-0 radius-12 mb-3">
                <div className="card-body py-2">
                  <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                    <strong>{displayName}</strong>
                    <span className="badge bg-primary">{role?.label || member.role?.key || "—"}</span>
                    {privilegedCount > 0 && (
                      <span className="badge bg-success">
                        {privilegedCount} edit/export
                      </span>
                    )}
                  </div>
                  <div className="small text-muted">{emailOrPhone}</div>
                  <div className="small text-muted mt-1">
                    {permissionKeys.length} permission{permissionKeys.length !== 1 ? "s" : ""} total
                  </div>
                </div>
              </div>

              {permissionKeys.length === 0 ? (
                <p className="text-secondary mb-0">No permissions assigned.</p>
              ) : (
                <>
                  <div className="mb-3">
                    <input
                      type="text"
                      className="form-control form-control-sm radius-12"
                      placeholder="Search by permission or description…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      aria-label="Search permissions"
                    />
                  </div>
                  <div className="small">
                    {GROUP_ORDER.map((category) => {
                      const keys = filteredGroups[category];
                      if (!keys || keys.length === 0) return null;
                      const isOpen = openGroup === category;
                      return (
                        <div key={category} className="border rounded-2 mb-2 overflow-hidden">
                          <button
                            type="button"
                            className="w-100 d-flex align-items-center justify-content-between py-2 px-3 small bg-light border-0 text-start"
                            onClick={() => setOpenGroup(isOpen ? null : category)}
                            aria-expanded={isOpen}
                          >
                            <span className="text-muted fw-bold">{category}</span>
                            <span className="badge bg-secondary rounded-pill">{keys.length}</span>
                          </button>
                          {isOpen && (
                            <div className="px-3 py-2 border-top">
                              <ul className="list-unstyled mb-0">
                                {keys.map((key) => {
                                  const { title, description } = getPermissionLabel(key);
                                  return (
                                    <li
                                      key={key}
                                      className="d-flex align-items-start gap-2 py-1"
                                      data-permission-key={key}
                                      title={IS_DEV ? key : undefined}
                                    >
                                      <span className="badge bg-primary bg-opacity-10 text-primary rounded mt-1" style={{ minWidth: "1rem" }} />
                                      <div>
                                        <span className="fw-medium">{title}</span>
                                        <div className="text-muted" style={{ fontSize: "0.8em" }}>
                                          {description}
                                        </div>
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {searchLower && Object.keys(filteredGroups).length === 0 && (
                    <p className="text-muted small mb-0">No permissions match your search.</p>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary radius-12" onClick={onClose}>
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
