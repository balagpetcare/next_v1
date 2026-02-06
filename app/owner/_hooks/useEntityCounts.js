"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ownerGet } from "@/app/owner/_lib/ownerApi";

/**
 * Hook to fetch entity counts for menu badges
 * Only fetches when on owner panel
 */
export function useEntityCounts() {
  const pathname = usePathname();
  const isOwner = pathname?.startsWith("/owner");
  
  const [counts, setCounts] = useState({
    organizations: 0,
    branches: 0,
    staffs: 0,
    requests: 0,
    productRequests: 0,
    transfers: 0,
    returns: 0,
    cancellations: 0,
    adjustments: 0,
    notifications: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch if on owner panel
    if (!isOwner) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const [orgsRes, branchesRes, staffsRes, requestsRes] = await Promise.allSettled([
          ownerGet("/api/v1/owner/organizations"),
          ownerGet("/api/v1/owner/branches"),
          ownerGet("/api/v1/owner/staffs"),
          ownerGet("/api/v1/owner/requests?summary=1"),
        ]);

        if (cancelled) return;

        const pickArray = (resp) => {
          if (!resp) return [];
          if (Array.isArray(resp)) return resp;
          if (Array.isArray(resp.data)) return resp.data;
          if (Array.isArray(resp.items)) return resp.items;
          return [];
        };

        const pendingCounts =
          requestsRes.status === "fulfilled"
            ? requestsRes.value?.meta?.pendingCounts ||
              requestsRes.value?.pendingCounts ||
              requestsRes.value?.data?.pendingCounts ||
              {}
            : {};

        const newCounts = {
          organizations:
            orgsRes.status === "fulfilled"
              ? pickArray(orgsRes.value).length
              : 0,
          branches:
            branchesRes.status === "fulfilled"
              ? pickArray(branchesRes.value).length
              : 0,
          staffs:
            staffsRes.status === "fulfilled"
              ? pickArray(staffsRes.value).length
              : 0,
          requests: pendingCounts.inbox || 0,
          productRequests: pendingCounts.productRequests || 0,
          transfers: pendingCounts.transfers || 0,
          returns: pendingCounts.returns || 0,
          cancellations: pendingCounts.cancellations || 0,
          adjustments: pendingCounts.adjustments || 0,
          notifications: pendingCounts.notifications || 0,
        };

        setCounts(newCounts);
      } catch {
        // Silently fail - badges are optional
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOwner]);

  return { counts, loading };
}
