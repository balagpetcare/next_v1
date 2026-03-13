"use client";

import DoctorReadinessChecklist from "../DoctorReadinessChecklist";
import DoctorStatusBadgeGroup from "../DoctorStatusBadgeGroup";
import type { DoctorProfileTabKey } from "../DoctorProfileTabs";

type ReadinessItem = { key: string; label: string; done: boolean };

type Props = {
  branchId: string;
  memberId: number;
  profile: any;
  credentials: any;
  schedule: { templates: any[] };
  readinessItems: ReadinessItem[];
  permissions: string[];
  onTabChange?: (tab: DoctorProfileTabKey) => void;
};

function hasPerm(permissions: string[], perm: string): boolean {
  return permissions.includes(perm);
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function OverviewTab({
  branchId,
  profile,
  credentials,
  schedule,
  readinessItems,
  permissions,
  onTabChange,
}: Props) {
  const credentialSummary = profile?.credentialCompletionSummary;
  const docsCount = credentialSummary?.documentsCount ?? credentials?.documents?.length ?? 0;
  const licensesCount = credentialSummary?.licensesCount ?? credentials?.licenses?.length ?? 0;
  const licensesValid = credentialSummary?.licensesValid ?? 0;
  const servicesCount = profile?.services?.length ?? 0;
  const packagesCount = profile?.packages?.length ?? 0;
  const scheduleCount = schedule?.templates?.length ?? 0;
  const nextSchedule =
    schedule?.templates?.length > 0
      ? (() => {
          const now = new Date();
          const today = now.getDay();
          const sorted = [...schedule.templates].sort((a: any, b: any) => {
            const da = a.dayOfWeek >= today ? a.dayOfWeek : a.dayOfWeek + 7;
            const db = b.dayOfWeek >= today ? b.dayOfWeek : b.dayOfWeek + 7;
            return da - db;
          });
          const next = sorted[0];
          return next ? `${DAY_NAMES[next.dayOfWeek] ?? next.dayOfWeek} ${next.startTime}–${next.endTime}` : null;
        })()
      : null;

  return (
    <>
      <div className="card radius-12 mb-3">
        <div className="card-body">
          <h6 className="mb-3">Status &amp; summary</h6>
          <div className="row g-2 mb-3">
            <div className="col-12 col-md-6">
              <span className="text-muted small">Status</span>
              <div className="mt-1">
                <DoctorStatusBadgeGroup
                  status={profile?.activeStatus}
                  contractStatus={profile?.contractStatus}
                  assignmentType={profile?.joiningType}
                  registrationStatus={profile?.verificationStatus}
                />
              </div>
            </div>
            <div className="col-12 col-md-6">
              <span className="text-muted small">Onboarding</span>
              <p className="mb-0 small">{profile?.onboardingStatus ?? "—"}</p>
              {profile?.invitationStatus && (
                <p className="mb-0 small text-muted">Invitation: {profile.invitationStatus}</p>
              )}
            </div>
          </div>
          <div className="row g-2">
            <div className="col-6 col-md-4">
              <div className="border rounded-3 p-2 text-center">
                <div className="fw-semibold">{servicesCount}</div>
                <div className="text-muted small">Services</div>
              </div>
            </div>
            <div className="col-6 col-md-4">
              <div className="border rounded-3 p-2 text-center">
                <div className="fw-semibold">{packagesCount}</div>
                <div className="text-muted small">Packages</div>
              </div>
            </div>
            <div className="col-6 col-md-4">
              <div className="border rounded-3 p-2 text-center">
                <div className="fw-semibold">{scheduleCount}</div>
                <div className="text-muted small">Schedule slots</div>
              </div>
            </div>
            <div className="col-6 col-md-4">
              <div className="border rounded-3 p-2 text-center">
                <div className="fw-semibold">{profile?.defaultConsultationFee != null ? "Yes" : "—"}</div>
                <div className="text-muted small">Fee set</div>
              </div>
            </div>
            <div className="col-6 col-md-4">
              <div className="border rounded-3 p-2 text-center">
                <div className="fw-semibold small">{licensesValid}/{licensesCount || "—"}</div>
                <div className="text-muted small">Licenses valid</div>
              </div>
            </div>
            <div className="col-6 col-md-4">
              <div className="border rounded-3 p-2 text-center">
                <div className="fw-semibold small">{nextSchedule ?? "—"}</div>
                <div className="text-muted small">Next schedule</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DoctorReadinessChecklist items={readinessItems} className="mb-3" />

      <div className="card radius-12 mb-3">
        <div className="card-body">
          <h6 className="mb-3">Branch assignment summary</h6>
          <p className="text-muted small mb-0">
            Role: {profile?.branchRole ?? "—"} | Joining: {profile?.joiningType ?? "—"} | Contract: {profile?.contractStatus ?? "—"}
          </p>
        </div>
      </div>

      {onTabChange && (
        <div className="card radius-12">
          <div className="card-body">
            <h6 className="mb-3">Quick actions</h6>
            <div className="d-flex flex-wrap gap-2">
              {hasPerm(permissions, "clinic.doctors.manage_services") && (
                <button type="button" className="btn btn-outline-primary btn-sm radius-8" onClick={() => onTabChange("services")}>
                  Assign services
                </button>
              )}
              {hasPerm(permissions, "clinic.schedule.manage") && (
                <button type="button" className="btn btn-outline-primary btn-sm radius-8" onClick={() => onTabChange("schedule")}>
                  Edit schedule
                </button>
              )}
              {hasPerm(permissions, "clinic.doctors.manage_leave") && (
                <button type="button" className="btn btn-outline-primary btn-sm radius-8" onClick={() => onTabChange("leave")}>
                  Add leave
                </button>
              )}
              {hasPerm(permissions, "clinic.doctors.propose_fee") && (
                <button type="button" className="btn btn-outline-primary btn-sm radius-8" onClick={() => onTabChange("fees")}>
                  Change fee
                </button>
              )}
              {hasPerm(permissions, "clinic.doctors.manage_credentials") && (
                <button type="button" className="btn btn-outline-secondary btn-sm radius-8" onClick={() => onTabChange("credentials")}>
                  View credentials
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
