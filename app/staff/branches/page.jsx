"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import PageHeader from "@/src/bpa/components/ui/PageHeader";

export default function StaffBranchSelectorPage() {
  const router = useRouter();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchBranches() {
      try {
        setLoading(true);
        const response = await apiGet("/api/v1/auth/staff/context");
        if (response.success && response.data?.branches) {
          setBranches(response.data.branches);
          
          // If only one branch, redirect directly
          if (response.data.branches.length === 1) {
            router.replace(`/staff/branch/${response.data.branches[0].id}`);
            return;
          }
        } else {
          setError("No branches found. Please contact your administrator.");
        }
      } catch (err) {
        setError(err?.message || "Failed to load branches");
      } finally {
        setLoading(false);
      }
    }
    fetchBranches();
  }, [router]);

  const handleSelectBranch = async (branchId) => {
    // Check access status first
    const branch = branches.find((b) => b.id === branchId);
    
    if (!branch) return;

    // Check access status
    if (branch.accessStatus) {
      if (branch.accessStatus === "PENDING") {
        // Redirect to waiting page
        router.push(`/staff/branch/${branchId}/waiting`);
        return;
      }
      
      if (branch.accessStatus === "REVOKED" || branch.accessStatus === "EXPIRED") {
        // Redirect to waiting page
        router.push(`/staff/branch/${branchId}/waiting`);
        return;
      }
      
      if (branch.accessStatus === "APPROVED") {
        // Check expiration
        if (branch.accessExpiresAt) {
          const expiresAt = new Date(branch.accessExpiresAt);
          if (expiresAt < new Date()) {
            router.push(`/staff/branch/${branchId}/waiting`);
            return;
          }
        }
      }
    } else {
      // No access status, check via API
      try {
        const accessCheck = await apiGet(`/api/v1/branch-access/check/${branchId}`);
        if (!accessCheck?.data?.hasAccess) {
          router.push(`/staff/branch/${branchId}/waiting`);
          return;
        }
      } catch (error) {
        // If check fails, try to go to waiting page
        router.push(`/staff/branch/${branchId}/waiting`);
        return;
      }
    }

    // Store selected branch in localStorage for future use
    if (typeof window !== "undefined") {
      localStorage.setItem("bpa_branch_id", String(branchId));
    }
    router.push(`/staff/branch/${branchId}`);
  };

  if (loading) {
    return (
      <div className="container py-40">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-16 text-secondary-light">Loading your branches...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-40">
        <Card>
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
          <div className="mt-20">
            <button
              className="btn btn-primary"
              onClick={() => router.push("/staff/login")}
            >
              Back to Login
            </button>
          </div>
        </Card>
      </div>
    );
  }

  if (branches.length === 0) {
    return (
      <div className="container py-40">
        <Card>
          <div className="text-center">
            <h5>No Branches Assigned</h5>
            <p className="text-secondary-light">
              You don't have access to any branches yet. Please contact your administrator.
            </p>
            <button
              className="btn btn-primary mt-20"
              onClick={() => router.push("/staff/login")}
            >
              Back to Login
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-40">
      <PageHeader
        title="Select Branch"
        subtitle="Choose which branch you want to work on"
      />

      <div className="row g-20">
        {branches.map((branch) => (
          <div key={branch.id} className="col-md-6 col-lg-4">
            <Card className="h-100 cursor-pointer" onClick={() => handleSelectBranch(branch.id)}>
              <div className="d-flex align-items-start justify-content-between mb-16">
                <div>
                  <h5 className="mb-8">{branch.name}</h5>
                  {branch.typeName && (
                    <span className="badge bg-primary-100 text-primary-600">
                      {branch.typeName}
                    </span>
                  )}
                </div>
                <i className="ri-arrow-right-line text-primary-600 fs-20"></i>
              </div>
              
              <div className="mb-12">
                <span className="text-secondary-light text-sm">Role: </span>
                <span className="fw-semibold">{branch.role}</span>
              </div>

              {/* Access Status Badge */}
              {branch.accessStatus && (
                <div className="mb-12">
                  {branch.accessStatus === "APPROVED" && (
                    <span className="badge bg-success-100 text-success-600 text-xs">
                      ✅ Access Approved
                    </span>
                  )}
                  {branch.accessStatus === "PENDING" && (
                    <span className="badge bg-warning-100 text-warning-600 text-xs">
                      ⏳ Approval Pending
                    </span>
                  )}
                  {branch.accessStatus === "REVOKED" && (
                    <span className="badge bg-danger-100 text-danger-600 text-xs">
                      ❌ Access Revoked
                    </span>
                  )}
                  {branch.accessStatus === "EXPIRED" && (
                    <span className="badge bg-danger-100 text-danger-600 text-xs">
                      ⚠️ Access Expired
                    </span>
                  )}
                </div>
              )}

              {branch.membershipType === "IMPLICIT" && (
                <div className="mb-12">
                  <span className="badge bg-success-100 text-success-600 text-xs">
                    Owner Access
                  </span>
                </div>
              )}

              <button
                className={`btn btn-sm w-100 mt-16 ${
                  branch.accessStatus === "APPROVED" || !branch.accessStatus
                    ? "btn-primary-600"
                    : "btn-outline-secondary"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectBranch(branch.id);
                }}
                disabled={branch.accessStatus === "REVOKED"}
              >
                {branch.accessStatus === "APPROVED" || !branch.accessStatus
                  ? "Enter Branch"
                  : branch.accessStatus === "PENDING"
                  ? "Waiting for Approval"
                  : branch.accessStatus === "EXPIRED"
                  ? "Access Expired"
                  : "Access Revoked"}
              </button>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
