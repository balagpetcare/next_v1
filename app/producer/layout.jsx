"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMe } from "@/src/lib/useMe";
import { producerMe } from "./_lib/producerApi";

/** Full-page loading shell to avoid flicker during session check */
function ProducerLoadingShell() {
  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="text-center">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
        <p className="text-secondary mb-0">Loading producer dashboard…</p>
      </div>
    </div>
  );
}

/** Shown when session is invalid before redirecting to login */
function SessionInvalidMessage({ onRedirect }) {
  useEffect(() => {
    const t = setTimeout(onRedirect, 1500);
    return () => clearTimeout(t);
  }, [onRedirect]);
  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="text-center" style={{ maxWidth: "400px" }}>
        <p className="text-danger mb-2">Session expired or you don’t have producer access.</p>
        <p className="text-secondary small mb-0">Redirecting to login…</p>
      </div>
    </div>
  );
}

export default function ProducerLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const { loading: meLoading } = useMe(pathname || "producer");
  const [checking, setChecking] = useState(false);
  const [allowed, setAllowed] = useState(null);

  const isAuthRoute =
    pathname?.startsWith("/producer/login") || pathname?.startsWith("/producer/register");
  const isLandingRoute = pathname === "/producer";
  const isInviteAcceptRoute = pathname?.startsWith("/producer/invites/accept");
  const isInviteRedirectRoute = pathname === "/producer/invite";

  const shouldGuard = useMemo(() => {
    if (!pathname) return false;
    if (isAuthRoute || isLandingRoute || isInviteAcceptRoute || isInviteRedirectRoute) return false;
    return true;
  }, [pathname, isAuthRoute, isLandingRoute, isInviteAcceptRoute, isInviteRedirectRoute]);

  useEffect(() => {
    if (!shouldGuard) return;
    if (meLoading) return;
    let cancelled = false;
    (async () => {
      try {
        setChecking(true);
        await producerMe();
        if (!cancelled) setAllowed(true);
      } catch {
        if (!cancelled) setAllowed(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shouldGuard, meLoading, router]);

  const handleRedirectToLogin = useMemo(
    () => () => router.replace("/producer/login"),
    [router]
  );

  if (isAuthRoute || isLandingRoute || isInviteAcceptRoute) return <>{children}</>;
  if (shouldGuard && allowed === null && (meLoading || checking)) {
    return <ProducerLoadingShell />;
  }
  if (shouldGuard && allowed === false) {
    return <SessionInvalidMessage onRedirect={handleRedirectToLogin} />;
  }
  if (shouldGuard && allowed !== true) return <ProducerLoadingShell />;
  return <>{children}</>;
}
