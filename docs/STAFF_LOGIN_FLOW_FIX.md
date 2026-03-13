# Staff Login Flow – Root Cause and Fix

## Problem

- Staff login at `http://localhost:3104/staff/login` redirects to `http://localhost:3104/login?app=staff&returnTo=...`.
- Users could enter valid credentials and submit; backend returned 200 and set the auth cookie.
- After redirect to `returnTo` (e.g. `http://localhost:3104/staff`), users did **not** reliably reach the staff dashboard (404 or redirect back to login).

## Root Causes

### 1. Missing `/staff` root page (primary)

- Login success redirects to `returnTo` = `http://localhost:3104/staff`. There was **no** `app/staff/page.jsx`, so the exact path `/staff` had no matching page (404 or empty layout). Staff could not "reach the staff dashboard" even when auth/me succeeded.

### 2. Set-Cookie not reaching the browser (post-login 401)

- After staff login, the app sometimes reached `/post-auth-landing` and `GET /api/v1/auth/me` returned **401 Unauthorized**.
- The proxy at `app/api/v1/[[...path]]/route.js` was forwarding the backend’s `Set-Cookie` by adding it to a `Headers` object and passing it to `NextResponse.json(..., { headers })`. In Next.js/fetch, **Set-Cookie on a Response built from Headers can be dropped or not sent to the client**. So the browser never stored the cookie, and the next request (e.g. auth/me) had no cookie → 401.

### 3. Staff layout auth/me origin (historical; already fixed)

**Staff layout was calling the API on a different origin than the one that set the cookie.**

1. **Login** happens on the Next.js origin (e.g. `http://localhost:3104`). The form POSTs to `/api/v1/auth/staff/login`, which Next.js rewrites to the backend (e.g. `http://localhost:3000`). The response (including `Set-Cookie: access_token=...`) is received by the browser as the response to the request to **3104**. The cookie is therefore stored for the **3104** origin (or for `localhost` in a way that is sent only with same-origin requests from the page on 3104, depending on browser/cookie handling).

2. **Staff layout** (`app/staff/layout.jsx`) was calling:
   ```js
   fetch(`${API_BASE}/api/v1/auth/me`, ...)
   ```
   with `API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000"`. So from a page on **3104**, it was sending a request to **3000** (cross-origin).

3. For that cross-origin request, the browser did **not** send the cookie that had been set in the context of 3104 (or CORS/credentials behavior prevented it). So `/api/v1/auth/me` on 3000 received **no** auth cookie → **401 Unauthorized**.

4. Staff layout treats non-ok response as “not authenticated” and redirects to `/staff/login`. So right after a successful login and redirect to `/staff`, the layout’s auth check failed and sent the user back to the login page.

Owner and Doctor panels did **not** have this bug because their layouts use **same-origin** for the auth check (`API_BASE = ""` in browser), so the cookie is sent and `/auth/me` succeeds.

## Fix Summary

### 1. Staff root page (new)

**File:** `app/staff/page.jsx` (new)

- **Change:** Add a root page for `/staff` that redirects to `/staff/workspace` (staff dashboard landing).
- **Effect:** After login, `returnTo=.../staff` loads a valid page that then sends the user to the workspace; no 404.

### 2. Staff layout – same-origin auth check (already in place)

**File:** `app/staff/layout.jsx`

- Uses `getAuthMeBase()` for `/api/v1/auth/me` so the request is same-origin in the browser; cookie is sent and auth succeeds. Minimal dev-only log when auth/me fails: `[staff] auth/me failed` with status.

### 3. API proxy – Set-Cookie via NextResponse.cookies

**File:** `app/api/v1/[[...path]]/route.js`

- **Change:** Stop forwarding Set-Cookie by putting it in a Headers object. Instead, parse the backend’s `Set-Cookie` header(s) and call **`response.cookies.set(name, value, options)`** on the NextResponse. This applies to all proxied auth responses (login, staff login, etc.), so the browser reliably receives the cookie.
- **Effect:** Login (and staff login) responses now set the cookie in the client; auth/me and other same-origin API calls then send the cookie and return 200.

### 4. Staff login – never post-auth-landing; always full-page redirect to /staff

**File:** `app/login/page.jsx`

- **Change:** After successful login, if the endpoint used was `POST /api/v1/auth/staff/login` (`usedStaffLogin`), always redirect with **`window.location.href = staffUrl`** (full URL to `/staff`). If `targetPath` would have been `/post-auth-landing`, override it to `/staff`. Staff never goes to post-auth-landing after login.
- **Effect:** Staff always lands on `/staff` (then `/staff/workspace`) with a full page load, so the cookie set by the login response is sent on the next request; no post-auth-landing 401.

### 5. Staff login entry and shared login page

- **`app/staff/login/page.jsx`:** Redirects to `/login?app=staff&returnTo=...`; dev-only log `[staff-login] redirect to shared login`.
- **`app/login/page.jsx`:** Staff flow uses `POST /api/v1/auth/staff/login` when `app=staff` or `returnTo` includes `/staff`; validates `returnTo` with `isAllowedReturnTo`. Staff redirect uses full-page navigation to `/staff`.

## Files Changed

| File | Change |
|------|--------|
| `app/api/v1/[[...path]]/route.js` | Forward Set-Cookie via `NextResponse.cookies.set()` instead of Headers; parse backend Set-Cookie and apply to response. Affects all auth login responses (owner, staff, generic). |
| `app/login/page.jsx` | Staff-only: after staff login, never send to post-auth-landing; always full-page redirect to `/staff`. |
| `app/staff/page.jsx` | **New.** Redirect `/staff` → `/staff/workspace` so returnTo lands on a valid page. |
| `app/staff/layout.jsx` | Dev-only log when auth/me fails. Same-origin auth/me via `getAuthMeBase()` already in place. |
| `app/staff/login/page.jsx` | Dev-only log when redirecting to shared login. |

## Runtime Chain (staff only)

1. `/staff/login` → redirect to `/login?app=staff&returnTo=http://localhost:3104/staff`
2. User submits credentials → `POST /api/v1/auth/staff/login` (same-origin via `getBrowserSafeApiBase()`)
3. Backend sets `access_token` cookie; response proxied by Next.js so cookie is set on current origin
4. Login page redirects via `window.location.href = allowedTarget` (e.g. `http://localhost:3104/staff`)
5. `/staff` loads → staff layout runs → `GET /api/v1/auth/me` same-origin, cookie sent → 200, `panels.staff` true
6. Staff root page renders → `router.replace("/staff/workspace")` → user lands on staff dashboard
7. Refresh on `/staff/workspace` or any protected staff page: layout auth/me succeeds, page remains

## Architecture Alignment

- **Cookie:** Set by backend on login; sent by browser only to the origin that received the `Set-Cookie` (or to same-origin requests). Client-side auth checks must call the **same origin** (Next.js), which proxies to the API, so the cookie is included.
- **Owner/Doctor:** Unchanged. Staff uses same-origin for auth/me via `getAuthMeBase()`.
- **Proxy:** Next.js rewrites `/api/v1/*` to the backend; no proxy change required.
- **Guards:** Staff layout uses `panels.staff`, `panels.owner`, or `panels.admin` from `/auth/me`; logic unchanged.

## Validation (staff-only scenarios)

- Valid staff login from `/staff/login` → lands on `/staff` (or `returnTo`) and dashboard loads.
- Valid staff login from `/login?app=staff&returnTo=http://localhost:3104/staff` → same.
- Page refresh after staff login → remains on staff area, no redirect to login.
- Logout then staff login again → works.
- Wrong password → error message, no redirect to dashboard.
- User with no staff access using staff login API → 403 with message; no dashboard access.
- Staff with branch membership → can open staff dashboard and branch-scoped pages.
- Direct access to a protected staff page after login → allowed (no immediate redirect back to login).
- **Owner/doctor flows:** Not modified; confirm owner and doctor login still work as before.

## Remaining Risks

- **Cookie domain in production:** Backend uses `domain: process.env.COOKIE_DOMAIN || "localhost"`. In production, set `COOKIE_DOMAIN` to the correct domain so the cookie is sent to the Next.js app origin.
- **Multiple tabs/ports:** If the same user uses different ports (e.g. 3100 vs 3104) for the same app, each port has its own cookie scope; logging in on one port does not log in on the other. This is expected for same-origin cookie behavior.

## Confirmation

- Only staff login/auth/redirect/dashboard-entry flow was modified.
- Owner and doctor login and shared login behavior for other apps were not changed.
