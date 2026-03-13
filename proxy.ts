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

  // Legacy: redirect /doctors/profile/<segment> (tab-like segment names) to branch-wide /doctors/<segment>
  const profileSegmentMatch = pathname.match(/^\/staff\/branch\/([^/]+)\/clinic\/doctors\/profile\/([^/]+)$/);
  if (profileSegmentMatch) {
    const [, branchId, segment] = profileSegmentMatch;
    const redirectSegments = [
      "schedule-board", "service-assignment", "availability", "performance",
      "credentials", "audit-logs", "approvals", "certifications", "licenses",
      "overview", "package-assignment",
    ];
    if (redirectSegments.includes(segment)) {
      const url = req.nextUrl.clone();
      url.pathname = `/staff/branch/${branchId}/clinic/doctors/${segment}`;
      return NextResponse.redirect(url, 307);
    }
  }

  // Redirect /doctors/:id (numeric only) to .../doctors/profile/:id. Do NOT redirect segment names (schedule-board, service-assignment, etc.).
  if (!pathname.includes("/clinic/doctors/profile/")) {
    const m = pathname.match(/^\/staff\/branch\/([^/]+)\/clinic\/doctors\/(\d+)$/);
    if (m) {
      const [, branchId, doctorId] = m;
      const url = req.nextUrl.clone();
      url.pathname = `/staff/branch/${branchId}/clinic/doctors/profile/${doctorId}`;
      return NextResponse.redirect(url, 307);
    }
  }

  // Redirect staff supply-request/create, supply-requests/new and supply-requests/create → supply-request-create (avoids Next.js 404 on nested routes)
  const supplyCreateMatch = pathname.match(/^\/staff\/branch\/([^/]+)\/clinic\/supply-request(s)?\/(new|create)$/);
  if (supplyCreateMatch) {
    const [, branchId] = supplyCreateMatch;
    const url = req.nextUrl.clone();
    url.pathname = `/staff/branch/${branchId}/clinic/supply-request-create`;
    return NextResponse.redirect(url, 307);
  }

  // Public paths: auth, static, Next internals — never require session
  if (isPublicPath(pathname)) return NextResponse.next();

  // Guard app areas
  const isOwner = pathname.startsWith("/owner");
  const isAdmin = pathname.startsWith("/admin");
  const isStaff = pathname.startsWith("/staff");
  const isCountry = pathname.startsWith("/country");
  const isShop = pathname.startsWith("/shop");
  const isClinic = pathname.startsWith("/clinic");
  const isMother = pathname.startsWith("/mother");

  const needsAuth = isOwner || isAdmin || isStaff || isCountry || isShop || isClinic || isMother;

  if (!needsAuth) return NextResponse.next();

  const hasAuth = getAuthFromCookies(req.cookies, req.headers.get("authorization"));
  if (process.env.NODE_ENV === "development" && (isStaff || isOwner)) {
    const authCookieNames = ["access_token", "token", "jwt"];
    const cookieStatus = Object.fromEntries(
      authCookieNames.map((name) => [name, req.cookies.get(name)?.value ? "present" : "missing"])
    );
    console.info("[proxy]", pathname.split("/").slice(0, 2).join("/"), "hasAuth:", hasAuth, "cookies:", cookieStatus);
  }
  if (hasAuth) return NextResponse.next();

  // Redirect to the correct login page (same-origin so cookie is set on this port)
  if (isOwner) {
    const url = new URL("/owner/login", req.url);
    return NextResponse.redirect(withNextParam(url, req));
  }
  if (isAdmin) {
    const url = new URL("/admin/login", req.url);
    return NextResponse.redirect(withNextParam(url, req));
  }
  if (isStaff) {
    const url = new URL("/staff/login", req.url);
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
    "/staff/:path*",
    "/owner/:path*",
    "/admin/:path*",
    "/country/:path*",
    "/shop/:path*",
    "/clinic/:path*",
    "/mother/:path*",
  ],
};
