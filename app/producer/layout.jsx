"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import MasterLayout from "@/src/masterLayout/MasterLayout";
import { apiGet } from "@/lib/api";

export default function ProducerLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const isAuthRoute =
    pathname?.startsWith("/producer/login") || pathname?.startsWith("/producer/register");

  useEffect(() => {
    if (!pathname || isAuthRoute) return;
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
  }, [pathname, router, isAuthRoute]);

  if (isAuthRoute) return <>{children}</>;
  return <MasterLayout>{children}</MasterLayout>;
}
