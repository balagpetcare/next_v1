"use client";

import { useEffect, useMemo } from "react";
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

const LAST_ACTIVE_BRANCH_KEY = "lastActiveBranchId";

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

  // 401 → redirect to login (existing pattern)
  useEffect(() => {
    if (errorCode === "unauthorized") {
      router.replace("/staff/login");
    }
  }, [errorCode, router]);

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

  // 403: AccessDenied (shared component); clear lastActiveBranchId so selector won't auto-redirect here
  if (errorCode === "forbidden" || !hasViewPermission) {
    if (typeof window !== "undefined" && branchId) {
      try {
        const key = "lastActiveBranchId";
        if (localStorage.getItem(key) === String(branchId)) localStorage.removeItem(key);
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

  // 404: Not Found
  if (errorCode === "not_found" || (!branch && !isLoading)) {
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
      </div>
    </PermissionGate>
  );
}
