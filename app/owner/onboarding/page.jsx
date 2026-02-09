"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_BASE = String(process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "") || "";

export default function OwnerOnboardingPage() {
  const router = useRouter();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orgName, setOrgName] = useState("My Organization");
  const [branchName, setBranchName] = useState("Main Branch");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/owner/onboarding/status`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) {
          if (res.status === 401 && !cancelled) router.replace("/owner/login");
          return;
        }
        const json = await res.json();
        if (!cancelled) setStatus(json?.data || null);
      } catch (e) {
        if (!cancelled) setError("Could not load onboarding status.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [router]);

  async function handleStart(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/owner/onboarding/start`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          organizationName: orgName.trim() || "My Organization",
          branchName: branchName.trim() || "Main Branch",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Failed to create organization.");
        return;
      }
      router.replace("/owner/dashboard");
    } catch (e) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (status && !status.needsOnboarding) {
    router.replace("/owner/dashboard");
    return null;
  }

  return (
    <div className="auth-bg-gradient min-vh-100 d-flex align-items-center py-5">
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="card border-0 shadow-sm radius-12">
          <div className="card-body p-24">
            <h2 className="fw-bold text-primary-600 mb-8">Get started</h2>
            <p className="text-secondary mb-24">
              Create your organization and first branch to use the owner panel.
            </p>
            {error && (
              <div className="alert alert-danger border-0 radius-8 mb-16" role="alert">
                {error}
              </div>
            )}
            <form onSubmit={handleStart} className="row g-20">
              <div className="col-12">
                <label className="form-label fw-semibold">Organization name</label>
                <input
                  type="text"
                  className="form-control radius-8"
                  placeholder="My Organization"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>
              <div className="col-12">
                <label className="form-label fw-semibold">First branch name</label>
                <input
                  type="text"
                  className="form-control radius-8"
                  placeholder="Main Branch"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                />
              </div>
              <div className="col-12 mt-16">
                <button
                  type="submit"
                  className="btn btn-primary w-100 py-12 fw-bold radius-8"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-8" role="status" />
                      Creating...
                    </>
                  ) : (
                    "Create & go to dashboard"
                  )}
                </button>
              </div>
            </form>
            <p className="text-muted small mt-16 mb-0">
              <Link href="/owner/dashboard" className="text-primary-600">
                I already have an organization
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
