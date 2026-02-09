"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import MasterLayout from "@/src/masterLayout/MasterLayout";
import NotificationContainer from "./_components/Notification";
import {
  normalizeKycStatus,
  shouldForceKycPage,
  isApproved,
} from "./_lib/ownerKycGuard";

const API_BASE = "";

export default function OwnerLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const isAuthRoute =
    pathname?.startsWith("/owner/login") ||
    pathname?.startsWith("/owner/logout") ||
    pathname?.startsWith("/owner/register") ||
    pathname?.startsWith("/owner/regester");

  const isKycRoute = pathname?.startsWith("/owner/kyc");
  const isOnboardingRoute = pathname?.startsWith("/owner/onboarding");
  const isTeamDashboardRoute = pathname === "/owner/team";
  const isWorkspaceRoute = pathname === "/owner/workspace";

  // 1) Auth: redirect to login if not authenticated; if no owner access, send to KYC (never to mother)
  // Team members (defaultContext.type === 'TEAM'): skip onboarding redirect; KYC applies ONLY to OWNER.
  // Skip redirect to kyc when already on kyc (prevents loop with KYC page’s approved→dashboard redirect)
  useEffect(() => {
    let cancelled = false;
    async function checkAuth() {
      try {
        if (!pathname || isAuthRoute) return;

        const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          if (!cancelled) {
            const next = pathname ? `/owner/login?next=${encodeURIComponent(pathname)}` : "/owner/login";
            router.replace(next);
          }
          return;
        }

        const j = await res.json().catch(() => null);
        const hasOwnerAccess = j?.panels?.owner === true;
        const needsOnboarding = j?.onboarding?.needsOnboarding === true;
        const defaultContextType = j?.defaultContext?.type;

        if (!cancelled && !hasOwnerAccess && !isKycRoute) {
          router.replace("/owner/kyc");
          return;
        }
        if (defaultContextType === "TEAM") return;
        if (!cancelled && hasOwnerAccess && needsOnboarding && !isOnboardingRoute && !isTeamDashboardRoute && !isWorkspaceRoute) {
          router.replace("/owner/onboarding");
        }
      } catch {
        if (!cancelled) {
          const next = pathname ? `/owner/login?next=${encodeURIComponent(pathname)}` : "/owner/login";
          router.replace(next);
        }
      }
    }
    checkAuth();
    return () => { cancelled = true; };
  }, [pathname, router, isAuthRoute, isKycRoute, isOnboardingRoute, isTeamDashboardRoute, isWorkspaceRoute]);

  // 2) KYC guard: force /owner/kyc ONLY when defaultContext.type === 'OWNER' AND (NOT_SUBMITTED or REJECTED).
  // Team members (type === 'TEAM'): skip KYC entirely – never redirect to /owner/kyc.
  useEffect(() => {
    let cancelled = false;
    async function checkKyc() {
      try {
        if (!pathname || isAuthRoute || isKycRoute || isOnboardingRoute || isTeamDashboardRoute || isWorkspaceRoute) return;

        const meRes = await fetch(`${API_BASE}/api/v1/auth/me`, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (!meRes.ok) return;
        const meJ = await meRes.json().catch(() => null);
        if (meJ?.defaultContext?.type !== "OWNER") return;

        const res = await fetch(`${API_BASE}/api/v1/owner/kyc`, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          if (!cancelled && res.status === 401) {
            router.replace(pathname ? `/owner/login?next=${encodeURIComponent(pathname)}` : "/owner/login");
          }
          return;
        }

        const j = await res.json().catch(() => null);
        const kyc = j?.success ? j.data : j;
        const apiStatus = String(kyc?.verificationStatus || "UNSUBMITTED").toUpperCase();
        const normalized = normalizeKycStatus(apiStatus);

        if (cancelled) return;
        if (isApproved(normalized)) return;
        if (shouldForceKycPage(normalized)) {
          router.replace("/owner/kyc");
        }
      } catch {
        // do not redirect on network error
      }
    }
    checkKyc();
    return () => { cancelled = true; };
  }, [pathname, router, isAuthRoute, isKycRoute, isOnboardingRoute, isTeamDashboardRoute, isWorkspaceRoute]);

  if (isAuthRoute) return <>{children}</>;

  return (
    <>
      <NotificationContainer />
      <MasterLayout>{children}</MasterLayout>
    </>
  );
}
