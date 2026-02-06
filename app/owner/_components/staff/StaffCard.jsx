"use client";

import Link from "next/link";
import StatusBadge from "@/app/owner/_components/StatusBadge";

/**
 * Staff card component for card view display
 */
export default function StaffCard({ staff, config }) {
  const detailHref = config?.detailPath
    ? typeof config.detailPath === "function"
      ? config.detailPath(staff.id)
      : config.detailPath.replace("[id]", staff.id)
    : `/owner/staffs/${staff.id}`;

  const getName = () => {
    return (
      staff?.user?.profile?.displayName ||
      staff?.user?.profile?.username ||
      staff?.user?.auth?.email ||
      staff?.user?.auth?.phone ||
      `Staff #${staff.id}`
    );
  };

  const getEmail = () => {
    return staff?.user?.auth?.email || "—";
  };

  const getPhone = () => {
    return staff?.user?.auth?.phone || "—";
  };

  const getRole = () => {
    return String(staff?.role || "—").toUpperCase();
  };

  const getBranch = () => {
    return staff?.branch?.name || (staff?.branchId ? `Branch #${staff.branchId}` : "—");
  };

  return (
    <div className="card radius-12 h-100">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h6 className="mb-1">
              <Link
                href={detailHref}
                className="text-decoration-none text-dark"
              >
                {getName()}
              </Link>
            </h6>
            <small className="text-muted">ID: {staff.id}</small>
          </div>
          <StatusBadge status={staff.status || staff.membershipStatus || "ACTIVE"} />
        </div>

        <div className="mb-2">
          <small className="text-muted d-block">Role</small>
          <div className="text-dark fw-semibold">{getRole()}</div>
        </div>

        <div className="mb-2">
          <small className="text-muted d-block">Branch</small>
          <div className="text-dark">{getBranch()}</div>
        </div>

        {getEmail() !== "—" && (
          <div className="mb-2">
            <small className="text-muted d-block">Email</small>
            <div className="text-dark">{getEmail()}</div>
          </div>
        )}

        {getPhone() !== "—" && (
          <div className="mb-2">
            <small className="text-muted d-block">Phone</small>
            <div className="text-dark">{getPhone()}</div>
          </div>
        )}

        <div className="d-flex gap-2 mt-3 pt-3 border-top">
          <Link
            href={detailHref}
            className="btn btn-sm btn-outline-primary radius-12 flex-fill"
          >
            View
          </Link>
          {config?.editPath && (
            <Link
              href={
                typeof config.editPath === "function"
                  ? config.editPath(staff.id)
                  : config.editPath.replace("[id]", staff.id)
              }
              className="btn btn-sm btn-outline-secondary radius-12 flex-fill"
            >
              Edit
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
