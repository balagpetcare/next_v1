"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getAnalyticsConfig } from "../config";
import { trackPageByPath } from "../page-events";
import { trackPaymentFailure, trackPaymentSuccess } from "../events";

export default function AnalyticsPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;

    const ref = searchParams.get("ref") ?? undefined;
    const key = `${pathname}?ref=${ref ?? ""}`;
    if (key === lastKey.current) return;
    lastKey.current = key;

    const { appSurface } = getAnalyticsConfig();

    if (pathname === "/book/payment/success") {
      trackPaymentSuccess({ page_path: pathname, booking_ref: ref });
      return;
    }

    if (pathname === "/book/payment/failed") {
      trackPaymentFailure({ page_path: pathname, booking_ref: ref });
      return;
    }

    trackPageByPath(pathname, appSurface);
  }, [pathname, searchParams]);

  return null;
}
