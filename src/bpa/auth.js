import { cookies } from "next/headers";

export function getAuthCookieName() {
  return process.env.AUTH_COOKIE_NAME || "bpa_admin";
}

// Next.js 15+: cookies() is async in Server Components
export async function hasAuthCookie() {
  const name = getAuthCookieName();
  const cookieStore = await cookies();
  const c = cookieStore.get(name);
  return Boolean(c?.value);
}
