import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ message: "Missing url param" }, { status: 400 });
  }

  try {
    // Validate URL to prevent SSRF (basic check)
    // In production, you might want to whitelist domains
    const url = new URL(targetUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
        return NextResponse.json({ message: "Invalid protocol" }, { status: 400 });
    }

    // Forward authentication headers (Cookie, Authorization)
    const headers = {};
    const cookie = request.headers.get("cookie");
    const authorization = request.headers.get("authorization");

    if (cookie) headers["cookie"] = cookie;
    if (authorization) headers["authorization"] = authorization;

    const response = await fetch(targetUrl, { headers });

    if (!response.ok) {
      return NextResponse.json(
        { message: `Failed to fetch image: ${response.statusText}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*", // Allow frontend to read this
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
