"use client";

import Link from "next/link";
import StatusBadge from "@/app/owner/_components/StatusBadge";

/**
 * Staff detail view component
 * Displays comprehensive staff information
 */
export default function StaffDetailView({ staff, config, onEdit }) {
  if (!staff) return null;

  const formatDate = (date) => {
    if (!date) return "—";
    try {
      return new Date(date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(date);
    }
  };

  const getName = () => {
    return (
      staff?.user?.profile?.displayName ||
      staff?.user?.profile?.username ||
      staff?.user?.auth?.email ||
      staff?.user?.auth?.phone ||
      `Staff #${staff.id}`
    );
  };

  const InfoRow = ({ label, value, col = "col-md-4" }) => (
    <div className={col}>
      <div className="text-secondary mb-1" style={{ fontSize: 12 }}>
        {label}
      </div>
      <div className="fw-semibold">{value || "—"}</div>
    </div>
  );

  return (
    <div className="d-flex flex-column gap-3">
      {/* Overview Section */}
      <div className="card radius-12">
        <div className="card-body p-24">
          <div className="d-flex justify-content-between align-items-start mb-16">
            <div>
              <h6 className="mb-0">Staff Information</h6>
              <div className="text-muted mt-6" style={{ fontSize: 12 }}>
                Staff member details
              </div>
            </div>
            <StatusBadge
              status={staff.status || staff.membershipStatus || "ACTIVE"}
            />
          </div>

          <div className="row g-3">
            <InfoRow label="Name" value={getName()} col="col-md-6" />
            <InfoRow
              label="Role"
              value={String(staff?.role || "—").toUpperCase()}
              col="col-md-3"
            />
            <InfoRow
              label="Status"
              value={
                <StatusBadge
                  status={staff.status || staff.membershipStatus || "ACTIVE"}
                />
              }
              col="col-md-3"
            />
            <InfoRow
              label="Email"
              value={staff?.user?.auth?.email || "—"}
              col="col-md-6"
            />
            <InfoRow
              label="Phone"
              value={staff?.user?.auth?.phone || "—"}
              col="col-md-6"
            />
            <InfoRow
              label="Branch"
              value={
                staff?.branch?.name ||
                (staff?.branchId ? `Branch #${staff.branchId}` : "—")
              }
              col="col-md-6"
            />
            {staff?.createdAt && (
              <InfoRow
                label="Created"
                value={formatDate(staff.createdAt)}
                col="col-md-6"
              />
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="d-flex gap-2">
        {onEdit && (
          <button
            className="btn btn-primary radius-12"
            onClick={onEdit}
          >
            <i className="ri-edit-line me-1" />
            Edit Staff
          </button>
        )}
        {config?.editPath && (
          <Link
            href={
              typeof config.editPath === "function"
                ? config.editPath(staff.id)
                : config.editPath.replace("[id]", staff.id)
            }
            className="btn btn-outline-primary radius-12"
          >
            <i className="ri-edit-line me-1" />
            Edit
          </Link>
        )}
        <Link
          href={config?.listPath || "/owner/staffs"}
          className="btn btn-outline-secondary radius-12"
        >
          <i className="ri-arrow-left-line me-1" />
          Back to List
        </Link>
      </div>
    </div>
  );
}
