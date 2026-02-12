"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Legacy /auth/login route – redirects to the correct panel login.
 * Use /owner/login, /admin/login, etc. directly for panel-specific flows.
 * This page exists so /auth/login does not 404 when used by api/logout or legacy links.
 */
function AuthLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const app = searchParams.get("app");
    const returnTo = searchParams.get("returnTo");
    const next = searchParams.get("next");

    const panelLoginPaths: Record<string, string> = {
      owner: "/owner/login",
      admin: "/admin/login",
      partner: "/partner/login",
      country: "/country/login",
      staff: "/staff/login",
      shop: "/shop/login",
      clinic: "/clinic/login",
      producer: "/producer/login",
      mother: "/mother/login",
    };

    const targetPath = app && panelLoginPaths[app];
    const params = new URLSearchParams();
    if (returnTo) params.set("returnTo", returnTo);
    if (next) params.set("next", next);
    const q = params.toString();

    if (targetPath) {
      router.replace(q ? `${targetPath}?${q}` : targetPath);
    } else {
      router.replace(q ? `/login?${q}` : "/login");
    }
  }, [router, searchParams]);

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center text-secondary">
      Redirecting to sign in…
    </div>
  );
}

export default function AuthLoginPage() {
  return (
    <Suspense fallback={<div className="min-vh-100 d-flex align-items-center justify-content-center text-secondary">Loading…</div>}>
      <AuthLoginContent />
    </Suspense>
  );
}
