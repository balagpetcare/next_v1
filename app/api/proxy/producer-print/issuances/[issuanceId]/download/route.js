/**
 * Proxy GET /api/proxy/producer-print/issuances/:issuanceId/download
 * -> Backend GET ${BACKEND_BASE_URL}/api/v1/producer-print/issuances/:issuanceId/download (stable alias)
 * Forwards credentials (Authorization, Cookie). Returns raw body; forwards Content-Type and Content-Disposition.
 * On non-2xx returns JSON error with the same status code.
 */
import { NextResponse } from "next/server";

const BACKEND_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

function forwardHeaders(request) {
  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  const authorization = request.headers.get("authorization");
  const accept = request.headers.get("accept");
  const xCountryCode = request.headers.get("x-country-code");
  if (cookie) headers.set("cookie", cookie);
  if (authorization) headers.set("authorization", authorization);
  if (accept) headers.set("accept", accept);
  if (xCountryCode) headers.set("x-country-code", xCountryCode);
  return headers;
}

export async function GET(request, context) {
  const params = await (context.params ?? Promise.resolve({}));
  const issuanceId = params?.issuanceId;
  if (issuanceId == null || issuanceId === "") {
    return NextResponse.json({ success: false, message: "Issuance id required" }, { status: 400 });
  }
  const backendUrl = `${BACKEND_BASE_URL}/api/v1/producer-print/issuances/${encodeURIComponent(issuanceId)}/download`;
  try {
    const res = await fetch(backendUrl, {
      method: "GET",
      headers: forwardHeaders(request),
      cache: "no-store",
    });
    const contentType = res.headers.get("content-type") || "";
    const contentDisposition = res.headers.get("content-disposition");
    const body = await res.arrayBuffer();

    if (!res.ok) {
      let data = null;
      try {
        data = JSON.parse(new TextDecoder().decode(body));
      } catch {
        data = { success: false, message: res.statusText };
      }
      return NextResponse.json(data ?? { success: false, message: "Download failed" }, { status: res.status });
    }

    const responseHeaders = new Headers();
    responseHeaders.set("content-type", contentType);
    if (contentDisposition) responseHeaders.set("content-disposition", contentDisposition);
    return new NextResponse(body, { status: res.status, headers: responseHeaders });
  } catch (e) {
    console.error("[proxy producer-print GET issuance download]", e?.message || e);
    return NextResponse.json(
      { success: false, message: "Print API unavailable. Ensure the backend is running (npm run dev:api in backend-api)." },
      { status: 503 }
    );
  }
}
