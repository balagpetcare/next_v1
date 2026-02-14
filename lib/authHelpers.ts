/**
 * Shared auth helpers for middleware, layout guards, and redirects.
 *
 * Decision rules (used in proxy + admin layout):
 * ┌─────────────────────┬──────────────────────────────────────────────────────────┐
 * │ Condition           │ Action                                                    │
 * ├─────────────────────┼──────────────────────────────────────────────────────────┤
 * │ isPublicPath(path)  │ Allow; never require auth                                 │
 * │ hasAuth (cookie)    │ Allow protected routes                                    │
 * │ 401 from /me        │ Redirect to login (no token)                              │
 * │ 403 from admin/me   │ Redirect to /admin/forbidden (token ok, not whitelisted)  │
 * │ Role after login    │ getRedirectForRole(role) → /admin, /owner, etc.           │
 * └─────────────────────┴──────────────────────────────────────────────────────────┘
 * Auth cookies: access_token | token | jwt (matches BPA API)
 */

/** Paths that never require authentication (auth entry, landing, static) */
const PUBLIC_PATH_PREFIXES = [
  "/",
  "/auth",
  "/login",
  "/register",
  "/forgot-password",
  "/verify-email",
  "/invite/accept",
  "/health",
  "/debug",
  "/getting-started",
  "/post-auth-landing",
  "/choose-activity",
  "/owner/login",
  "/owner/register",
  "/owner/logout",
  "/admin/login",
  "/admin/logout",
  "/admin/register",
  "/country/login",
  "/staff/login",
  "/producer/login",
  "/shop/login",
  "/clinic/login",
  "/mother/login",
  "/_next",
  "/assets",
  "/favicon",
  "/robots",
  "/sitemap",
  "/images",
] as const;

/** Cookie names treated as auth tokens (matches BPA API) */
const AUTH_COOKIE_NAMES = ["access_token", "token", "jwt"] as const;

export type PanelRole = "ADMIN" | "OWNER" | "STAFF" | "PRODUCER" | "COUNTRY" | "MOTHER" | "USER";

/**
 * Check if a pathname is public (no auth required).
 * Public paths include auth entry points, static assets, and Next internals.
 */
export function isPublicPath(pathname: string): boolean {
  if (!pathname || pathname === "/") return true;
  const p = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return PUBLIC_PATH_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

/**
 * Check if request has auth signal (cookie or Authorization header).
 * Use in proxy/middleware; cannot read localStorage.
 */
export function getAuthFromCookies(cookies: { get: (name: string) => { value: string } | undefined }, authHeader?: string | null): boolean {
  for (const name of AUTH_COOKIE_NAMES) {
    if (cookies.get(name)?.value) return true;
  }
  if (authHeader?.toLowerCase().startsWith("bearer ")) return true;
  return false;
}

/**
 * Get redirect path for a role after login.
 * Used by post-auth-landing and layout guards.
 */
export function getRedirectForRole(role: PanelRole): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "OWNER":
      return "/owner/dashboard";
    case "STAFF":
      return "/staff";
    case "PRODUCER":
      return "/producer";
    case "COUNTRY":
      return "/country/dashboard";
    case "MOTHER":
      return "/mother";
    default:
      return "/post-auth-landing";
  }
}
