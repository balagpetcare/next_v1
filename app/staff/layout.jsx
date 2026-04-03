"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import NotificationContainer from "@/app/owner/_components/Notification";
import { getFallbackUrlForPanels, getAuthMeBase } from "@/lib/authRedirect";

export default function StaffLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  // Auth routes must be standalone (no sidebar/topbar)
  const isAuthRoute =
    pathname?.startsWith("/staff/login") ||
    pathname?.startsWith("/staff/logout");

  // Check authentication and staff access (same-origin /api so cookie is sent after staff login)
  useEffect(() => {
    let cancelled = false;
    async function checkAuth() {
      try {
        // Skip auth checks on auth routes
        if (!pathname || isAuthRoute) return;

        const res = await fetch(`${getAuthMeBase()}/api/v1/auth/me`, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          if (process.env.NODE_ENV === "development") {
            console.info("[staff] auth/me failed", { status: res.status });
          }
          if (!cancelled) router.replace("/staff/login");
          return;
        }

        if (process.env.NODE_ENV === "development") {
          console.info("[staff] auth/me ok");
        }
        const j = await res.json().catch(() => null);

        // Staff access: panels.staff (branch members + owners), or admin
        const hasStaffAccess =
          j?.panels?.staff === true ||
          j?.panels?.owner === true ||
          j?.panels?.admin === true;

        if (!cancelled && !hasStaffAccess) {
          // Only use fallback if user truly has no staff access
          // This prevents redirecting to owner when user has dual roles
          const fallback = getFallbackUrlForPanels(j?.panels);
          if (fallback && fallback !== window.location.origin + pathname) {
            // Check if fallback would send us to a different panel
            // If we're on a staff path and fallback is owner, prefer staying in staff context
            const isStaffPath = pathname?.startsWith("/staff");
            const fallbackIsStaff = fallback.includes(":3100") || fallback.includes("/staff");
            const fallbackIsOwner = fallback.includes(":3104") || fallback.includes("/owner");
            
            if (isStaffPath && fallbackIsOwner && !fallbackIsStaff && j?.panels?.staff) {
              // User has staff panel but fallback would send to owner
              // Stay in staff context instead
              if (process.env.NODE_ENV === "development") {
                console.info("[staff] preserving staff context, not redirecting to owner");
              }
              // Do nothing - stay on current staff path
            } else {
              window.location.href = fallback;
            }
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
