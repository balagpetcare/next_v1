"use client";

import { useCallback, useEffect, useState } from "react";
import { LocationValue, normalizeLocation, withLegacyLocationFields } from "@/src/lib/location/normalizeLocation";

type Options = {
  contextKey?: string;
  limit?: number;
};

function getStorageKey(contextKey?: string) {
  return `bpa_recent_locations_${contextKey || "default"}`;
}

export function useRecentLocations(options?: Options) {
  const limit = options?.limit ?? 10;
  const storageKey = getStorageKey(options?.contextKey);
  const [recentLocations, setRecentLocations] = useState<LocationValue[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const normalized = parsed
          .map((p) => normalizeLocation(p))
          .filter(Boolean)
          .map((p) => withLegacyLocationFields(p!));
        setRecentLocations(normalized as LocationValue[]);
      }
    } catch {
      // ignore parse errors
    }
  }, [storageKey]);

  const saveRecent = useCallback(
    (loc: LocationValue) => {
      if (typeof window === "undefined") return;
      const normalized = normalizeLocation(loc);
      if (!normalized) return;
      const enriched = withLegacyLocationFields(normalized, loc);
      const next = [enriched, ...recentLocations].filter(Boolean);
      const deduped: LocationValue[] = [];
      const seen = new Set<string>();
      for (const item of next) {
        const key = `${item.countryCode || "XX"}-${item.areaId || ""}-${item.lat || ""}-${item.lng || ""}-${item.state || ""}-${item.city || ""}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(item);
        if (deduped.length >= limit) break;
      }
      setRecentLocations(deduped);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(deduped));
      } catch {
        // ignore write errors
      }
    },
    [limit, recentLocations, storageKey]
  );

  const clearRecent = useCallback(() => {
    if (typeof window === "undefined") return;
    setRecentLocations([]);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey]);

  return { recentLocations, saveRecent, clearRecent };
}
