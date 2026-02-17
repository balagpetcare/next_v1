"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";

export default function CountryLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const isAuthRoute = pathname?.startsWith("/country/login") || pathname?.startsWith("/country/invite");
  const [checked, setChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(true);

  useEffect(() => {
    if (!pathname || isAuthRoute) return;
    let cancelled = false;
    (async () => {
      try {
        const me = await apiGet("/api/v1/auth/me");
        if (cancelled) return;
        const panels = me?.panels || {};
        const countryRoles = Array.isArray(me?.countryRoles) ? me.countryRoles : [];
        const ok = Boolean(panels.country || countryRoles.length > 0);
        setHasAccess(ok);
        setChecked(true);
      } catch {
        if (!cancelled) router.replace("/country/login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router, isAuthRoute]);

  if (isAuthRoute) return <>{children}</>;

  if (!checked) {
    return (
      <div className="p-4">
        <div className="text-secondary">Loading…</div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="alert alert-danger m-3">
        <strong>Access Denied!</strong> You currently do not have permission to access the Country Panel.
        Please contact support for further assistance.
      </div>
    );
  }

  return <>{children}</>;
}
