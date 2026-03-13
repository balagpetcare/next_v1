"use client";

import Link from "next/link";
import type { EnrichedDoctor } from "./types";
import DoctorStatusBadgeGroup from "./DoctorStatusBadgeGroup";
import DoctorActionMenu from "./DoctorActionMenu";

type Props = {
  branchId: string;
  doctors: EnrichedDoctor[];
  loading?: boolean;
  selectedIds?: number[];
  onSelectAll?: (checked: boolean) => void;
  onSelectOne?: (memberId: number, checked: boolean) => void;
  canAssign?: boolean;
  /** When set, doctor name becomes clickable and opens context (e.g. Doctor360Drawer). */
  onDoctorClick?: (memberId: number) => void;
};

export default function DoctorTable({
  branchId,
  doctors,
  loading,
  selectedIds = [],
  onSelectAll,
  onSelectOne,
  canAssign = false,
  onDoctorClick,
}: Props) {
  if (loading) {
    return (
      <div className="card radius-12">
        <div className="card-body text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="text-muted mt-2 mb-0">Loading doctors...</p>
        </div>
      </div>
    );
  }

  if (!doctors.length) {
    return (
      <div className="card radius-12">
        <div className="card-body text-center py-5">
          <i className="ri-user-star-line fs-1 text-muted d-block mb-3" aria-hidden />
          <h6 className="mb-2">No doctors found</h6>
          <p className="text-muted small mb-0">Invite a doctor or assign an existing one to this branch.</p>
        </div>
      </div>
    );
  }

  const allSelected = doctors.length > 0 && selectedIds.length === doctors.length;

  return (
    <div className="card radius-12">
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-sm table-hover mb-0">
            <thead className="table-light">
              <tr>
                {(onSelectAll || onSelectOne) && (
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={allSelected}
                      onChange={(e) => onSelectAll?.(e.target.checked)}
                      aria-label="Select all"
                    />
                  </th>
                )}
                <th>Doctor</th>
                <th>Speciality</th>
                <th>Registration</th>
                <th>Assignment</th>
                <th>Today&apos;s shift</th>
                <th>Booking</th>
                <th>Consultation fee</th>
                <th>Services</th>
                <th>Packages</th>
                <th>Status</th>
                {canAssign && <th className="text-end">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {doctors.map((d) => (
                <tr key={d.memberId}>
                  {(onSelectAll || onSelectOne) && (
                    <td>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={selectedIds.includes(d.memberId)}
                        onChange={(e) => onSelectOne?.(d.memberId, e.target.checked)}
                        aria-label={`Select ${d.displayName}`}
                      />
                    </td>
                  )}
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      {d.avatar ? (
                        <img src={d.avatar} alt="" className="rounded-circle" style={{ width: 32, height: 32, objectFit: "cover" }} />
                      ) : (
                        <span className="rounded-circle bg-light d-inline-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                          <i className="ri-user-line text-muted" style={{ fontSize: "1rem" }} aria-hidden />
                        </span>
                      )}
                      <div>
                        {onDoctorClick ? (
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 text-start text-body text-decoration-none fw-semibold"
                            onClick={() => onDoctorClick(d.memberId)}
                          >
                            {d.displayName ?? "—"}
                          </button>
                        ) : (
                          <span className="fw-semibold">{d.displayName ?? "—"}</span>
                        )}
                        <span className="text-muted small ms-1">{d.doctorCode ?? ""}</span>
                      </div>
                    </div>
                  </td>
                  <td className="text-muted small">{d.speciality ?? "—"}</td>
                  <td>
                    <span className="badge bg-secondary-subtle text-secondary-emphasis radius-8">{d.registrationStatus}</span>
                  </td>
                  <td className="text-muted small">{d.assignmentType ?? "—"}</td>
                  <td className="text-muted small">{d.todaysShift ?? "—"}</td>
                  <td>
                    <span className={`badge radius-8 ${d.bookingStatus === "enabled" ? "bg-success-subtle text-success-emphasis" : "bg-secondary-subtle text-secondary-emphasis"}`}>
                      {d.bookingStatus === "enabled" ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td>{d.consultationFee != null ? `BDT ${d.consultationFee}` : "—"}</td>
                  <td>{d.servicesAssignedCount}</td>
                  <td>{d.packagesAssignedCount}</td>
                  <td>
                    <DoctorStatusBadgeGroup
                      status={d.status}
                      contractStatus={d.contractStatus}
                      bookingStatus={d.bookingStatus}
                      assignmentType={d.assignmentType}
                      registrationStatus={d.registrationStatus}
                    />
                  </td>
                  {canAssign && (
                    <td className="text-end">
                      <DoctorActionMenu branchId={branchId} doctor={{ memberId: d.memberId, displayName: d.displayName }} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
