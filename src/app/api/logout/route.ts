import { NextResponse } from "next/server";

export async function POST() {
  // UI demo. In real app, call backend API to clear HttpOnly cookie.
  return NextResponse.json({ success: true });
}
