"use client";

/**
 * BPA Admin (Owner Panel) API client helpers.
 *
 * Endpoints are configurable via .env.local, so you can map them to your
 * existing Node.js API without breaking Flutter endpoints.
 */

const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );

function pickEndpoint(envKey, fallbackPath) {
  const v = process.env[envKey];
  if (!v) return fallbackPath;
  return v.startsWith("http") ? v : v.startsWith("/") ? v : `/${v}`;
}

export const ENDPOINTS = {
  authMe: pickEndpoint("NEXT_PUBLIC_AUTH_ME_PATH", "/api/v1/auth/me"),
  authLogin: pickEndpoint("NEXT_PUBLIC_AUTH_LOGIN_PATH", "/api/v1/auth/login"),
  authLogout: pickEndpoint(
    "NEXT_PUBLIC_AUTH_LOGOUT_PATH",
    "/api/v1/auth/logout"
  ),

  ownerApplyCreate: pickEndpoint(
    "NEXT_PUBLIC_OWNER_APPLICATION_CREATE_PATH",
    "/api/v1/owner/applications"
  ),
  ownerApplyMe: pickEndpoint(
    "NEXT_PUBLIC_OWNER_APPLICATION_ME_PATH",
    "/api/v1/owner/applications/me"
  ),
};

export async function apiFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      data?.message || data?.error || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  // Common patterns: {success:true,data:{...}} or direct object
  return data?.data ?? data;
}

export async function apiPostJson(path, body) {
  return apiFetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body || {}),
  });
}
