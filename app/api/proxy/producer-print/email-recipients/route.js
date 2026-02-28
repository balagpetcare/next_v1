/**
 * Proxy /api/proxy/producer-print/email-recipients -> backend GET/POST /api/v1/producer/print/email-recipients.
 * Dedicated route so this path is always matched (avoids catch-all 404 on some setups).
 */
import { NextResponse } from "next/server";

const API_TARGET = process.env.API_BASE_URL || "http://localhost:3000";
const BACKEND_URL = `${API_TARGET}/api/v1/producer/print/email-recipients`;

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

export async function GET(request) {
  const url = new URL(request.url);
  const backendUrl = BACKEND_URL + (url.search || "");
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
    console.error("[proxy producer-print GET email-recipients]", e?.message || e);
    return NextResponse.json(
      { success: false, message: "Print API unavailable. Ensure the backend is running (npm run dev:api in backend-api)." },
      { status: 503 }
    );
  }
}

export async function POST(request) {
  try {
    const headers = forwardHeaders(request);
    const body = await request.text();
    const res = await fetch(BACKEND_URL, {
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
    console.error("[proxy producer-print POST email-recipients]", e?.message || e);
    return NextResponse.json(
      { success: false, message: "Print API unavailable. Ensure the backend is running (npm run dev:api in backend-api)." },
      { status: 503 }
    );
  }
}
