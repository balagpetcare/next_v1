"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import MasterLayout from "@/src/masterLayout/MasterLayout";
import { apiGet } from "@/lib/api";

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  // Client-side guard: 401 → login, 403 → forbidden (breaks redirect loop)
  useEffect(() => {
    if (pathname?.startsWith("/admin/login") || pathname?.startsWith("/admin/logout") || pathname === "/admin/forbidden") {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        // Use same-origin /api so cookie set by login is sent (Next.js rewrites to backend)
        const apiBase = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000");
        const res = await fetch(
          `${apiBase}/api/v1/admin/auth/me`,
          { method: "GET", credentials: "include", headers: { Accept: "application/json" } }
        );
        if (cancelled) return;
        if (res.status === 401) {
          const next = encodeURIComponent(pathname || "/admin");
          router.replace(`/admin/login?next=${next}`);
          return;
        }
        if (res.status === 403) {
          router.replace("/admin/forbidden");
          return;
        }
        if (!res.ok) {
          const next = encodeURIComponent(pathname || "/admin");
          router.replace(`/admin/login?next=${next}`);
        }
      } catch {
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
