"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/**
 * Owner Login Page - Shows login on same origin (no redirect to 3000)
 *
 * Redirects to this app's /login with same query params (next, returnTo)
 * so the user logs in here and is sent back to the intended page (e.g. /owner/branches).
 * Port 3000 is the API and has no login UI; using it caused redirect loops.
 */
function OwnerLoginRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const next = searchParams.get("next");
    const returnTo = searchParams.get("returnTo");
    const params = new URLSearchParams();
    if (returnTo) params.set("returnTo", returnTo);
    if (next) params.set("next", next);
    if (!returnTo && !next) params.set("next", "/owner");
    const q = params.toString();
    router.replace(q ? `/login?${q}` : "/login");
  }, [searchParams, router]);

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center text-secondary">
      Redirecting to sign in…
    </div>
  );
}

export default function OwnerLoginPage() {
  return (
    <Suspense fallback={<div className="min-vh-100 d-flex align-items-center justify-content-center text-secondary">Loading…</div>}>
      <OwnerLoginRedirect />
    </Suspense>
  );
}
