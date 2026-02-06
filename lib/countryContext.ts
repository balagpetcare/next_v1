/**
 * Phase 5: Country context for API (X-Country-Code).
 * Resolve: subdomain (bd., in.) → localStorage → query → default BD.
 * Reference: docs/GLOBAL_READY_FULL_PLANNING.md
 */

const STORAGE_KEY = "bpa_country_code";
const STATE_STORAGE_KEY = "bpa_state_code";
const DEFAULT_COUNTRY = "BD";

function normalizeCode(v: string): string {
  const s = String(v || "").toUpperCase().trim().slice(0, 2);
  return s || DEFAULT_COUNTRY;
}

/**
 * Get country code from subdomain (e.g. bd.example.com → BD), then localStorage, then default.
 */
export function getCountryCode(): string {
  if (typeof window === "undefined") return DEFAULT_COUNTRY;
  try {
    const host = window.location?.hostname || "";
    const parts = host.split(".");
    if (parts.length >= 2) {
      const sub = parts[0].toLowerCase();
      if (["bd", "in", "us", "ae"].includes(sub)) return sub.toUpperCase();
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return normalizeCode(stored);
  } catch (_) {}
  return DEFAULT_COUNTRY;
}

/**
 * Set country code (persist to localStorage). Call after user picks country.
 */
export function setCountryCode(code: string): void {
  const c = normalizeCode(code);
  try {
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, c);
  } catch (_) {}
}

export function getStateCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STATE_STORAGE_KEY);
    if (stored) return String(stored).toUpperCase().trim();
  } catch (_) {}
  return null;
}

export function setStateCode(code: string): void {
  const c = String(code || "").toUpperCase().trim();
  try {
    if (typeof window !== "undefined") localStorage.setItem(STATE_STORAGE_KEY, c);
  } catch (_) {}
}

/**
 * Headers to attach to API requests (X-Country-Code).
 */
export function getApiHeaders(extra?: Record<string, string>): Record<string, string> {
  const stateCode = getStateCode();
  return {
    "X-Country-Code": getCountryCode(),
    ...(stateCode ? { "X-State-Code": stateCode } : {}),
    ...extra,
  };
}
