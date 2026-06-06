import { NextRequest, NextResponse } from "next/server";
import { isPublicPath, getAuthFromCookies } from "@/lib/authHelpers";

// Next.js 16+: `middleware.(ts|js)` is deprecated and renamed to `proxy.(ts|js)`.
// This proxy enforces "no dashboard access while logged out" without changing any ports/routes.
//
// Public paths: /auth/*, /login, /register, /post-auth-landing, /getting-started, etc.
// are never protected — checked first so guests can access landing and auth flows.
//
// Matcher includes both /clinic/* and /staff/* — auth is evaluated per request host (same-origin app).
// Cross-shell relative links between /clinic and /staff assume one deployment origin (see docs/CROSS_SHELL_NAVIGATION.md).

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

  // Staff inventory: nested stock-requests/new → flat stock-request-create (same nested-route stability as supply-request-create)
  const stockRequestNewMatch = pathname.match(/^\/staff\/branch\/([^/]+)\/inventory\/stock-requests\/new$/);
  if (stockRequestNewMatch) {
    const [, branchId] = stockRequestNewMatch;
    const url = req.nextUrl.clone();
    url.pathname = `/staff/branch/${branchId}/inventory/stock-request-create`;
    return NextResponse.redirect(url, 307);
  }

  // Nested .../stock-requests/:id → canonical stock-request-detail/:id (Turbopack 404 on nested dynamic segment)
  const stockRequestDetailNested = pathname.match(/^\/staff\/branch\/([^/]+)\/inventory\/stock-requests\/(\d+)$/);
  if (stockRequestDetailNested) {
    const [, branchId, requestId] = stockRequestDetailNested;
    const url = req.nextUrl.clone();
    url.pathname = `/staff/branch/${branchId}/inventory/stock-request-detail/${requestId}`;
    return NextResponse.redirect(url, 307);
  }

  // Legacy internal path from old beforeFiles rewrite target → canonical detail URL
  const stockRequestDetailPageLegacy = pathname.match(
    /^\/staff\/branch\/([^/]+)\/inventory\/stock-request-detail-page\/(\d+)$/
  );
  if (stockRequestDetailPageLegacy) {
    const [, branchId, requestId] = stockRequestDetailPageLegacy;
    const url = req.nextUrl.clone();
    url.pathname = `/staff/branch/${branchId}/inventory/stock-request-detail/${requestId}`;
    return NextResponse.redirect(url, 307);
  }

  // Legacy nested .../inventory/receive/dispatch/:id → canonical .../inventory/receive-dispatch/:id (Turbopack stability)
  const receiveDispatchNestedLegacy = pathname.match(
    /^\/staff\/branch\/([^/]+)\/inventory\/receive\/dispatch\/(\d+)$/
  );
  if (receiveDispatchNestedLegacy) {
    const [, branchId, dispatchId] = receiveDispatchNestedLegacy;
    const url = req.nextUrl.clone();
    url.pathname = `/staff/branch/${branchId}/inventory/receive-dispatch/${dispatchId}`;
    return NextResponse.redirect(url, 307);
  }

  // Bookmarked internal path → canonical receive-dispatch URL
  const receiveDispatchPageLegacy = pathname.match(
    /^\/staff\/branch\/([^/]+)\/inventory\/receive-dispatch-page\/(\d+)$/
  );
  if (receiveDispatchPageLegacy) {
    const [, branchId, dispatchId] = receiveDispatchPageLegacy;
    const url = req.nextUrl.clone();
    url.pathname = `/staff/branch/${branchId}/inventory/receive-dispatch/${dispatchId}`;
    return NextResponse.redirect(url, 307);
  }

  // Legacy/deep link: .../warehouse/receive-po/:numericId → canonical GRN detail URL. clone() keeps query string.
  const receivePoGrnDeepLink = pathname.match(/^\/staff\/branch\/([^/]+)\/warehouse\/receive-po\/(\d+)$/);
  if (receivePoGrnDeepLink) {
    const [, branchId, grnId] = receivePoGrnDeepLink;
    const url = req.nextUrl.clone();
    url.pathname = `/staff/branch/${branchId}/warehouse/vendor-receipts/${grnId}`;
    return NextResponse.redirect(url, 307);
  }

  // Internal filesystem URL (bookmark) → canonical .../warehouse/vendor-receipts/:grnId (beforeFiles serves detail-page)
  const vendorReceiptDetailPageLegacy = pathname.match(
    /^\/staff\/branch\/([^/]+)\/warehouse\/vendor-receipt-grn-detail-page\/(\d+)$/
  );
  if (vendorReceiptDetailPageLegacy) {
    const [, branchId, grnId] = vendorReceiptDetailPageLegacy;
    const url = req.nextUrl.clone();
    url.pathname = `/staff/branch/${branchId}/warehouse/vendor-receipts/${grnId}`;
    return NextResponse.redirect(url, 307);
  }

  // Staff pharmacy: nested requisitions/new → flat requisition-create (same nested-route stability as stock-request-create)
  const pharmacyRequisitionNewMatch = pathname.match(/^\/staff\/branch\/([^/]+)\/pharmacy\/requisitions\/new$/);
  if (pharmacyRequisitionNewMatch) {
    const [, branchId] = pharmacyRequisitionNewMatch;
    const url = req.nextUrl.clone();
    url.pathname = `/staff/branch/${branchId}/pharmacy/requisition-create`;
    return NextResponse.redirect(url, 307);
  }

  // Staff pharmacy: legacy flat requisition-detail → canonical nested .../requisitions/:id
  const pharmacyRequisitionDetailFlat = pathname.match(/^\/staff\/branch\/([^/]+)\/pharmacy\/requisition-detail\/(\d+)$/);
  if (pharmacyRequisitionDetailFlat) {
    const [, branchId, requisitionId] = pharmacyRequisitionDetailFlat;
    const url = req.nextUrl.clone();
    url.pathname = `/staff/branch/${branchId}/pharmacy/requisitions/${requisitionId}`;
    return NextResponse.redirect(url, 307);
  }

  // Staff clinic patients: legacy nested URLs → flat canonical (register, detail, edit). clone() keeps searchParams.
  const patientRegisterLegacy = pathname.match(/^\/staff\/branch\/([^/]+)\/clinic\/patients\/register$/);
  if (patientRegisterLegacy) {
    const [, branchId] = patientRegisterLegacy;
    const url = req.nextUrl.clone();
    url.pathname = `/staff/branch/${branchId}/clinic/patient-register`;
    return NextResponse.redirect(url, 307);
  }
  const patientEditLegacy = pathname.match(/^\/staff\/branch\/([^/]+)\/clinic\/patients\/(\d+)\/edit$/);
  if (patientEditLegacy) {
    const [, branchId, patientId] = patientEditLegacy;
    const url = req.nextUrl.clone();
    url.pathname = `/staff/branch/${branchId}/clinic/patient-edit/${patientId}`;
    return NextResponse.redirect(url, 307);
  }
  const patientDetailLegacy = pathname.match(/^\/staff\/branch\/([^/]+)\/clinic\/patients\/(\d+)$/);
  if (patientDetailLegacy) {
    const [, branchId, patientId] = patientDetailLegacy;
    const url = req.nextUrl.clone();
    url.pathname = `/staff/branch/${branchId}/clinic/patient-detail/${patientId}`;
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
  const isProducer = pathname.startsWith("/producer");
  const isDoctor = pathname.startsWith("/doctor");

  const needsAuth =
    isOwner ||
    isAdmin ||
    isStaff ||
    isCountry ||
    isShop ||
    isClinic ||
    isMother ||
    isProducer ||
    isDoctor;

  if (!needsAuth) return NextResponse.next();

  const hasAuth = getAuthFromCookies(req.cookies, req.headers.get("authorization"));
  if (process.env.NODE_ENV === "development" && (isStaff || isOwner)) {
    const authCookieNames = ["access_token", "token", "jwt"];
    const cookieStatus = Object.fromEntries(
      authCookieNames.map((name) => [name, req.cookies.get(name)?.value ? "present" : "missing"])
    );
    console.info("[proxy]", pathname.split("/").slice(0, 2).join("/"), "hasAuth:", hasAuth, "cookies:", cookieStatus);
  }
  if (hasAuth) {
    // Keep public barcode label URL stable while serving the flatter physical route.
    const staffBatchLabelPrint = pathname.match(
      /^\/staff\/branch\/([^/]+)\/inventory\/labels\/batch\/(\d+)\/print$/
    );
    if (staffBatchLabelPrint) {
      const [, bId, lotId] = staffBatchLabelPrint;
      const url = req.nextUrl.clone();
      url.pathname = `/staff/branch/${bId}/inventory/label-batch-print/${lotId}`;
      return NextResponse.rewrite(url);
    }

    // Harden GRN detail: public .../warehouse/vendor-receipts/:grnId must always hit the physical
    // vendor-receipt-grn-detail-page route (next.config beforeFiles rewrite can miss some dev/RSC paths).
    const vendorReceiptDetail = pathname.match(/^\/staff\/branch\/([^/]+)\/warehouse\/vendor-receipts\/(\d+)$/);
    if (vendorReceiptDetail) {
      const [, bId, gid] = vendorReceiptDetail;
      const url = req.nextUrl.clone();
      url.pathname = `/staff/branch/${bId}/warehouse/vendor-receipt-grn-detail-page/${gid}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

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
  if (isShop) {
    const url = new URL("/login", req.url);
    url.searchParams.set("app", "shop");
    return NextResponse.redirect(withNextParam(url, req));
  }
  if (isClinic) {
    const url = new URL("/login", req.url);
    url.searchParams.set("app", "clinic");
    return NextResponse.redirect(withNextParam(url, req));
  }
  if (isProducer) {
    const url = new URL("/login", req.url);
    url.searchParams.set("app", "producer");
    return NextResponse.redirect(withNextParam(url, req));
  }
  if (isDoctor) {
    const url = new URL("/login", req.url);
    url.searchParams.set("app", "doctor");
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
    "/producer/:path*",
    "/doctor/:path*",
  ],
};
