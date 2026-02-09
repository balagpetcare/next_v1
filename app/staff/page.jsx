"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import PageHeader from "@/src/bpa/components/ui/PageHeader";

const STATUS_CHIPS = [
  { value: "all", label: "All" },
  { value: "APPROVED", label: "Approved" },
  { value: "PENDING", label: "Pending" },
  { value: "REJECTED", label: "Rejected" },
  { value: "SUSPENDED", label: "Suspended" },
];

const POLL_INTERVAL_MS = 10000;

export default function StaffHomePage() {
  const router = useRouter();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lastActiveBranchId, setLastActiveBranchId] = useState(null);

  const fetchBranches = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiGet("/api/v1/auth/staff/context");
      if (response.success && response.data?.branches) {
        setBranches(response.data.branches);
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
  }, [router]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("bpa_branch_id") : null;
    if (saved) setLastActiveBranchId(Number(saved) || null);
  }, []);

  useEffect(() => {
    if (statusFilter !== "PENDING") return;
    const timer = setInterval(fetchBranches, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [statusFilter, fetchBranches]);

  const filteredBranches =
    statusFilter === "all"
      ? branches
      : branches.filter((b) => (b.accessStatus || "").toUpperCase() === statusFilter);

  const approvedBranch = branches.find(
    (b) => (b.accessStatus || "").toUpperCase() === "APPROVED" && b.id === lastActiveBranchId
  );

  const handleSelectBranch = async (branchId) => {
    const branch = branches.find((b) => b.id === branchId);
    if (!branch) return;

    if (branch.accessStatus === "PENDING") {
      router.push(`/staff/branch/${branchId}/waiting`);
      return;
    }
    if (["REVOKED", "EXPIRED", "SUSPENDED"].includes(branch.accessStatus || "")) {
      router.push(`/staff/branch/${branchId}/waiting`);
      return;
    }
    if (branch.accessStatus === "APPROVED" || !branch.accessStatus) {
      if (branch.accessExpiresAt && new Date(branch.accessExpiresAt) < new Date()) {
        router.push(`/staff/branch/${branchId}/waiting`);
        return;
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("bpa_branch_id", String(branchId));
      }
      router.push(`/staff/branch/${branchId}`);
    }
  };

  if (loading && branches.length === 0) {
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

  if (error && branches.length === 0) {
    return (
      <div className="container py-40">
        <Card>
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
          <div className="mt-20">
            <button className="btn btn-primary" onClick={() => router.push("/staff/login")}>
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
              You don&apos;t have access to any branches yet. Please contact your administrator.
            </p>
            <button className="btn btn-primary mt-20" onClick={() => router.push("/staff/login")}>
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

      {/* Status filter chips */}
      <div className="d-flex flex-wrap gap-2 mb-24">
        {STATUS_CHIPS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            className={`btn btn-sm radius-12 ${
              statusFilter === chip.value ? "btn-primary" : "btn-outline-secondary"
            }`}
            onClick={() => setStatusFilter(chip.value)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Continue shortcut */}
      {approvedBranch && (
        <Card className="mb-24 bg-primary-50 border-primary">
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <h6 className="mb-0">Continue where you left off</h6>
              <p className="mb-0 small text-secondary-light">{approvedBranch.name}</p>
            </div>
            <button
              type="button"
              className="btn btn-primary radius-12"
              onClick={() => handleSelectBranch(approvedBranch.id)}
            >
              Continue
            </button>
          </div>
        </Card>
      )}

      {/* Branch cards */}
      <div className="row g-20">
        {filteredBranches.map((branch) => (
          <div key={branch.id} className="col-md-6 col-lg-4">
            <Card className="h-100 cursor-pointer" onClick={() => handleSelectBranch(branch.id)}>
              <div className="d-flex align-items-start justify-content-between mb-16">
                <div>
                  <h5 className="mb-8">{branch.name}</h5>
                  {branch.typeName && (
                    <span className="badge bg-primary-100 text-primary-600">{branch.typeName}</span>
                  )}
                </div>
                <i className="ri-arrow-right-line text-primary-600 fs-20" />
              </div>

              <div className="mb-12">
                <span className="text-secondary-light text-sm">Role: </span>
                <span className="fw-semibold">{branch.role}</span>
              </div>

              {branch.accessStatus && (
                <div className="mb-12">
                  {branch.accessStatus === "APPROVED" && (
                    <span className="badge bg-success-100 text-success-600 text-xs">Approved</span>
                  )}
                  {branch.accessStatus === "PENDING" && (
                    <span className="badge bg-warning-100 text-warning-600 text-xs">Pending</span>
                  )}
                  {branch.accessStatus === "REVOKED" && (
                    <span className="badge bg-danger-100 text-danger-600 text-xs">Rejected</span>
                  )}
                  {branch.accessStatus === "EXPIRED" && (
                    <span className="badge bg-danger-100 text-danger-600 text-xs">Expired</span>
                  )}
                  {branch.accessStatus === "SUSPENDED" && (
                    <span className="badge bg-secondary text-xs">Suspended</span>
                  )}
                </div>
              )}

              {branch.membershipType === "IMPLICIT" && (
                <div className="mb-12">
                  <span className="badge bg-success-100 text-success-600 text-xs">Owner Access</span>
                </div>
              )}

              <button
                type="button"
                className={`btn btn-sm w-100 mt-16 radius-12 ${
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
                  ? "Enter branch"
                  : branch.accessStatus === "PENDING"
                  ? "View request"
                  : branch.accessStatus === "EXPIRED"
                  ? "Access expired"
                  : "Access revoked"}
              </button>
            </Card>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="mt-32 pt-24 border-top">
        <div className="d-flex flex-wrap gap-3">
          <Link href="/staff" className="btn btn-link btn-sm p-0">
            My profile
          </Link>
          <Link href="/staff" className="btn btn-link btn-sm p-0">
            Staff Home
          </Link>
        </div>
      </div>
    </div>
  );
}
