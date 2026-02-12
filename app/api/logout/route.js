import { NextResponse } from "next/server";

// Clears auth cookies for the Next.js origin.
// This is necessary for HttpOnly cookie auth when the backend cookie name/path
// differs or when the backend logout endpoint is unavailable.

function clearCookie(res, name) {
  // Setting an empty cookie with Max-Age=0 clears it in browsers.
  const isProd = process.env.NODE_ENV === "production";
  res.cookies.set({
    name,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 0,
  });
}

export async function POST() {
  const res = NextResponse.json({ success: true });

  // BPA common cookie names (keep in sync with backend)
  clearCookie(res, "access_token");
  clearCookie(res, "token");
  clearCookie(res, "jwt");
  clearCookie(res, "refresh_token");

  return res;
}

/**
 * Derive panel login path from Referer (e.g. /owner/dashboard -> /owner/login).
 * Falls back to /login when Referer is missing or unrecognized.
 */
function getLoginPathFromReferer(referer) {
  if (!referer || typeof referer !== "string") return "/login";
  try {
    const path = new URL(referer).pathname || "";
    if (path.startsWith("/owner")) return "/owner/login";
    if (path.startsWith("/admin")) return "/admin/login";
    if (path.startsWith("/partner")) return "/partner/login";
    if (path.startsWith("/country")) return "/country/login";
    if (path.startsWith("/staff")) return "/staff/login";
    if (path.startsWith("/shop")) return "/shop/login";
    if (path.startsWith("/clinic")) return "/clinic/login";
    if (path.startsWith("/producer")) return "/producer/login";
  } catch {
    /* ignore */
  }
  return "/login";
}

export async function GET(request) {
  const referer = request.headers.get("referer") || request.headers.get("Referer");
  const loginPath = getLoginPathFromReferer(referer);
  const loginUrl = new URL(loginPath, request.url);
  const res = NextResponse.redirect(loginUrl);

  clearCookie(res, "access_token");
  clearCookie(res, "token");
  clearCookie(res, "jwt");
  clearCookie(res, "refresh_token");

  return res;
}
