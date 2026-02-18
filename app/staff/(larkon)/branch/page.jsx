"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getMeBranchAccess } from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import PageHeader from "@/src/bpa/components/ui/PageHeader";

const POLL_INTERVAL_MS = 10000;
const LAST_ACTIVE_BRANCH_KEY = "lastActiveBranchId";

function StatusBadge({ status }) {
  const map = {
    APPROVED: { label: "Approved", className: "bg-success" },
    PENDING: { label: "Pending", className: "bg-warning text-dark" },
    REJECTED: { label: "Rejected", className: "bg-danger" },
    SUSPENDED: { label: "Suspended", className: "bg-secondary" },
    REVOKED: { label: "Revoked", className: "bg-danger" },
    EXPIRED: { label: "Expired", className: "bg-secondary" },
  };
  const { label, className } = map[status] ?? { label: status, className: "bg-secondary" };
  return <span className={`badge ${className}`}>{label}</span>;
}

export default function StaffBranchSelectorPage() {
  const router = useRouter();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pollRef = useRef(null);
  const mountedRef = useRef(true);

  const fetchBranchAccess = async () => {
    try {
      const { branches: list } = await getMeBranchAccess();
      if (!mountedRef.current) return list ?? [];
      setBranches(Array.isArray(list) ? list : []);
      setError("");
      return list ?? [];
    } catch (e) {
      if (mountedRef.current) {
        setError(e?.message ?? "Failed to load branch access");
        setBranches([]);
      }
      return [];
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      const list = await fetchBranchAccess();
      if (!mountedRef.current || !Array.isArray(list)) return;

      const approved = list.filter((b) => b.status === "APPROVED");
      if (approved.length >= 1) {
        const lastId = typeof window !== "undefined" ? localStorage.getItem(LAST_ACTIVE_BRANCH_KEY) : null;
        const lastIdNum = lastId ? Number(lastId) : NaN;
        const validLast = approved.some((b) => b.branchId === lastIdNum);
        if (validLast && lastIdNum) {
          router.replace(`/staff/branch/${lastIdNum}`);
          return;
        }
      }

      // Only poll when no approved branches and at least one request is PENDING (waiting for approval)
      const hasPending = list.some((b) => b.status === "PENDING");
      if (approved.length === 0 && hasPending) {
        pollRef.current = setInterval(async () => {
          const next = await fetchBranchAccess();
          if (!mountedRef.current || !Array.isArray(next)) return;
          const nextApproved = next.filter((b) => b.status === "APPROVED");
          if (nextApproved.length >= 1) {
            if (pollRef.current) clearInterval(pollRef.current);
            const targetId = nextApproved[0].branchId;
            if (typeof window !== "undefined") {
              localStorage.setItem(LAST_ACTIVE_BRANCH_KEY, String(targetId));
            }
            router.replace(`/staff/branch/${targetId}`);
          }
        }, POLL_INTERVAL_MS);
      }
    })();

    return () => {
      mountedRef.current = false;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [router]);

  if (loading) {
    return (
      <div className="container py-40">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-16 text-secondary-light">Loading branch access...</p>
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
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Retry
            </button>
            <button className="btn btn-outline-secondary ms-12" onClick={() => router.push("/staff/login")}>
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
        <PageHeader title="Select Branch" subtitle="You do not have access to any branch yet." />
        <Card>
          <div className="text-center py-40">
            <p className="text-secondary-light mb-24">
              Request access to a branch from your manager or administrator.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => router.push("/staff/branch")}
              aria-label="Request access"
            >
              Request Access
            </button>
          </div>
        </Card>
      </div>
    );
  }

  const hasPending = branches.some((b) => b.status === "PENDING");
  const hasApproved = branches.some((b) => b.status === "APPROVED");

  return (
    <div className="container py-40">
      <PageHeader title="Select Branch" subtitle="Choose a branch to work in or wait for approval." />

      {hasPending && (
        <div className="alert alert-info mb-24 d-flex align-items-center">
          <i className="ri-information-line me-12 fs-20" aria-hidden />
          <div>
            <strong>Approval Pending</strong> — The system checks for approval every 10 seconds. You will be
            redirected automatically when access is granted.
          </div>
        </div>
      )}

      <div className="row g-20">
        {branches.map((branch) => (
          <div key={branch.branchId} className="col-md-6 col-lg-4">
            <Card className="h-100">
              <div className="d-flex align-items-start justify-content-between mb-12">
                <h5 className="mb-0">{branch.branchName}</h5>
                <StatusBadge status={branch.status} />
              </div>
              <div className="mb-8">
                <span className="text-secondary-light text-sm">Type: </span>
                <span className="fw-semibold">{branch.branchType}</span>
              </div>
              <div className="mb-8">
                <span className="text-secondary-light text-sm">Role: </span>
                <span className="fw-semibold">{branch.role}</span>
              </div>
              {branch.status === "PENDING" && (
                <div className="mt-12 pt-12 border-top">
                  <p className="text-secondary-light text-sm mb-0">
                    <i className="ri-time-line me-4" />
                    Approval Pending. System checks every 10 seconds.
                  </p>
                </div>
              )}
              {branch.status === "REJECTED" && (
                <div className="mt-12 pt-12 border-top">
                  <p className="text-secondary-light text-sm mb-0">
                    <i className="ri-close-circle-line me-4" />
                    Request was rejected. You cannot open this branch. Contact your manager if you need access.
                  </p>
                </div>
              )}
              {branch.status === "SUSPENDED" && (
                <div className="mt-12 pt-12 border-top">
                  <p className="text-secondary-light text-sm mb-0">
                    <i className="ri-lock-line me-4" />
                    Access suspended. Contact your manager to restore access.
                  </p>
                </div>
              )}
              {branch.status === "APPROVED" && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm mt-16 w-100"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      localStorage.setItem(LAST_ACTIVE_BRANCH_KEY, String(branch.branchId));
                    }
                    router.push(`/staff/branch/${branch.branchId}`);
                  }}
                >
                  Enter branch
                </button>
              )}
            </Card>
          </div>
        ))}
      </div>

      {hasPending && !hasApproved && (
        <p className="text-center text-secondary-light text-sm mt-24">
          <i className="ri-refresh-line me-4" />
          Page refreshes automatically every 10 seconds while waiting for approval.
        </p>
      )}
    </div>
  );
}
