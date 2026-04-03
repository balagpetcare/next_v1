/**
 * Proxy /api/v1/* -> backend API (e.g. http://localhost:3000/api/v1/*).
 * Used when Next.js rewrites do not apply (e.g. Next.js 16 regression).
 * Forwards cookies and common headers so owner/auth APIs work same-origin.
 * Set-Cookie from backend is applied via cookies() from next/headers (so the
 * browser receives it) and also on NextResponse as fallback.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Backend base URL for server-side proxy fetch only (not the browser origin).
 * - Prefer API_BASE_URL, then NEXT_PUBLIC_API_BASE_URL (many repos only define the latter).
 * - If env mistakenly points at a Next panel port (3100–3107), force canonical API :3000
 *   so we never proxy to another Next instance (stale routes / Route not found from wrong target).
 */
function resolveApiTarget() {
  let raw =
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:3000";
  raw = String(raw).replace(/\/+$/, "");
  if (!raw) raw = "http://localhost:3000";
  try {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
    const u = new URL(withScheme);
    const port = u.port ? parseInt(u.port, 10) : u.protocol === "https:" ? 443 : 80;
    if (
      (u.hostname === "localhost" || u.hostname === "127.0.0.1") &&
      port >= 3100 &&
      port <= 3107
    ) {
      return "http://localhost:3000";
    }
  } catch {
    /* keep raw */
  }
  return raw;
}

const API_TARGET = resolveApiTarget();

function getBackendUrl(pathSegments, search) {
  const path =
    Array.isArray(pathSegments) && pathSegments.length > 0 ? pathSegments.join("/") : "";
  const base = `${API_TARGET}/api/v1${path ? `/${path}` : ""}`;
  return search ? `${base}${search}` : base;
}

/** Path segments after /api/v1 — params.path can be empty in some Next/Turbopack cases; fall back to URL. */
async function resolvePathSegments(request, context) {
  const raw = context?.params;
  const params = raw && typeof raw.then === "function" ? await raw : raw ?? {};
  const fromParams = params.path;
  if (Array.isArray(fromParams) && fromParams.length > 0) {
    return fromParams;
  }
  try {
    const u = new URL(request.url);
    const prefix = "/api/v1/";
    if (u.pathname.startsWith(prefix)) {
      const rest = u.pathname.slice(prefix.length);
      return rest ? rest.split("/").filter(Boolean) : [];
    }
  } catch {
    /* ignore */
  }
  return [];
}

function forwardHeaders(request) {
  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  const authorization = request.headers.get("authorization");
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");
  const xCountryCode = request.headers.get("x-country-code");
  if (cookie) headers.set("cookie", cookie);
  if (authorization) headers.set("authorization", authorization);
  if (contentType) headers.set("content-type", contentType);
  if (accept) headers.set("accept", accept);
  if (xCountryCode) headers.set("x-country-code", xCountryCode);
  return headers;
}

/**
 * Parse a single Set-Cookie header value into { name, value, options }.
 * Handles name=value (value may contain "=") and attributes like Path, HttpOnly, Max-Age, etc.
 */
function parseSetCookieHeader(setCookieStr) {
  if (!setCookieStr || typeof setCookieStr !== "string") return null;
  const parts = setCookieStr.split(";").map((p) => p.trim());
  const [namePart, ...attrParts] = parts;
  const eq = namePart.indexOf("=");
  if (eq < 0) return null;
  const name = namePart.slice(0, eq).trim();
  const value = namePart.slice(eq + 1).trim();
  if (!name) return null;
  const options = { path: "/" };
  for (const attr of attrParts) {
    const kv = attr.indexOf("=");
    if (kv < 0) {
      if (attr.toLowerCase() === "httponly") options.httpOnly = true;
      if (attr.toLowerCase() === "secure") options.secure = true;
      continue;
    }
    const k = attr.slice(0, kv).trim().toLowerCase();
    const v = attr.slice(kv + 1).trim();
    if (k === "path") options.path = v;
    if (k === "domain") options.domain = v;
    if (k === "max-age") options.maxAge = parseInt(v, 10) || 0;
    if (k === "samesite") options.sameSite = v === "strict" ? "strict" : v === "none" ? "none" : "lax";
    if (k === "expires") options.expires = new Date(v);
  }
  return { name, value, options };
}

/**
 * Build a Set-Cookie header string (no Domain in dev so cookie is host-only for current origin).
 */
function buildSetCookieHeaderValue(parsed) {
  const path = parsed.options.path ?? "/";
  const maxAge = parsed.options.maxAge;
  const httpOnly = parsed.options.httpOnly ?? true;
  const secure = parsed.options.secure ?? process.env.NODE_ENV === "production";
  const sameSite = (parsed.options.sameSite ?? "lax").toLowerCase();
  let s = `${parsed.name}=${parsed.value}; Path=${path}; SameSite=${sameSite}`;
  if (httpOnly) s += "; HttpOnly";
  if (secure) s += "; Secure";
  if (maxAge != null && maxAge > 0) s += `; Max-Age=${maxAge}`;
  // In development do NOT set Domain so the cookie is scoped to the responding host (e.g. localhost:3104).
  if (process.env.NODE_ENV === "production" && parsed.options.domain) s += `; Domain=${parsed.options.domain}`;
  return s;
}

/**
 * Build dev-safe cookie options: no Domain (host-only), Secure=false on localhost.
 * Ensures browser accepts the cookie on http://localhost.
 */
function normalizeCookieOptsForResponse(parsed) {
  const opts = {
    path: parsed.options.path ?? "/",
    httpOnly: parsed.options.httpOnly ?? true,
    secure: process.env.NODE_ENV === "production" ? (parsed.options.secure ?? true) : false,
    sameSite: (parsed.options.sameSite ?? "lax").toLowerCase(),
  };
  if (parsed.options.maxAge != null && parsed.options.maxAge > 0) opts.maxAge = parsed.options.maxAge;
  if (parsed.options.expires) opts.expires = parsed.options.expires;
  if (process.env.NODE_ENV === "production" && parsed.options.domain) opts.domain = parsed.options.domain;
  return opts;
}

/** Get parsed cookies from backend response (for cookies().set() and applySetCookiesToResponse). */
function getParsedCookiesFromBackend(backendRes) {
  let setCookieStrings = [];
  if (typeof backendRes.headers.getSetCookie === "function") {
    setCookieStrings = backendRes.headers.getSetCookie();
  } else {
    const sc = backendRes.headers.get("set-cookie");
    if (sc) setCookieStrings = [sc];
  }
  const result = [];
  for (const str of setCookieStrings) {
    const parsed = parseSetCookieHeader(str);
    if (parsed) result.push({ parsed, opts: normalizeCookieOptsForResponse(parsed) });
  }
  return result;
}

/** Apply backend Set-Cookie to NextResponse (fallback; primary is cookies() API). */
function applySetCookiesToResponse(response, backendRes) {
  const items = getParsedCookiesFromBackend(backendRes);
  for (const { parsed, opts } of items) {
    response.cookies.set(parsed.name, parsed.value, opts);
    const headerValue = buildSetCookieHeaderValue(parsed);
    response.headers.append("Set-Cookie", headerValue);
    if (process.env.NODE_ENV === "development") {
      console.info("[proxy] auth cookie written (response)", {
        name: parsed.name,
        path: opts.path,
        secure: opts.secure,
        sameSite: opts.sameSite,
        domain: opts.domain ?? "(none)",
      });
    }
  }
}

async function proxyRequest(request, context, method) {
  const pathSegments = await resolvePathSegments(request, context);
  const url = new URL(request.url);
  const backendUrl = getBackendUrl(pathSegments, url.search);
  if (process.env.NODE_ENV === "development" && pathSegments[0] === "auth" && (method === "POST" || method === "GET")) {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    console.info("[proxy] auth request", {
      method,
      path: pathSegments.join("/"),
      hasOrigin: !!origin,
      hasReferer: !!referer,
      origin: origin || "(none)",
    });
  }
  try {
    const headers = forwardHeaders(request);
    const opts = { method, headers, cache: "no-store" };
    if (method !== "GET" && method !== "HEAD") {
      const body = await request.text();
      if (body) opts.body = body;
    }
    const res = await fetch(backendUrl, opts);
    const contentType = res.headers.get("content-type") || "";
    const resBody = await res.arrayBuffer();

    if (contentType.includes("application/json")) {
      let data = null;
      try {
        data = JSON.parse(new TextDecoder().decode(resBody));
      } catch {
        data = null;
      }
      const isAuth2xx = pathSegments[0] === "auth" && res.status >= 200 && res.status < 300;
      const parsedCookies = getParsedCookiesFromBackend(res);
      if (isAuth2xx && parsedCookies.length > 0) {
        const cookieStore = await cookies();
        for (const { parsed, opts } of parsedCookies) {
          cookieStore.set(parsed.name, parsed.value, opts);
        }
        await cookies();
      }
      const response = NextResponse.json(data, { status: res.status });
      applySetCookiesToResponse(response, res);
      if (process.env.NODE_ENV === "development" && isAuth2xx) {
        const authPath = pathSegments.join("/");
        const outSetCookie = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : (response.headers.get("set-cookie") ? [response.headers.get("set-cookie")] : []);
        const accessTokenEntry = parsedCookies.find((p) => p.parsed?.name === "access_token");
        const valueLen = accessTokenEntry ? Buffer.byteLength(accessTokenEntry.parsed.value, "utf8") : 0;
        const headerLen = outSetCookie.reduce((sum, h) => sum + Buffer.byteLength(h, "utf8"), 0);
        console.info("[proxy] auth response", {
          path: authPath,
          cookieStoreUsed: parsedCookies.length > 0,
          outHeaderCount: outSetCookie.length,
          outHeaderPresent: outSetCookie.length > 0,
          access_tokenValueBytes: valueLen,
          setCookieHeaderTotalBytes: headerLen,
          cookieLimitNote: "browsers ~4096 per cookie",
        });
      }
      return response;
    }
    const response = new NextResponse(resBody, { status: res.status, headers: { "content-type": contentType } });
    applySetCookiesToResponse(response, res);
    return response;
  } catch (e) {
    console.error("[proxy /api/v1]", method, backendUrl, e?.message || e);
    return NextResponse.json(
      {
        success: false,
        message:
          "API unavailable. Ensure the backend is running (e.g. npm run dev in backend-api).",
      },
      { status: 503 }
    );
  }
}

export async function GET(request, context) {
  return proxyRequest(request, context, "GET");
}

export async function POST(request, context) {
  return proxyRequest(request, context, "POST");
}

export async function PATCH(request, context) {
  return proxyRequest(request, context, "PATCH");
}

export async function PUT(request, context) {
  return proxyRequest(request, context, "PUT");
}

export async function DELETE(request, context) {
  return proxyRequest(request, context, "DELETE");
}

export async function HEAD(request, context) {
  return proxyRequest(request, context, "HEAD");
}
