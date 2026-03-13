"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import DoctorStatusBadgeGroup from "./DoctorStatusBadgeGroup";
import { staffDoctorStatusUpdate } from "@/lib/api";
import { useToast } from "@/src/hooks/useToast";
import type { DoctorProfileTabKey } from "./index";

type Profile = {
  memberId: number;
  displayName: string;
  avatar?: string | null;
  doctorCode?: string;
  speciality?: string;
  registrationNo?: string;
  activeStatus?: string;
  joiningType?: string;
  branchRole?: string;
  defaultConsultationFee?: number | null;
  email?: string | null;
  phone?: string | null;
};

type Props = {
  branchId: string;
  profile: Profile | null;
  loading?: boolean;
  permissions?: string[];
  onTabChange?: (tab: DoctorProfileTabKey) => void;
  onProfileRefresh?: () => void;
};

function hasPerm(permissions: string[], perm: string): boolean {
  return permissions?.includes(perm) ?? false;
}

export default function DoctorProfileHeader({ branchId, profile, loading, permissions = [], onTabChange, onProfileRefresh }: Props) {
  const [statusSaving, setStatusSaving] = useState(false);
  const toast = useToast();

  const canManage = hasPerm(permissions, "clinic.doctors.manage");
  const canManageLeave = hasPerm(permissions, "clinic.doctors.manage_leave");
  const canSchedule = hasPerm(permissions, "clinic.schedule.manage");
  const canProposeFee = hasPerm(permissions, "clinic.doctors.propose_fee");
  const canManageServices = hasPerm(permissions, "clinic.doctors.manage_services");
  const status = profile?.activeStatus ?? "ACTIVE";

  const handleStatusChange = useCallback(
    async (newStatus: "ACTIVE" | "INACTIVE") => {
      if (!canManage || !profile?.memberId || statusSaving) return;
      setStatusSaving(true);
      try {
        await staffDoctorStatusUpdate(branchId, profile.memberId, { status: newStatus });
        toast.success(newStatus === "ACTIVE" ? "Doctor activated" : "Doctor suspended");
        onProfileRefresh?.();
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to update status");
      } finally {
        setStatusSaving(false);
      }
    },
    [branchId, canManage, profile?.memberId, statusSaving, onProfileRefresh, toast]
  );

  if (loading || !profile) {
    return (
      <div className="card radius-12">
        <div className="card-body text-center py-5">
          {loading ? (
            <>
              <div className="spinner-border text-primary" role="status" />
              <p className="text-muted mt-2 mb-0">Loading...</p>
            </>
          ) : (
            <>
              <p className="text-muted mb-0">Doctor not found.</p>
              <Link
                href={`/staff/branch/${branchId}/clinic/doctors`}
                className="btn btn-outline-primary btn-sm mt-3 radius-8"
              >
                Back to list
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card radius-12 sticky-top">
      <div className="card-body p-24">
        <div className="text-center mb-3">
          {profile.avatar ? (
            <img src={profile.avatar} alt="" className="rounded-circle mb-2" style={{ width: 64, height: 64, objectFit: "cover" }} />
          ) : (
            <div className="rounded-circle bg-light d-inline-flex align-items-center justify-content-center mb-2" style={{ width: 64, height: 64 }}>
              <i className="ri-user-line fs-2 text-muted" aria-hidden />
            </div>
          )}
          <h5 className="mb-1 fw-semibold">{profile.displayName}</h5>
          <span className="text-muted small">{profile.doctorCode ?? `#${profile.memberId}`}</span>
        </div>
        <p className="text-muted small text-center mb-2">{profile.speciality ?? "—"}</p>
        {(profile.email || profile.phone) && (
          <p className="text-muted small text-center mb-2">
            {profile.email ?? ""}{profile.email && profile.phone ? " · " : ""}{profile.phone ?? ""}
          </p>
        )}
        <DoctorStatusBadgeGroup
          status={profile.activeStatus}
          assignmentType={profile.joiningType}
          className="justify-content-center"
        />
        <div className="mt-3 pt-3 border-top border-light small">
          <div className="d-flex justify-content-between text-muted">
            <span>Registration</span>
            <span>{profile.registrationNo ?? "—"}</span>
          </div>
          <div className="d-flex justify-content-between text-muted">
            <span>Branch role</span>
            <span>{profile.branchRole ?? "—"}</span>
          </div>
          <div className="d-flex justify-content-between">
            <span>Consultation fee</span>
            <span>{profile.defaultConsultationFee != null ? `BDT ${profile.defaultConsultationFee}` : "—"}</span>
          </div>
        </div>

        {(onTabChange || canManage) && (
          <div className="mt-3 pt-3 border-top border-light d-grid gap-2">
            {onTabChange && (
              <>
                {canManageServices && (
                  <button type="button" className="btn btn-outline-primary btn-sm radius-8" onClick={() => onTabChange("services")}>
                    Assign services
                  </button>
                )}
                {canSchedule && (
                  <button type="button" className="btn btn-outline-primary btn-sm radius-8" onClick={() => onTabChange("schedule")}>
                    Edit schedule
                  </button>
                )}
                {canManageLeave && (
                  <button type="button" className="btn btn-outline-primary btn-sm radius-8" onClick={() => onTabChange("leave")}>
                    Add leave
                  </button>
                )}
                {canProposeFee && (
                  <button type="button" className="btn btn-outline-primary btn-sm radius-8" onClick={() => onTabChange("fees")}>
                    Change fee
                  </button>
                )}
                <button type="button" className="btn btn-outline-secondary btn-sm radius-8" onClick={() => onTabChange("credentials")}>
                  View credentials
                </button>
              </>
            )}
            {canManage && (
              <>
                {status === "INACTIVE" ? (
                  <button
                    type="button"
                    className="btn btn-success btn-sm radius-8"
                    disabled={statusSaving}
                    onClick={() => handleStatusChange("ACTIVE")}
                  >
                    {statusSaving ? "..." : "Activate doctor"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-outline-warning btn-sm radius-8"
                    disabled={statusSaving}
                    onClick={() => handleStatusChange("INACTIVE")}
                  >
                    {statusSaving ? "..." : "Suspend doctor"}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        <div className="mt-3 d-grid gap-2">
          <Link
            href={`/staff/branch/${branchId}/clinic/doctors`}
            className="btn btn-outline-secondary btn-sm radius-8"
          >
            ← Back to list
          </Link>
        </div>
      </div>
    </div>
  );
}
