"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import StaffBranchSidebar from "./StaffBranchSidebar";
import BranchHeader from "./BranchHeader";
import AccessDenied from "./AccessDenied";

/**
 * StaffBranchLayout — branch access gate + optional header.
 *
 * Default showSidebar=false: staff /staff/(larkon) routes use LarkonDashboardShell’s
 * VerticalNavigationBar (useStaffBranchMenuItems → same branch links). Rendering
 * StaffBranchSidebar here duplicated that menu. Pass showSidebar={true} only if
 * a route is NOT wrapped by the Larkon shell and needs the legacy in-page sidebar.
 */
export default function StaffBranchLayout({ 
  children, 
  branchId, 
  requiredPermission = "branch.view",
  showSidebar = false 
}) {
  const router = useRouter();
  const [sidebarActive, setSidebarActive] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  
  const { 
    branch, 
    myAccess, 
    isLoading, 
    errorCode, 
    hasViewPermission 
  } = useBranchContext(branchId);

  // Handle auth errors
  if (errorCode === "unauthorized") {
    router.replace("/staff/login");
    return (
      <div className="container py-40 text-center">
        <p className="text-secondary-light">Redirecting to login...</p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary">Loading...</p>
      </div>
    );
  }

  // Access denied
  if (errorCode === "forbidden" || !hasViewPermission) {
    return (
      <AccessDenied
        message="You don't have permission to view this branch."
        missingPerm={requiredPermission}
        onBack={() => router.push("/staff/branch")}
      />
    );
  }

  // Check specific permission if provided
  const permissions = myAccess?.permissions ?? [];
  if (requiredPermission && !permissions.includes(requiredPermission)) {
    return (
      <AccessDenied
        message={`You don't have the required permission: ${requiredPermission}`}
        missingPerm={requiredPermission}
        onBack={() => router.push(`/staff/branch/${branchId}`)}
      />
    );
  }

  if (!showSidebar) {
    // Simple layout without sidebar (like current pages)
    return (
      <div className="container py-24">
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        {children}
      </div>
    );
  }

  // Full layout with sidebar
  return (
    <>
      <StaffBranchSidebar
        branchId={branchId}
        sidebarActive={sidebarActive}
        mobileMenu={mobileMenu}
        onMobileClose={() => setMobileMenu(false)}
      />
      
      <main className={sidebarActive ? "dashboard-main active" : "dashboard-main"}>
        {/* Top bar with sidebar toggle */}
        <div className="navbar-header">
          <div className="row align-items-center justify-content-between">
            <div className="col-auto">
              <div className="d-flex flex-wrap align-items-center gap-4">
                <button
                  type="button"
                  className="sidebar-toggle"
                  onClick={() => setSidebarActive(!sidebarActive)}
                  title="Toggle sidebar"
                >
                  <i className="ri-menu-line" />
                </button>
                <button
                  type="button"
                  className="sidebar-mobile-toggle ms-2"
                  onClick={() => setMobileMenu(!mobileMenu)}
                  title="Mobile menu"
                >
                  <i className="ri-menu-line" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-main-body">
          <div className="container py-24">
            <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
            {children}
          </div>
        </div>
      </main>
    </>
  );
}