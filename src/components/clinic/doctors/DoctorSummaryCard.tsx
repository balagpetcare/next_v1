"use client";

import Link from "next/link";
import { profile } from "@/src/lib/doctorOperationsRoutes";
import type { EnrichedDoctor } from "./types";
import DoctorStatusBadgeGroup from "./DoctorStatusBadgeGroup";
import DoctorActionMenu from "./DoctorActionMenu";

type Props = {
  branchId: string;
  doctor: EnrichedDoctor;
  canAssign?: boolean;
};

export default function DoctorSummaryCard({ branchId, doctor, canAssign = false }: Props) {
  return (
    <div className="card radius-12 h-100">
      <div className="card-body p-24">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className="d-flex align-items-center gap-2">
            {doctor.avatar ? (
              <img src={doctor.avatar} alt="" className="rounded-circle" style={{ width: 40, height: 40, objectFit: "cover" }} />
            ) : (
              <span className="rounded-circle bg-light d-inline-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                <i className="ri-user-line text-muted" aria-hidden />
              </span>
            )}
            <div>
              <h6 className="mb-1 fw-semibold">{doctor.displayName ?? "—"}</h6>
              <span className="text-muted small">{doctor.doctorCode ?? ""}</span>
            </div>
          </div>
          {canAssign && (
            <DoctorActionMenu branchId={branchId} doctor={{ memberId: doctor.memberId, displayName: doctor.displayName }} />
          )}
        </div>
        <p className="text-muted small mb-2">{doctor.speciality ?? "—"}</p>
        <DoctorStatusBadgeGroup
          status={doctor.status ?? undefined}
          contractStatus={doctor.contractStatus ?? undefined}
          bookingStatus={doctor.bookingStatus ?? undefined}
          assignmentType={doctor.assignmentType ?? undefined}
          registrationStatus={doctor.registrationStatus ?? undefined}
        />
        <div className="mt-3 pt-3 border-top border-light small">
          <div className="d-flex justify-content-between text-muted">
            <span>Today&apos;s shift</span>
            <span>{doctor.todaysShift ?? "—"}</span>
          </div>
          <div className="d-flex justify-content-between text-muted">
            <span>Services</span>
            <span>{doctor.servicesAssignedCount}</span>
          </div>
          <div className="d-flex justify-content-between text-muted">
            <span>Packages</span>
            <span>{doctor.packagesAssignedCount}</span>
          </div>
          <div className="d-flex justify-content-between">
            <span>Fee</span>
            <span>{doctor.consultationFee != null ? `BDT ${doctor.consultationFee}` : "—"}</span>
          </div>
        </div>
        <div className="mt-3">
          <Link
            href={profile(branchId, doctor.memberId)}
            className="btn btn-sm btn-outline-primary radius-8 w-100"
          >
            View profile
          </Link>
        </div>
      </div>
    </div>
  );
}
