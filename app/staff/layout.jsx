"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import NotificationContainer from "@/app/owner/_components/Notification";
import { getFallbackUrlForPanels } from "@/lib/authRedirect";

// Base API host (no trailing slash). Example: http://localhost:3000
const API_BASE = String(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

export default function StaffLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  // Auth routes must be standalone (no sidebar/topbar)
  const isAuthRoute =
    pathname?.startsWith("/staff/login") ||
    pathname?.startsWith("/staff/logout");

  // Check authentication and staff access
  useEffect(() => {
    let cancelled = false;
    async function checkAuth() {
      try {
        // Skip auth checks on auth routes
        if (!pathname || isAuthRoute) return;

        const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          if (!cancelled) router.replace("/staff/login");
          return;
        }

        const j = await res.json().catch(() => null);

        // Staff access: panels.staff (branch members + owners), or admin
        const hasStaffAccess =
          j?.panels?.staff === true ||
          j?.panels?.owner === true ||
          j?.panels?.admin === true;

        if (!cancelled && !hasStaffAccess) {
          const fallback = getFallbackUrlForPanels(j?.panels);
          if (fallback && fallback !== window.location.origin + pathname) {
            window.location.href = fallback;
          } else {
            router.replace("/staff/login");
          }
        }
      } catch {
        if (!cancelled) router.replace("/staff/login");
      }
    }
    checkAuth();
    return () => {
      cancelled = true;
    };
  }, [pathname, router, isAuthRoute]);

  if (isAuthRoute) return <>{children}</>;

  return (
    <>
      <NotificationContainer />
      {children}
    </>
  );
}
