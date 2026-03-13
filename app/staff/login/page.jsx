"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { sanitizeReturnTo } from "@/lib/authRedirect";

const STAFF_LOGIN_LOOP_KEY = "staffLogin_lastRedirectAt";
const STAFF_LOGIN_LOOP_MS = 6000;

/**
 * Staff login entry: redirect to shared login with app=staff so cookie is set on same origin
 * and POST goes to /api/v1/auth/staff/login.
 * - Never reuse a stale next/returnTo that points to another panel (owner); use /staff for staff.
 * - Loop guard: if we've redirected to /login too many times in a short window, show message instead of redirecting again.
 */
function StaffLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const didRedirect = useRef(false);
  const [showLoopMessage, setShowLoopMessage] = useState(false);

  useEffect(() => {
    if (didRedirect.current) return;
    const returnTo = searchParams.get("returnTo");
    const next = searchParams.get("next");
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const defaultReturnTo = `${origin}/staff`;

    // Only allow returnTo/next that stay within staff panel; never pass /owner or other panel (avoids cross-panel loop)
    let rawReturnTo = returnTo
      ? (returnTo.startsWith("http") ? returnTo : `${origin}${returnTo.startsWith("/") ? "" : "/"}${returnTo}`)
      : next
        ? (next.startsWith("/") ? `${origin}${next}` : `${origin}/${next}`)
        : defaultReturnTo;
    const isStaffPath = (url) => {
      try {
        const p = typeof url === "string" && url.startsWith("http") ? new URL(url).pathname : url;
        return typeof p === "string" && (p === "/staff" || p.startsWith("/staff/"));
      } catch {
        return false;
      }
    };
    const safeReturnTo = isStaffPath(rawReturnTo)
      ? sanitizeReturnTo(rawReturnTo, defaultReturnTo, origin)
      : defaultReturnTo;

    // Loop guard: if we already redirected to /login very recently, don't redirect again (show link instead)
    const now = Date.now();
    let skipRedirect = false;
    try {
      const raw = sessionStorage.getItem(STAFF_LOGIN_LOOP_KEY);
      if (raw) {
        const t = Number(raw);
        if (!Number.isNaN(t) && now - t < STAFF_LOGIN_LOOP_MS) skipRedirect = true;
        else sessionStorage.removeItem(STAFF_LOGIN_LOOP_KEY);
      }
    } catch (_) {}
    if (skipRedirect) {
      didRedirect.current = true;
      setShowLoopMessage(true);
      return;
    }
    try {
      sessionStorage.setItem(STAFF_LOGIN_LOOP_KEY, String(now));
    } catch (_) {}

    didRedirect.current = true;
    const params = new URLSearchParams();
    params.set("app", "staff");
    params.set("returnTo", safeReturnTo);
    if (process.env.NODE_ENV === "development") {
      console.info("[staff-login] redirect to shared login", { returnTo: safeReturnTo });
    }
    router.replace(`/login?${params.toString()}`);
  }, [router, searchParams]);

  if (showLoopMessage) {
    return (
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center p-4 text-secondary">
        <p className="mb-3">Too many redirects. Please sign in using the link below.</p>
        <Link href="/login?app=staff&returnTo=/staff" className="btn btn-primary">
          Sign in for Staff
        </Link>
      </div>
    );
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center text-secondary">
      Redirecting to sign in…
    </div>
  );
}

export default function StaffLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-vh-100 d-flex align-items-center justify-content-center text-secondary">
          Loading…
        </div>
      }
    >
      <StaffLoginContent />
    </Suspense>
  );
}
