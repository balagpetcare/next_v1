"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import MasterLayout from "@/src/masterLayout/MasterLayout";
import { apiGet } from "@/lib/api";

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  // ✅ Client-side guard: if cookie/token is missing or not whitelisted, redirect to login.
  // Note: All hooks must be called before any conditional returns
  useEffect(() => {
    // Skip auth check for login/logout routes
    if (pathname?.startsWith("/admin/login") || pathname?.startsWith("/admin/logout")) {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await apiGet("/api/v1/admin/auth/me");
      } catch (e) {
        if (cancelled) return;
        const next = encodeURIComponent(pathname || "/admin");
        router.replace(`/admin/login?next=${next}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  // Auth routes must be standalone (no sidebar/topbar)
  if (pathname?.startsWith("/admin/login") || pathname?.startsWith("/admin/logout")) {
    return <>{children}</>;
  }

  return <MasterLayout>{children}</MasterLayout>;
}
