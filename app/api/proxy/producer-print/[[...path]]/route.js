/**
 * Proxy /api/proxy/producer-print/* -> backend API /api/v1/producer/print/*
 * Single catch-all: GET and POST for any path (e.g. batches, batches/4, batches/4/allocate).
 * Ensures producer print endpoints hit the backend (port 3000) with cookies forwarded.
 */
import { NextResponse } from "next/server";

const API_TARGET = process.env.API_BASE_URL || "http://localhost:3000";
const PREFIX = "/api/v1/producer/print";

function getBackendUrl(pathSegments) {
  const path = Array.isArray(pathSegments) && pathSegments.length > 0 ? pathSegments.join("/") : "";
  return `${API_TARGET}${PREFIX}${path ? `/${path}` : ""}`;
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

export async function GET(request, context) {
  const params = await (context.params ?? Promise.resolve({}));
  const pathSegments = params.path ?? [];
  const url = new URL(request.url);
  const backendUrl = getBackendUrl(pathSegments) + (url.search || "");
  try {
    const res = await fetch(backendUrl, {
      method: "GET",
      headers: forwardHeaders(request),
      cache: "no-store",
    });
    const body = await res.text();
    let data = body;
    try {
      data = body ? JSON.parse(body) : null;
    } catch {
      // keep as text
    }
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    console.error("[proxy producer-print GET]", e?.message || e);
    return NextResponse.json(
      { success: false, message: "Print API unavailable. Ensure the backend is running (npm run dev:api in backend-api)." },
      { status: 503 }
    );
  }
}

export async function POST(request, context) {
  const params = await (context.params ?? Promise.resolve({}));
  const pathSegments = params.path ?? [];
  const backendUrl = getBackendUrl(pathSegments);
  try {
    const headers = forwardHeaders(request);
    const body = await request.text();
    const res = await fetch(backendUrl, {
      method: "POST",
      headers,
      body: body || undefined,
      cache: "no-store",
    });
    const contentType = res.headers.get("content-type") || "";
    const contentDisposition = res.headers.get("content-disposition");
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
    if (contentDisposition) responseHeaders.set("content-disposition", contentDisposition);
    return new NextResponse(resBody, { status: res.status, headers: responseHeaders });
  } catch (e) {
    console.error("[proxy producer-print POST]", e?.message || e);
    return NextResponse.json(
      { success: false, message: "Print API unavailable. Ensure the backend is running (npm run dev:api in backend-api)." },
      { status: 503 }
    );
  }
}
