/**
 * Proxy /api/v1/* -> backend API (e.g. http://localhost:3000/api/v1/*).
 * Used when Next.js rewrites do not apply (e.g. Next.js 16 regression).
 * Forwards cookies and common headers so owner/auth APIs work same-origin.
 */
import { NextResponse } from "next/server";

const API_TARGET = process.env.API_BASE_URL || "http://localhost:3000";

function getBackendUrl(pathSegments, search) {
  const path =
    Array.isArray(pathSegments) && pathSegments.length > 0 ? pathSegments.join("/") : "";
  const base = `${API_TARGET}/api/v1${path ? `/${path}` : ""}`;
  return search ? `${base}${search}` : base;
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

async function proxyRequest(request, context, method) {
  const params = await (context.params ?? Promise.resolve({}));
  const pathSegments = params.path ?? [];
  const url = new URL(request.url);
  const backendUrl = getBackendUrl(pathSegments, url.search);
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
      return NextResponse.json(data, { status: res.status });
    }
    const responseHeaders = new Headers();
    responseHeaders.set("content-type", contentType);
    return new NextResponse(resBody, { status: res.status, headers: responseHeaders });
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
