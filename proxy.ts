import { NextRequest, NextResponse } from "next/server";
import { isPublicPath, getAuthFromCookies } from "@/lib/authHelpers";

// Next.js 16+: `middleware.(ts|js)` is deprecated and renamed to `proxy.(ts|js)`.
// This proxy enforces "no dashboard access while logged out" without changing any ports/routes.
//
// Public paths: /auth/*, /login, /register, /post-auth-landing, /getting-started, etc.
// are never protected — checked first so guests can access landing and auth flows.

function withNextParam(url: URL, req: NextRequest) {
  const next = req.nextUrl.pathname + req.nextUrl.search;
  url.searchParams.set("next", next);
  return url;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public paths: auth, static, Next internals — never require session
  if (isPublicPath(pathname)) return NextResponse.next();

  // Guard app areas
  const isOwner = pathname.startsWith("/owner");
  const isAdmin = pathname.startsWith("/admin");
  const isCountry = pathname.startsWith("/country");
  const isShop = pathname.startsWith("/shop");
  const isClinic = pathname.startsWith("/clinic");
  const isMother = pathname.startsWith("/mother");

  const needsAuth = isOwner || isAdmin || isCountry || isShop || isClinic || isMother;

  if (!needsAuth) return NextResponse.next();

  if (getAuthFromCookies(req.cookies, req.headers.get("authorization"))) return NextResponse.next();

  // Redirect to the correct login page
  if (isOwner) {
    const url = new URL("/owner/login", req.url);
    return NextResponse.redirect(withNextParam(url, req));
  }
  if (isAdmin) {
    const url = new URL("/admin/login", req.url);
    return NextResponse.redirect(withNextParam(url, req));
  }
  if (isCountry) {
    const url = new URL("/country/login", req.url);
    return NextResponse.redirect(withNextParam(url, req));
  }

  const url = new URL("/login", req.url);
  return NextResponse.redirect(withNextParam(url, req));
}

export const config = {
  matcher: [
    "/owner/:path*",
    "/admin/:path*",
    "/country/:path*",
    "/shop/:path*",
    "/clinic/:path*",
    "/mother/:path*",
  ],
};
