"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";

export default function ProducerLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const isAuthRoute =
    pathname?.startsWith("/producer/login") || pathname?.startsWith("/producer/register");
  const isLandingRoute = pathname === "/producer";

  useEffect(() => {
    if (!pathname || isAuthRoute || isLandingRoute) return;
    let cancelled = false;
    (async () => {
      try {
        await apiGet("/api/v1/producer/me");
      } catch {
        if (!cancelled) router.replace("/producer/login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router, isAuthRoute, isLandingRoute]);

  if (isAuthRoute || isLandingRoute) return <>{children}</>;
  return <>{children}</>;
}
