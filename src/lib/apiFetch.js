/**
 * Small fetch wrapper that works in Server Components (async pages) and client components.
 * Always sends cookies (credentials: include).
 * Phase 5: Sends X-Country-Code (client: from countryContext; server: default BD).
 */
import { getCountryCode } from "@/lib/countryContext";

// In browser: always same-origin so Next.js proxies /api to backend (never cross-origin from client).
export function getApiBase() {
  if (typeof window !== "undefined") return "";
  return String(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

const API_BASE = getApiBase();

function getWorkspaceHeaders() {
  if (typeof window === "undefined") return {};
  const headers = {};
  const orgId = window.localStorage?.getItem("bpa_org_id");
  const branchId = window.localStorage?.getItem("bpa_branch_id");
  if (orgId != null && orgId !== "") headers["X-Org-Id"] = orgId;
  if (branchId != null && branchId !== "") headers["X-Branch-Id"] = branchId;
  return headers;
}

export async function apiFetch(path, init = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const workspaceHeaders = getWorkspaceHeaders();
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      "X-Country-Code": getCountryCode(),
      ...workspaceHeaders,
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
    if (process.env.NODE_ENV === "development" && typeof console !== "undefined") {
      console.warn("[apiFetch] non-2xx response:", res.status, path, { code: json?.code, message: json?.message, data: json });
    }
    const msg = json?.message || json?.error || res.statusText || "Request failed";
    const err = new Error(msg);
    err.status = res.status;
    err.data = json ?? text;
    throw err;
  }

  return json ?? text;
}
