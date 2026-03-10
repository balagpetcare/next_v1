"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const API_BASE = "";

export default function DoctorLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const isAuthRoute =
    pathname?.startsWith("/doctor/login") ||
    pathname?.startsWith("/doctor/logout") ||
    pathname?.startsWith("/doctor/register");

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
            const next = pathname ? `/doctor/login?next=${encodeURIComponent(pathname)}` : "/doctor/login";
            router.replace(next);
          }
          return;
        }

        const j = await res.json().catch(() => null);
        const hasDoctorAccess =
          j?.panels?.doctor === true ||
          (j?.doctorVerificationStatus != null && j?.doctorVerificationStatus !== undefined) ||
          pathname?.startsWith("/doctor/verification");

        if (!cancelled && !hasDoctorAccess) {
          router.replace("/doctor/login");
          return;
        }

        if (!cancelled && hasDoctorAccess && j?.doctorVerificationStatus != null && j?.doctorVerificationStatus !== "VERIFIED") {
          if (!pathname?.startsWith("/doctor/verification") && !pathname?.startsWith("/doctor/login")) {
            router.replace("/doctor/verification");
            return;
          }
        }

        if (!cancelled && hasDoctorAccess && pathname?.startsWith("/doctor") && !pathname?.startsWith("/doctor/onboarding/") && !pathname?.startsWith("/doctor/login") && !pathname?.startsWith("/doctor/verification")) {
          const doctorRes = await fetch(`${API_BASE}/api/v1/doctor/me`, { method: "GET", credentials: "include", headers: { Accept: "application/json" } });
          if (doctorRes.ok) {
            const doctorJson = await doctorRes.json().catch(() => null);
            const branches = doctorJson?.data?.branches ?? [];
            const pendingBranch = branches.find((b) => b?.onboardingStatus === "PENDING");
            if (pendingBranch?.branchId && !cancelled) {
              router.replace(`/doctor/onboarding/${pendingBranch.branchId}`);
            }
          }
        }
      } catch {
        if (!cancelled) {
          const next = pathname ? `/doctor/login?next=${encodeURIComponent(pathname)}` : "/doctor/login";
          router.replace(next);
        }
      }
    }
    checkAuth();
    return () => { cancelled = true; };
  }, [pathname, router, isAuthRoute]);

  if (isAuthRoute) return <>{children}</>;

  return <>{children}</>;
}
