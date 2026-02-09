"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getAuthRedirectUrl, PANEL_CONFIG } from "@/lib/authRedirect";

export interface AuthRedirectPageProps {
  /** The panel name (owner, admin, shop, etc.) */
  panelName: string;
  /** The auth action - 'login' or 'register' */
  action: "login" | "register";
  /** Default landing path after successful auth (e.g., '/owner' or '/owner/dashboard') */
  defaultLandingPath?: string;
}

/**
 * AuthRedirectPage - A minimal page component that redirects to central auth
 * 
 * This component:
 * 1. Shows a "Redirecting..." message
 * 2. Computes the returnTo URL from query params or defaults
 * 3. Redirects to the central auth server
 * 4. Provides a fallback link if redirect is blocked
 * 
 * @example
 * ```tsx
 * // app/owner/login/page.tsx
 * import AuthRedirectPage from "@/src/bpa/components/AuthRedirectPage";
 * 
 * export default function OwnerLoginPage() {
 *   return <AuthRedirectPage panelName="owner" action="login" defaultLandingPath="/owner" />;
 * }
 * ```
 */
export function AuthRedirectPageContent({
  panelName,
  action,
  defaultLandingPath,
}: AuthRedirectPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [redirectBlocked, setRedirectBlocked] = useState(false);

  const config = PANEL_CONFIG[panelName];
  const panelLabel = config?.label || panelName.charAt(0).toUpperCase() + panelName.slice(1);
  const actionLabel = action === "login" ? "Sign In" : "Register";

  useEffect(() => {
    // Build the auth URL on the client side only
    const url = getAuthRedirectUrl(action, panelName, searchParams, defaultLandingPath);
    setAuthUrl(url);

    // Small delay to show the redirecting message
    const timer = setTimeout(() => {
      try {
        router.replace(url);
      } catch (e) {
        console.error("[AuthRedirectPage] Redirect failed:", e);
        setRedirectBlocked(true);
      }
    }, 100);

    // Set a timeout to show fallback link if redirect doesn't work
    const fallbackTimer = setTimeout(() => {
      setRedirectBlocked(true);
    }, 3000);

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
    };
  }, [action, panelName, searchParams, defaultLandingPath, router]);

  return (
    <section className="auth bg-base d-flex flex-wrap min-vh-100">
      {/* Left illustration - hidden on mobile */}
      <div className="auth-left d-lg-block d-none">
        <div className="d-flex align-items-center flex-column h-100 justify-content-center">
          <img src="/assets/images/auth/auth-img.png" alt="Auth" />
        </div>
      </div>

      {/* Right content */}
      <div className="auth-right py-32 px-24 d-flex flex-column justify-content-center">
        <div className="max-w-464-px mx-auto w-100">
          {/* Logo */}
          <div className="text-center mb-40">
            <Link href="/" className="d-inline-block">
              <img 
                src="/assets/images/logo.png" 
                alt="BPA" 
                style={{ maxWidth: "200px", height: "auto" }}
              />
            </Link>
          </div>

          {/* Redirecting message */}
          <div className="text-center">
            <div className="mb-24">
              <div 
                className="d-inline-flex align-items-center justify-content-center bg-primary-50 rounded-circle"
                style={{ width: "80px", height: "80px" }}
              >
                <i 
                  className="ri-loader-4-line text-primary-600" 
                  style={{ 
                    fontSize: "32px",
                    animation: "spin 1s linear infinite"
                  }} 
                />
              </div>
            </div>

            <h4 className="mb-12">Redirecting to {actionLabel}...</h4>
            <p className="mb-24 text-secondary-light">
              You are being redirected to the {panelLabel} {actionLabel.toLowerCase()} page.
            </p>

            {/* Spinner animation */}
            <style jsx global>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>

            {/* Show fallback link if redirect is blocked or slow */}
            {(redirectBlocked || authUrl) && (
              <div className="mt-32">
                <p className="text-secondary-light text-sm mb-16">
                  If you are not redirected automatically:
                </p>
                {authUrl && (
                  <a
                    href={authUrl}
                    className="btn btn-primary-600 text-sm px-24 py-12 radius-8"
                  >
                    <i className="ri-external-link-line me-8" />
                    Continue to {actionLabel}
                  </a>
                )}
              </div>
            )}

            {/* Back link */}
            <div className="mt-32">
              <Link 
                href={defaultLandingPath || `/${panelName}`} 
                className="text-secondary-light text-sm"
              >
                <i className="ri-arrow-left-line me-4" />
                Back to {panelLabel}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function AuthRedirectPage(props: AuthRedirectPageProps) {
  return (
    <Suspense fallback={
      <section className="auth bg-base d-flex min-vh-100 align-items-center justify-content-center">
        <div className="text-secondary">Loading…</div>
      </section>
    }>
      <AuthRedirectPageContent {...props} />
    </Suspense>
  );
}
