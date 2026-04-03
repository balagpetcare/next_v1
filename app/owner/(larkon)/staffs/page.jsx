"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useEntityList } from "@/app/owner/_hooks/useEntityList";
import { useEntityFilters } from "@/app/owner/_hooks/useEntityFilters";
import { useEntityActions } from "@/app/owner/_hooks/useEntityActions";
import { getEntityConfig } from "@/app/owner/_lib/entityConfig";
import {
  ownerGet,
  ownerPatch,
  ownerDelete,
  ownerResendInvitation,
  ownerReinviteInvitation,
  ownerCancelInvitation,
} from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import StatusBadge from "@/app/owner/_components/StatusBadge";
import ActionDropdown from "@/app/owner/_components/shared/ActionDropdown";


function nameFromRow(row, fallback = "—") {
  return (
    row?.user?.profile?.fullName ||
    row?.user?.profile?.displayName ||
    row?.user?.profile?.username ||
    row?.invitedDisplayName ||
    row?.user?.auth?.email ||
    row?.user?.auth?.phone ||
    row?.invitedEmail ||
    row?.invitedPhone ||
    fallback
  );
}

function getInitials(name) {
  if (!name) return "??";
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function getRoleBadgeColor(role) {
  const roleUpper = String(role || "").toUpperCase();
  if (roleUpper.includes("MANAGER")) return "info";
  if (roleUpper.includes("ADMIN")) return "primary";
  if (roleUpper.includes("STAFF")) return "secondary";
  if (roleUpper === "SELLER") return "success";
  if (roleUpper.includes("DELIVERY")) return "warning";
  return "secondary";
}

function OwnerStaffsContent() {
  const config = getEntityConfig("staff");
  const { filters, updateFilter } = useEntityFilters(config);
  const { data, loading, error, refresh } = useEntityList(config, filters);
  const { remove: deleteStaff } = useEntityActions(config);
  const [branches, setBranches] = useState([]);
  const [q, setQ] = useState("");
  const [actionBusyId, setActionBusyId] = useState(null);

  // Load branches for filter
  useEffect(() => {
    (async () => {
      try {
        const res = await ownerGet("/api/v1/owner/branches");
        const items = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        setBranches(items);
      } catch {
        setBranches([]);
      }
    })();
  }, []);

  // Filter by search query, branch, role, and status
  const filteredData = useMemo(() => {
    let result = data;

    // Branch filter
    if (filters.branchId && filters.branchId !== "ALL") {
      result = result.filter((r) => {
        const branchId = r?.branchId || r?.branch?.id || "";
        return String(branchId) === String(filters.branchId);
      });
    }

    // Role filter
    if (filters.role && filters.role !== "ALL") {
      result = result.filter((r) => {
        return String(r?.role || "").toUpperCase() === String(filters.role).toUpperCase();
      });
    }

    // Status filter
    if (filters.status && filters.status !== "ALL") {
      result = result.filter((r) => {
        const itemStatus = String(r?.status || r?.membershipStatus || "ACTIVE").toUpperCase();
        return itemStatus === String(filters.status).toUpperCase();
      });
    }

    // Search query filter
    if (q.trim()) {
      const query = q.trim().toLowerCase();
      result = result.filter((r) => {
        const searchableText = [
          nameFromRow(r, ""),
          r?.role,
          r?.status,
          r?.user?.auth?.email,
          r?.user?.auth?.phone,
          r?.branch?.name,
          r?.org?.name || r?.organization?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchableText.includes(query);
      });
    }

    return result;
  }, [data, filters, q]);

  const handleToggleStaffStatus = async (item) => {
    if (!item?.id) return;
    const normalized = String(item?.status || "ACTIVE").toUpperCase();
    const isActive = normalized === "ACTIVE";
    if (!confirm(isActive ? "Suspend this staff?" : "Activate this staff?")) return;
    setActionBusyId(item.id);
    try {
      await ownerPatch(`/api/v1/owner/staffs/${item.id}/${isActive ? "disable" : "enable"}`, {});
      await refresh();
    } catch (e) {
      alert(e?.response?.error || e?.message || (isActive ? "Suspend failed" : "Activate failed"));
    } finally {
      setActionBusyId(null);
    }
  };

  const handleResendInvite = async (item) => {
    if (!item?.inviteId) return;
    if (!confirm("Resend this invitation?")) return;
    setActionBusyId(item.inviteId);
    try {
      await ownerResendInvitation(item.inviteId);
      await refresh();
    } catch (e) {
      alert(e?.message || "Resend failed");
    } finally {
      setActionBusyId(null);
    }
  };

  const handleReinvite = async (item) => {
    if (!item?.inviteId) return;
    if (!confirm("Re-invite this staff member with a fresh link?")) return;
    setActionBusyId(item.inviteId);
    try {
      await ownerReinviteInvitation(item.inviteId);
      await refresh();
    } catch (e) {
      alert(e?.message || "Re-invite failed");
    } finally {
      setActionBusyId(null);
    }
  };

  const handleCancelInvite = async (item) => {
    if (!item?.inviteId) return;
    if (!confirm("Cancel this invitation?")) return;
    setActionBusyId(item.inviteId);
    try {
      await ownerCancelInvitation(item.inviteId);
      await refresh();
    } catch (e) {
      alert(e?.message || "Cancel failed");
    } finally {
      setActionBusyId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this staff permanently?")) return;
    try {
      await deleteStaff(id);
      await refresh();
    } catch (e) {
      alert(e?.message || "Delete failed");
    }
  };

  // Get unique roles and statuses for filters
  const availableRoles = useMemo(() => {
    const roles = [...new Set(data.map((r) => r?.role).filter(Boolean))].sort();
    return roles;
  }, [data]);

  const availableStatuses = useMemo(() => {
    const statuses = [...new Set(data.map((r) => r?.status || r?.membershipStatus || "ACTIVE").filter(Boolean))].sort();
    return statuses;
  }, [data]);

  const staffStats = useMemo(() => {
    const members = data.filter(r => r.rowType === 'MEMBER' || (!r.rowType && !r.inviteId));
    const invites = data.filter(r => r.rowType === 'INVITE' || r.inviteId);
    return {
      total: data.length,
      totalMembers: members.length,
      active: members.filter(r => String(r.status || '').toUpperCase() === 'ACTIVE').length,
      inactive: members.filter(r => ['INACTIVE', 'SUSPENDED', 'DISABLED'].includes(String(r.rawStatus || r.status || '').toUpperCase())).length,
      invited: invites.filter(r => r.rawStatus === 'PENDING').length,
      expired: invites.filter(r => r.rawStatus === 'EXPIRED').length,
    };
  }, [data]);

  const STATUS_LABELS = {
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    INVITED: 'Invited (Pending)',
    EXPIRED: 'Expired Invite',
    REVOKED: 'Revoked / Cancelled',
  };

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Staffs"
        subtitle="Manage your organization & branch staff members"
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Staffs", href: "/owner/staffs" },
        ]}
        actions={[
          <button
            key="refresh"
            className="btn btn-outline-secondary radius-12"
            onClick={refresh}
            disabled={loading}
          >
            <i className="ri-refresh-line me-1" />
            Refresh
          </button>,
          <Link
            key="new"
            href="/owner/staffs/new"
            className="btn btn-primary radius-12"
          >
            <i className="ri-user-add-line me-1" />
            Add / Invite
          </Link>,
        ]}
      />

      {/* Stats Cards */}
      {!loading && data.length > 0 && (
        <div className="row g-3 mb-24">
          {[
            { key: 'totalMembers', label: 'Total Staff', icon: 'ri-team-line', color: 'primary', filter: null },
            { key: 'active', label: 'Active', icon: 'ri-checkbox-circle-line', color: 'success', filter: 'ACTIVE' },
            { key: 'inactive', label: 'Inactive', icon: 'ri-indeterminate-circle-line', color: 'danger', filter: 'INACTIVE' },
            { key: 'invited', label: 'Invited', icon: 'ri-mail-send-line', color: 'warning', filter: 'INVITED' },
            { key: 'expired', label: 'Expired', icon: 'ri-time-line', color: 'secondary', filter: 'EXPIRED' },
          ].map(({ key, label, icon, color, filter }) => (
            <div key={key} className="col-6 col-md-4 col-xl">
              <div
                className="card radius-12 border-0 shadow-sm h-100"
                style={filter ? {
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s, outline 0.1s',
                  outline: filters.status === filter ? `2px solid var(--bs-${color}, #6c757d)` : '2px solid transparent',
                } : {}}
                onClick={filter ? () => updateFilter('status', filters.status === filter ? 'ALL' : filter) : undefined}
                title={filter ? (filters.status === filter ? `Clear ${label} filter` : `Show ${label} only`) : undefined}
              >
                <div className="card-body p-3 d-flex align-items-center gap-3">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: '40px', height: '40px', backgroundColor: color === 'primary' ? '#e0edff' : color === 'success' ? '#d1fae5' : color === 'danger' ? '#fee2e2' : color === 'warning' ? '#fef3c7' : '#f3f4f6' }}
                  >
                    <i className={`${icon} text-${color}`} style={{ fontSize: '18px' }} />
                  </div>
                  <div>
                    <div className="fw-bold fs-5 lh-1 mb-1">{staffStats[key] ?? 0}</div>
                    <div className="text-muted small">{label}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card radius-12 mb-24">
        <div className="card-body p-24">
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <label className="form-label">
                <i className="ri-search-line me-1" />
                Search
              </label>
              <div className="input-group">
                <span className="input-group-text bg-light">
                  <i className="ri-search-line" />
                </span>
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="form-control radius-12"
                  placeholder="Name, email, phone, role..."
                />
                {q && (
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => setQ("")}
                  >
                    <i className="ri-close-line" />
                  </button>
                )}
              </div>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">
                <i className="ri-store-line me-1" />
                Branch
              </label>
              <select
                value={filters.branchId || "ALL"}
                onChange={(e) => updateFilter("branchId", e.target.value)}
                className="form-select radius-12"
              >
                <option value="ALL">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.name || `Branch #${b.id}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-2">
              <label className="form-label">
                <i className="ri-user-settings-line me-1" />
                Role
              </label>
              <select
                value={filters.role || "ALL"}
                onChange={(e) => updateFilter("role", e.target.value)}
                className="form-select radius-12"
              >
                <option value="ALL">All Roles</option>
                {availableRoles.map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-2">
              <label className="form-label">
                <i className="ri-checkbox-circle-line me-1" />
                Status
              </label>
              <select
                value={filters.status || "ALL"}
                onChange={(e) => updateFilter("status", e.target.value)}
                className="form-select radius-12"
              >
                <option value="ALL">All Status</option>
                {availableStatuses.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s] || s}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-1 d-flex align-items-end">
              {(filters.branchId !== "ALL" || filters.role || filters.status || q) && (
                <button
                  className="btn btn-outline-secondary radius-12 w-100"
                  onClick={() => {
                    updateFilter("branchId", "ALL");
                    updateFilter("role", "ALL");
                    updateFilter("status", "ALL");
                    setQ("");
                  }}
                  title="Clear Filters"
                >
                  <i className="ri-close-line" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <div className="text-muted mt-3">Loading staff members...</div>
          </div>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <i className="ri-user-line fs-1 text-muted mb-3 d-block" />
            <div className="text-muted">
              {q || filters.branchId !== "ALL" || filters.role || filters.status
                ? "No staff members found matching your filters."
                : "No staff members yet. Invite staff to get started."}
            </div>
            {!q && (!filters.branchId || filters.branchId === "ALL") && (!filters.role || filters.role === "ALL") && (!filters.status || filters.status === "ALL") && (
              <Link
                href="/owner/staffs/new"
                className="btn btn-primary radius-12 mt-3"
              >
                <i className="ri-user-add-line me-1" />
                Invite Staff
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="card radius-12 border-0 shadow-sm">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table align-middle mb-0 table-hover">
                <thead className="table-light" style={{ backgroundColor: "#f8f9fa" }}>
                  <tr>
                    <th style={{ padding: "16px 20px", fontWeight: 600, fontSize: "13px" }}>Staff</th>
                    <th style={{ padding: "16px 20px", fontWeight: 600, fontSize: "13px" }}>Role</th>
                    <th style={{ padding: "16px 20px", fontWeight: 600, fontSize: "13px" }}>Branch</th>
                    <th style={{ padding: "16px 20px", fontWeight: 600, fontSize: "13px" }}>Organization</th>
                    <th style={{ padding: "16px 20px", fontWeight: 600, fontSize: "13px" }}>Contact</th>
                    <th style={{ padding: "16px 20px", fontWeight: 600, fontSize: "13px" }}>Status</th>
                    <th className="text-end" style={{ padding: "16px 20px", fontWeight: 600, fontSize: "13px", width: "80px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => {
                    const isInvite = item?.rowType === "INVITE" || item?.inviteId;
                    const rowId = isInvite ? item?.inviteId : item?.id;
                    const name = nameFromRow(item, `Staff #${rowId}`);
                    const initials = getInitials(name);
                    
                    const actions = isInvite
                      ? [
                          {
                            label: "View Details",
                            href: `/owner/invitations/${item?.inviteId}`,
                            icon: "solar:eye-outline",
                          },
                          { divider: true },
                          {
                            label: "Edit Invitation",
                            href: `/owner/invitations/${item?.inviteId}/edit`,
                            icon: "solar:pen-outline",
                            disabled: item?.rawStatus === "ACCEPTED" || item?.rawStatus === "REVOKED",
                          },
                          { divider: true },
                          {
                            label: item?.rawStatus === "PENDING" ? "Resend Invite" : "Re-invite",
                            onClick: (e) => {
                              e.stopPropagation();
                              if (item?.rawStatus === "PENDING") {
                                handleResendInvite(item);
                              } else {
                                handleReinvite(item);
                              }
                            },
                            icon: "solar:refresh-outline",
                            variant: "warning",
                            disabled: actionBusyId === item?.inviteId || item?.rawStatus === "ACCEPTED",
                          },
                          { divider: true },
                          {
                            label: "Cancel Invite",
                            onClick: (e) => {
                              e.stopPropagation();
                              handleCancelInvite(item);
                            },
                            icon: "solar:close-circle-outline",
                            variant: "danger",
                            disabled: actionBusyId === item?.inviteId || item?.rawStatus === "ACCEPTED" || item?.rawStatus === "REVOKED",
                          },
                        ]
                      : [
                          {
                            label: "View Details",
                            href: `/owner/staffs/${item.id}`,
                            icon: "solar:eye-outline",
                          },
                          { divider: true },
                          {
                            label: "Edit",
                            href: `/owner/staffs/${item.id}/edit`,
                            icon: "solar:pen-outline",
                          },
                          ...(item?.user?.id
                            ? [
                                { divider: true },
                                {
                                  label: "Manage access",
                                  href: `/owner/staff-access/staff/${item.user.id}`,
                                  icon: "solar:lock-keyhole-outline",
                                },
                              ]
                            : []),
                          { divider: true },
                          {
                            label: "Change branch",
                            href: `/owner/staffs/${item.id}/edit`,
                            icon: "solar:buildings-2-outline",
                          },
                          { divider: true },
                          {
                            label: item?.status === "ACTIVE" ? "Suspend" : "Activate",
                            onClick: (e) => {
                              e.stopPropagation();
                              handleToggleStaffStatus(item);
                            },
                            icon: item?.status === "ACTIVE" ? "solar:pause-circle-outline" : "solar:play-circle-outline",
                            variant: item?.status === "ACTIVE" ? "warning" : "success",
                            disabled: actionBusyId === item?.id,
                          },
                          {
                            divider: true,
                          },
                          {
                            label: "Delete",
                            onClick: (e) => {
                              e.stopPropagation();
                              handleDelete(item.id);
                            },
                            icon: "solar:trash-bin-trash-outline",
                            variant: "danger",
                            disabled: actionBusyId === item?.id,
                          },
                        ];

                    return (
                      <tr
                        key={item.rowKey || item.id}
                        style={{
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#f9fafb";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "";
                        }}
                      >
                        <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
                          <div className="d-flex align-items-center gap-3">
                            <div
                              className="bg-primary-50 text-primary-600 rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                              style={{ width: "40px", height: "40px", fontSize: "14px", fontWeight: "600" }}
                            >
                              {initials}
                            </div>
                            <div>
                              {isInvite ? (
                                <Link
                                  href={`/owner/invitations/${item.inviteId}`}
                                  className="text-decoration-none fw-semibold text-dark"
                                >
                                  {name}
                                </Link>
                              ) : (
                                <Link
                                  href={`/owner/staffs/${item.id}`}
                                  className="text-decoration-none fw-semibold text-dark"
                                >
                                  {name}
                                </Link>
                              )}
                              <div className="text-muted small d-flex align-items-center gap-1 mt-1">
                                {isInvite ? (
                                  <>
                                    <span className="badge text-bg-warning" style={{ fontSize: '9px', padding: '2px 5px', letterSpacing: '0.3px' }}>INVITE</span>
                                    <span className="text-muted">#{rowId}</span>
                                  </>
                                ) : (
                                  <span>ID: {item.id}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
                          <span className={`badge text-bg-${getRoleBadgeColor(item?.role)}`}>
                            {String(item?.role || "—").replace(/_/g, " ")}
                          </span>
                        </td>
                        <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
                          {item?.branch?.name ? (
                            <Link
                              href={`/owner/branches/${item.branchId || item.branch.id}`}
                              className="text-decoration-none text-primary"
                            >
                              {item.branch.name}
                              <i className="ri-external-link-line ms-1" style={{ fontSize: "12px" }} />
                            </Link>
                          ) : item?.branchId ? (
                            <span className="text-muted">Branch #{item.branchId}</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
                          {item?.org?.name || item?.organization?.name ? (
                            <span className="text-muted">
                              {item.org?.name || item.organization?.name}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
                          <div className="d-flex flex-column">
                            {(item?.user?.auth?.email || item?.invitedEmail) && (
                              <a
                                href={`mailto:${item?.user?.auth?.email || item?.invitedEmail}`}
                                className="text-decoration-none small"
                              >
                                <i className="ri-mail-line me-1" />
                                {item?.user?.auth?.email || item?.invitedEmail}
                              </a>
                            )}
                            {(item?.user?.auth?.phone || item?.invitedPhone) && (
                              <a
                                href={`tel:${item?.user?.auth?.phone || item?.invitedPhone}`}
                                className="text-decoration-none small text-muted"
                              >
                                <i className="ri-phone-line me-1" />
                                {item?.user?.auth?.phone || item?.invitedPhone}
                              </a>
                            )}
                            {!item?.user?.auth?.email && !item?.user?.auth?.phone && !item?.invitedEmail && !item?.invitedPhone && (
                              <span className="text-muted small">—</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
                          <StatusBadge status={item?.status || item?.membershipStatus || "ACTIVE"} />
                        </td>
                        <td
                          className="text-end"
                          style={{ padding: "16px 20px", verticalAlign: "middle" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ActionDropdown actions={actions} item={item} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Results Count */}
      {!loading && filteredData.length > 0 && (
        <div className="text-muted small mt-3 text-center">
          Showing {filteredData.length} of {data.length} staff {filteredData.length !== data.length ? "(filtered)" : ""}
        </div>
      )}
    </div>
  );
}

export default function OwnerStaffsPage() {
  return (
    <Suspense fallback={<div className="container py-4 text-secondary">Loading…</div>}>
      <OwnerStaffsContent />
    </Suspense>
  );
}
