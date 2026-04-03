"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { normalizeKycStatus, shouldForceKycPage } from "../_lib/ownerKycGuard";

const API_BASE = String(process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "") || "";

function OwnerOnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const introMode = searchParams?.get("intro") === "1";

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orgName, setOrgName] = useState("My Organization");
  const [branchName, setBranchName] = useState("Main Branch");
  const [error, setError] = useState("");
  const [showOverview, setShowOverview] = useState(false);
  const [introChecked, setIntroChecked] = useState(false);

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

  // When intro=1, show overview first; once user clicks Continue, we check KYC and either go to KYC or show form
  useEffect(() => {
    if (!introMode || loading || introChecked) return;
    setShowOverview(true);
  }, [introMode, loading, introChecked]);

  async function handleContinueFromOverview() {
    setError("");
    try {
      const kycRes = await fetch(`${API_BASE}/api/v1/owner/kyc`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!kycRes.ok) {
        setIntroChecked(true);
        setShowOverview(false);
        return;
      }
      const kycJson = await kycRes.json().catch(() => ({}));
      const kyc = kycJson?.success ? kycJson.data : kycJson;
      const apiStatus = String(kyc?.verificationStatus || "UNSUBMITTED").toUpperCase();
      const normalized = normalizeKycStatus(apiStatus);

      if (shouldForceKycPage(normalized)) {
        if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
          console.log("[owner/onboarding] intro=1: KYC required -> /owner/kyc?reason=kyc_required");
        }
        router.replace("/owner/kyc?reason=kyc_required");
        return;
      }
      setIntroChecked(true);
      setShowOverview(false);
      router.replace("/owner/onboarding");
    } catch {
      setIntroChecked(true);
      setShowOverview(false);
    }
  }

  function handleSkipOverview() {
    setShowOverview(false);
    setIntroChecked(true);
    router.replace("/owner/onboarding");
  }

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
        <span className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (status && !status.needsOnboarding) {
    router.replace("/owner/dashboard");
    return null;
  }

  // Overview screen when ?intro=1 (from getting-started "Start Setup")
  if (introMode && showOverview) {
    return (
      <div className="auth-bg-gradient min-vh-100 d-flex align-items-center py-5">
        <div className="container" style={{ maxWidth: 560 }}>
          <div className="card border-0 shadow-sm radius-12">
            <div className="card-body p-24">
              <h2 className="fw-bold text-primary-600 mb-12">Onboarding Overview</h2>
              <p className="text-secondary mb-20">
                Here&apos;s what happens next to get your business on the platform.
              </p>
              <ol className="ps-20 mb-24 text-secondary">
                <li className="mb-12"><strong>KYC</strong> — Submit identity documents if not already verified.</li>
                <li className="mb-12"><strong>Create organization</strong> — Add your business name and first branch.</li>
                <li className="mb-12"><strong>Go to dashboard</strong> — Add products, staff, and start selling.</li>
              </ol>
              <p className="text-muted small mb-24">
                You can always return to <Link href="/getting-started" className="text-primary-600">requirements & steps</Link> to review what you&apos;ll need.
              </p>
              <div className="alert alert-info border-0 radius-8 mb-20" role="status">
                KYC is required before creating your organization.
              </div>
              <div className="d-flex flex-column gap-12">
                <button
                  type="button"
                  onClick={handleContinueFromOverview}
                  className="btn btn-primary w-100 py-12 fw-bold radius-8"
                >
                  Continue to Setup
                </button>
                <button
                  type="button"
                  onClick={handleSkipOverview}
                  className="btn btn-outline-secondary btn-sm"
                >
                  I&apos;ve done this before — skip to create org
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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

export default function OwnerOnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <span className="spinner-border text-primary" role="status" />
      </div>
    }>
      <OwnerOnboardingContent />
    </Suspense>
  );
}
