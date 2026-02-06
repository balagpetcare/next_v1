import { NextRequest, NextResponse } from "next/server";

// Next.js 16+: `middleware.(ts|js)` is deprecated and renamed to `proxy.(ts|js)`.
// This proxy enforces "no dashboard access while logged out" without changing any ports/routes.
//
// Auth signal:
// - We treat these cookies as auth tokens (matches BPA API middleware expectations): access_token | token | jwt
// - We also allow an Authorization: Bearer header (useful for some dev tools)

function hasAuth(req: NextRequest): boolean {
  const c = req.cookies;
  return Boolean(
    c.get("access_token")?.value ||
      c.get("token")?.value ||
      c.get("jwt")?.value ||
      req.headers.get("authorization")?.toLowerCase().startsWith("bearer ")
  );
}

function withNextParam(url: URL, req: NextRequest) {
  // Preserve full path + query
  const next = req.nextUrl.pathname + req.nextUrl.search;
  url.searchParams.set("next", next);
  return url;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow Next internals + static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/sitemap") ||
    pathname.startsWith("/images")
  ) {
    return NextResponse.next();
  }

  // Public routes (must stay accessible)
  const PUBLIC_PATHS = new Set([
    "/",
    "/login",
    "/register",
    "/invite/accept",
    "/health",
    "/debug",

    "/owner/login",
    "/owner/logout",

    "/admin/login",
    "/admin/logout",

    "/country/login",
  ]);

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  // Guard app areas
  const isOwner = pathname.startsWith("/owner");
  const isAdmin = pathname.startsWith("/admin");
  const isCountry = pathname.startsWith("/country");
  const isShop = pathname.startsWith("/shop");
  const isClinic = pathname.startsWith("/clinic");
  const isMother = pathname.startsWith("/mother");

  const needsAuth = isOwner || isAdmin || isCountry || isShop || isClinic || isMother;

  if (!needsAuth) return NextResponse.next();

  if (hasAuth(req)) return NextResponse.next();

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
