# Owner + Staff Login and Dashboard-Access Flow – Fix Summary

## Scope

- **In scope:** Owner and Staff login, session, redirect, and dashboard-entry flows only.
- **Out of scope:** Doctor and other panel login flows (unchanged).

## Problems Addressed

1. **Staff:** Could not reliably access staff panel or pages like `/staff/branches`; session/auth bootstrap failed after login.
2. **Owner:** Could not reliably reach owner dashboard after login; same-origin cookie/session issues.

## Root Causes (Owner + Staff)

1. **Set-Cookie not reaching the browser**  
   The API proxy forwarded backend `Set-Cookie` via a `Headers` object into `NextResponse.json()`. In Next.js/fetch, that can prevent the browser from receiving the cookie. **Fix:** Apply cookies with `NextResponse.cookies.set()` in `app/api/v1/[[...path]]/route.js` (see STAFF_LOGIN_FLOW_FIX.md).

2. **Cookie domain in development**  
   Backend sets `Domain=localhost`. On some environments (e.g. `localhost:3104`), the browser may not send the cookie on same-origin requests. **Fix:** In development, the proxy omits the `Domain` attribute so the cookie is scoped to the current host.

3. **Missing root pages**  
   - `/staff` had no page → 404 after redirect. **Fix:** `app/staff/page.jsx` redirects to `/staff/workspace`.
   - `/owner` had no page → 404 after redirect. **Fix:** `app/owner/page.jsx` redirects to `/owner/dashboard`.

4. **Owner/generic login using client navigation to post-auth-landing**  
   When redirecting to `/post-auth-landing`, `router.push()` was used so the next request could run before the cookie was fully committed. **Fix:** For owner/generic login when target is post-auth-landing, use `window.location.href = origin + "/post-auth-landing"` so the cookie is sent on load.

5. **Staff sent to post-auth-landing**  
   Staff was sometimes sent to post-auth-landing and got 401 on auth/me. **Fix:** After staff login, always redirect to `/staff` with a full-page navigation (see STAFF_LOGIN_FLOW_FIX.md).

## Files Changed (Owner + Staff Only)

| File | Change |
|------|--------|
| `app/api/v1/[[...path]]/route.js` | Apply Set-Cookie via `response.cookies.set()`. In dev, omit `Domain` so cookie sticks on current host. |
| `app/login/page.jsx` | Owner/generic: when target is post-auth-landing, use full-page redirect. Staff: already uses full-page redirect to /staff. |
| `app/owner/page.jsx` | **New.** Redirect `/owner` → `/owner/dashboard`. |
| `app/owner/layout.jsx` | Dev-only log when auth/me fails. |
| `app/staff/page.jsx` | (Existing) Redirect `/staff` → `/staff/workspace`. |
| `app/staff/layout.jsx` | (Existing) Same-origin auth/me; dev log on auth/me failure. |

## Runtime Chains After Fix

### Staff

1. `/staff/login` → `/login?app=staff&returnTo=...`
2. Submit → `POST /api/v1/auth/staff/login` (same-origin); proxy sets cookie via `cookies.set()`; in dev no Domain.
3. Full-page redirect to `/staff` (or returnTo).
4. `/staff` → layout auth/me (same-origin, cookie sent) → 200 → redirect to `/staff/workspace`.
5. `/staff/branches` → layout allows → page redirects to `/staff/branch`. Refresh keeps session.

### Owner

1. `/owner/login` → `/login?next=/owner` (or returnTo).
2. Submit → `POST /api/v1/auth/login` (generic); proxy sets cookie; in dev no Domain.
3. If allowedTarget = `/owner`: full-page redirect to `/owner` → owner root page → `/owner/dashboard`.
4. If no returnTo/next: full-page redirect to `/post-auth-landing` → auth/me 200 → redirect to default_redirect (e.g. `/owner/dashboard`).
5. Owner layout uses `API_BASE = ""` (same-origin). Refresh keeps session.

## Validation Checklist

**Staff:**  
A. /staff/login → shared login. B. Valid staff login. C. auth/me 200. D. Redirect to /staff or /staff/workspace. E. /staff/branches accessible (then /staff/branch). F. Refresh keeps session. G. Invalid password fails. H. Non-staff rejected.

**Owner:**  
I. /login with valid owner credentials. J. auth/me 200. K. Redirect to owner dashboard. L. Refresh keeps session. M. Invalid password fails. N. Non-owner rejected.

**Regression:**  
O. Doctor login unchanged. P. No redirect loops. Q. /owner and /staff root pages resolve.

## Doctor / Other Panels

- Doctor login flow and redirect logic were not modified.
- Shared proxy change (cookies.set + dev Domain) benefits all panels that use the same proxy for login; redirect and endpoint selection remain panel-specific (staff/owner/doctor logic unchanged).
