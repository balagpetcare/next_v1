"use client";

import { useCallback, useEffect, useState } from "react";
import type { LocationValue } from "@/src/lib/location/normalizeLocation";

const MAX_RECENT_COUNTRIES = 8;
const STORAGE_KEY_COUNTRIES = "loc_recent_countries";
const STORAGE_KEY_ADDRESS = "loc_last_address_preview";

export type LastAddressPreview = {
  formattedAddress: string;
  lat: number;
  lng: number;
  countryCode?: string;
};

type Options = {
  contextKey?: string;
  maxRecentCountries?: number;
};

function getStorageKeyCountries(contextKey?: string): string {
  return contextKey ? `${STORAGE_KEY_COUNTRIES}_${contextKey}` : STORAGE_KEY_COUNTRIES;
}

function getStorageKeyAddress(contextKey?: string): string {
  return contextKey ? `${STORAGE_KEY_ADDRESS}_${contextKey}` : STORAGE_KEY_ADDRESS;
}

/** Assert value is a non-empty string of 2–3 uppercase letters (country code). Prevents mixed types. */
export function assertCountryCode(code: unknown): code is string {
  if (typeof code !== "string" || code.length < 2 || code.length > 3) return false;
  return /^[A-Z]{2,3}$/i.test(code);
}

/** Assert value is a valid LastAddressPreview. Prevents mixed types. */
export function assertLastAddressPreview(v: unknown): v is LastAddressPreview {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.formattedAddress === "string" &&
    o.formattedAddress.length > 0 &&
    typeof o.lat === "number" &&
    Number.isFinite(o.lat) &&
    typeof o.lng === "number" &&
    Number.isFinite(o.lng)
  );
}

function loadRecentCountries(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const result: string[] = [];
    const seen = new Set<string>();
    for (const item of parsed) {
      const code = typeof item === "string" ? item : item?.countryCode ?? item?.code;
      const normalized = typeof code === "string" ? code.toUpperCase().trim() : "";
      if (!normalized || !assertCountryCode(normalized) || seen.has(normalized)) continue;
      seen.add(normalized);
      result.push(normalized);
      if (result.length >= MAX_RECENT_COUNTRIES) break;
    }
    return result;
  } catch {
    return [];
  }
}

function loadLastAddressPreview(key: string): LastAddressPreview | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!assertLastAddressPreview(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function useRecentLocations(options?: Options) {
  const maxCountries = options?.maxRecentCountries ?? MAX_RECENT_COUNTRIES;
  const keyCountries = getStorageKeyCountries(options?.contextKey);
  const keyAddress = getStorageKeyAddress(options?.contextKey);

  const [recentCountries, setRecentCountries] = useState<string[]>([]);
  const [lastAddressPreview, setLastAddressPreview] = useState<LastAddressPreview | null>(null);

  useEffect(() => {
    setRecentCountries(loadRecentCountries(keyCountries));
    setLastAddressPreview(loadLastAddressPreview(keyAddress));
  }, [keyCountries, keyAddress]);

  const saveRecent = useCallback(
    (loc: LocationValue) => {
      if (typeof window === "undefined") return;
      const cc = loc.countryCode?.toUpperCase().trim();
      if (cc && assertCountryCode(cc)) {
        const prev = loadRecentCountries(keyCountries);
        const next = [cc, ...prev.filter((c) => c !== cc)].slice(0, maxCountries);
        setRecentCountries(next);
        try {
          window.localStorage.setItem(keyCountries, JSON.stringify(next));
        } catch {
          /* ignore */
        }
      }
      if (
        loc.formattedAddress &&
        typeof loc.lat === "number" &&
        Number.isFinite(loc.lat) &&
        typeof loc.lng === "number" &&
        Number.isFinite(loc.lng)
      ) {
        const preview: LastAddressPreview = {
          formattedAddress: String(loc.formattedAddress).trim(),
          lat: loc.lat,
          lng: loc.lng,
          countryCode: cc || undefined,
        };
        setLastAddressPreview(preview);
        try {
          window.localStorage.setItem(keyAddress, JSON.stringify(preview));
        } catch {
          /* ignore */
        }
      }
    },
    [keyCountries, keyAddress, maxCountries]
  );

  const clearRecent = useCallback(() => {
    if (typeof window === "undefined") return;
    setRecentCountries([]);
    setLastAddressPreview(null);
    try {
      window.localStorage.removeItem(keyCountries);
      window.localStorage.removeItem(keyAddress);
    } catch {
      /* ignore */
    }
  }, [keyCountries, keyAddress]);

  const hasAny =
    recentCountries.length > 0 || (lastAddressPreview !== null && lastAddressPreview.formattedAddress.length > 0);

  return {
    recentCountries,
    lastAddressPreview,
    saveRecent,
    clearRecent,
    hasAny,
  };
}
