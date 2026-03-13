"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import BranchOverviewSkeleton from "@/src/components/branch/BranchOverviewSkeleton";
import PermissionGate from "@/src/components/branch/PermissionGate";
import AccessDenied from "@/src/components/branch/AccessDenied";
import BranchKpiRow from "@/src/components/branch/BranchKpiRow";
import BranchTodayBoard from "@/src/components/branch/BranchTodayBoard";
import BranchAlertsPanel from "@/src/components/branch/BranchAlertsPanel";
import BranchActivityTimeline from "@/src/components/branch/BranchActivityTimeline";
import { OperationalAlertStrip } from "@/src/components/dashboard";
import { LAST_ACTIVE_BRANCH_KEY } from "@/lib/logoutState";

const CLINIC_PERMISSIONS = [
  "clinic.overview.read",
  "clinic.appointments.read",
  "clinic.appointments.manage",
  "clinic.queue.manage",
  "clinic.patients.read",
  "clinic.patients.manage",
  "clinic.visits.read",
  "clinic.visits.manage",
];

function hasClinicAccess(permissions) {
  const perms = Array.isArray(permissions) ? permissions : [];
  return CLINIC_PERMISSIONS.some((p) => perms.includes(p));
}

export default function StaffBranchDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);

  const {
    branch,
    myAccess,
    kpis,
    todayBoard,
    alerts,
    activity,
    isLoading,
    error,
    errorCode,
    refetch,
    hasViewPermission,
  } = useBranchContext(branchId);

  // 401 → clear stale lastActiveBranchId so re-login doesn't auto-redirect here, then redirect to login
  useEffect(() => {
    if (errorCode === "unauthorized") {
      try {
        if (typeof window !== "undefined" && branchId && localStorage.getItem(LAST_ACTIVE_BRANCH_KEY) === String(branchId)) {
          localStorage.removeItem(LAST_ACTIVE_BRANCH_KEY);
        }
      } catch (_) {}
      router.replace("/staff/login");
    }
  }, [errorCode, router, branchId]);

  // On successful load, persist last active branch
  useEffect(() => {
    if (branch?.id && hasViewPermission && !isLoading && !errorCode) {
      try {
        localStorage.setItem(LAST_ACTIVE_BRANCH_KEY, String(branch.id));
      } catch (_) {}
    }
  }, [branch?.id, hasViewPermission, isLoading, errorCode]);

  // Loading: show skeleton
  if (isLoading) {
    return <BranchOverviewSkeleton />;
  }

  // 401: redirect handled above; show nothing or minimal while redirecting
  if (errorCode === "unauthorized") {
    return (
      <div className="container py-40 text-center">
        <p className="text-secondary-light">Redirecting to login...</p>
      </div>
    );
  }

  // 403: AccessDenied; clear lastActiveBranchId so selector won't auto-redirect here after re-login
  if (errorCode === "forbidden" || !hasViewPermission) {
    if (typeof window !== "undefined" && branchId) {
      try {
        if (localStorage.getItem(LAST_ACTIVE_BRANCH_KEY) === String(branchId)) localStorage.removeItem(LAST_ACTIVE_BRANCH_KEY);
      } catch (_) {}
    }
    return (
      <AccessDenied
        message="You don't have permission to view this branch. If your access was suspended, contact your manager."
        missingPerm={
          !(myAccess?.permissions ?? []).includes("branch.view")
            ? "branch.view"
            : !(myAccess?.permissions ?? []).includes("dashboard.view")
            ? "dashboard.view"
            : undefined
        }
        onBack={() => router.push("/staff/branch")}
      />
    );
  }

  // 404: Not Found — clear lastActiveBranchId so re-login doesn't auto-redirect to invalid branch
  if (errorCode === "not_found" || (!branch && !isLoading)) {
    if (typeof window !== "undefined" && branchId) {
      try {
        if (localStorage.getItem(LAST_ACTIVE_BRANCH_KEY) === String(branchId)) localStorage.removeItem(LAST_ACTIVE_BRANCH_KEY);
      } catch (_) {}
    }
    return (
      <div className="container py-40">
        <Card>
          <div className="text-center py-40">
            <h5 className="mb-12">Branch Not Found</h5>
            <p className="text-secondary-light mb-24">
              The branch doesn’t exist or you don’t have access to it.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => router.push("/staff/branch")}
            >
              Back to Branch Selector
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // Network or other error: ErrorState with retry
  if (errorCode === "network" || (error && !branch)) {
    return (
      <div className="container py-40">
        <Card>
          <div className="alert alert-danger mb-0" role="alert">
            {error}
          </div>
          <div className="card-body d-flex gap-12">
            <button type="button" className="btn btn-primary" onClick={() => refetch()}>
              Retry
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => router.push("/staff/branch")}>
              Back to Branch Selector
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // Success: route-level guard (branch.view AND dashboard.view) + content
  return (
    <PermissionGate
      requiredPerms={["branch.view", "dashboard.view"]}
      permissions={myAccess?.permissions ?? []}
      mode="deny-page"
      onBack={() => router.push("/staff/branch")}
    >
      <div className="container py-24">
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />

        <BranchKpiRow
          kpis={kpis}
          permissions={myAccess?.permissions ?? []}
          branch={branch}
          branchId={branchId}
        />

        <OperationalAlertStrip branchId={branchId} className="mb-3" />

        <div className="row g-20 mb-24">
          <div className="col-md-6">
            <BranchTodayBoard
              todayBoard={todayBoard}
              permissions={myAccess?.permissions ?? []}
              branch={branch}
              branchId={branchId}
            />
          </div>
          <div className="col-md-6">
            <BranchAlertsPanel
              alerts={alerts}
              permissions={myAccess?.permissions ?? []}
              branchId={branchId}
            />
          </div>
        </div>

        <BranchActivityTimeline
          activity={activity}
          permissions={myAccess?.permissions ?? []}
          currentUserId={null}
        />

        {(branch?.type ?? "").toUpperCase() === "CLINIC" &&
          branch?.clinicEnabled === true &&
          hasClinicAccess(myAccess?.permissions ?? []) && (
          <Card title="Clinic" className="mt-24">
            <div className="d-flex flex-wrap gap-2">
              <Link
                href={`/staff/branch/${branchId}/clinic/dashboard`}
                className="btn btn-outline-primary radius-12"
              >
                <i className="ri-dashboard-line me-1" />
                Dashboard
              </Link>
              <Link
                href={`/staff/branch/${branchId}/clinic/appointments`}
                className="btn btn-outline-primary radius-12"
              >
                <i className="ri-calendar-check-line me-1" />
                Appointments
              </Link>
              <Link
                href={`/staff/branch/${branchId}/clinic/queue`}
                className="btn btn-outline-primary radius-12"
              >
                <i className="ri-list-check-2 me-1" />
                Queue
              </Link>
              <Link
                href={`/staff/branch/${branchId}/clinic/patients`}
                className="btn btn-outline-primary radius-12"
              >
                <i className="ri-user-heart-line me-1" />
                Patients
              </Link>
              <Link
                href={`/staff/branch/${branchId}/clinic/visits`}
                className="btn btn-outline-primary radius-12"
              >
                <i className="ri-file-list-3-line me-1" />
                Visits
              </Link>
            </div>
          </Card>
        )}
      </div>
    </PermissionGate>
  );
}
