"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import MasterLayout from "@/src/masterLayout/MasterLayout";
import NotificationContainer from "./_components/Notification";
import { getFallbackUrlForPanels } from "@/lib/authRedirect";

// Base API host (no trailing slash). Example: http://localhost:3000
const API_BASE = String(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

export default function OwnerLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  // IMPORTANT: Don't return early before hooks run; otherwise hook order can change
  // between renders and React will throw (Rules of Hooks).
  const isAuthRoute =
    pathname?.startsWith("/owner/login") ||
    pathname?.startsWith("/owner/logout") ||
    pathname?.startsWith("/owner/register") ||
    pathname?.startsWith("/owner/regester");

  const isKycRoute = pathname?.startsWith("/owner/kyc");
  const isBranchTeamRoute = /^\/owner\/branches\/[^\/]+\/team(\/|$)/.test(String(pathname || ""));
  const isBranchDashboardRoute = /^\/owner\/branches\/\d+(\/|$)/.test(String(pathname || ""));

  // Auth + owner access: redirect to login if not authenticated, or to fallback if not owner
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
          if (!cancelled) router.replace("/owner/login");
          return;
        }

        const j = await res.json().catch(() => null);
        const hasOwnerAccess = j?.panels?.owner === true;

        if (!cancelled && !hasOwnerAccess) {
          const fallback = getFallbackUrlForPanels(j?.panels);
          if (fallback && fallback !== window.location.origin + pathname) {
            window.location.href = fallback;
          } else {
            router.replace("/owner/login");
          }
        }
      } catch {
        if (!cancelled) router.replace("/owner/login");
      }
    }
    checkAuth();
    return () => {
      cancelled = true;
    };
  }, [pathname, router, isAuthRoute]);

  // Mandatory KYC gate:
  // - allow the KYC page itself
  // - for all other owner pages, redirect to /owner/kyc until status is SUBMITTED/VERIFIED
  useEffect(() => {
    let cancelled = false;
    async function checkKyc() {
      try {
        // Skip gate checks on auth routes and on the KYC page itself.
        if (!pathname || isAuthRoute || pathname.startsWith("/owner/kyc")) return;

        const res = await fetch(`${API_BASE}/api/v1/owner/kyc`, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        const j = await res.json().catch(() => null);
        const kyc = j?.success ? j.data : j;
        const status = String(kyc?.verificationStatus || "UNSUBMITTED").toUpperCase();
        const ok = status === "SUBMITTED" || status === "VERIFIED";

        if (!cancelled && !ok && !isAuthRoute && !isKycRoute && !isBranchTeamRoute && !isBranchDashboardRoute) {
          router.replace("/owner/kyc");
        }
      } catch {
        if (!cancelled) router.replace("/owner/kyc");
      }
    }
    checkKyc();
    return () => {
      cancelled = true;
    };
  }, [pathname, router, isAuthRoute, isKycRoute, isBranchTeamRoute, isBranchDashboardRoute]);

  if (isAuthRoute) return <>{children}</>;

  return (
    <>
      <NotificationContainer />
      <MasterLayout>{children}</MasterLayout>
    </>
  );
}
