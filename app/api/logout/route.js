import { NextResponse } from "next/server";

// Clears auth cookies for the Next.js origin.
// This is necessary for HttpOnly cookie auth when the backend cookie name/path
// differs or when the backend logout endpoint is unavailable.

function clearCookie(res, name) {
  // Setting an empty cookie with Max-Age=0 clears it in browsers.
  const isProd = process.env.NODE_ENV === "production";
  res.cookies.set({
    name,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 0,
  });
}

export async function POST() {
  const res = NextResponse.json({ success: true });

  // BPA common cookie names (keep in sync with backend)
  clearCookie(res, "access_token");
  clearCookie(res, "token");
  clearCookie(res, "jwt");
  clearCookie(res, "refresh_token");

  return res;
}
