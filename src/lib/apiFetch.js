/**
 * Small fetch wrapper that works in Server Components (async pages) and client components.
 * Always sends cookies (credentials: include).
 * Phase 5: Sends X-Country-Code (client: from countryContext; server: default BD).
 */
import { getCountryCode } from "@/lib/countryContext";

const API_BASE = String(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

export async function apiFetch(path, init = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      "X-Country-Code": getCountryCode(),
      ...(init.headers || {}),
    },
    // Prevent Next.js from caching auth-sensitive calls by default
    cache: init.cache ?? "no-store",
  });

  // Try JSON, fallback text
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg = json?.message || json?.error || res.statusText || "Request failed";
    const err = new Error(msg);
    err.status = res.status;
    err.data = json ?? text;
    throw err;
  }

  return json ?? text;
}
