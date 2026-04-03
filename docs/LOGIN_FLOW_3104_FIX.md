# Login Flow Fix – localhost:3104 and Shared Login

## Problem

- Login from `http://localhost:3104/login` (and `/staff/login`, `/login?app=staff&returnTo=...`) was failing: users entered valid credentials but did not reach the correct dashboard.
- A previous fix addressed the staff layout using a cross-origin `/auth/me` (so the cookie was not sent). The shared login flow on port 3104 was still broken.

## Root Causes

### 1. Set-Cookie not forwarded when API proxy route is used (primary)

- The app can handle `/api/v1/*` in two ways:
  - **Next.js rewrites** (next.config): request is rewritten to the backend; response (including Set-Cookie) is typically forwarded.
  - **API route** `app/api/v1/[[...path]]/route.js`: used when rewrites do not apply (e.g. some Next.js 16 behavior). This route proxied the backend response but **did not forward `Set-Cookie`**.
- When the API route was used, the backend set `access_token` via `Set-Cookie`, but the client response was built with `NextResponse.json(data, { status })` and no headers from the backend. The browser never received the cookie, so subsequent `/auth/me` (and layout auth checks) had no session and redirected back to login.

### 2. No `/staff/login` page

- Links and redirects point to `/staff/login`, but there was no `app/staff/login` page. That could 404 or leave users without a clear path to the shared login with `app=staff`.

### 3. Scattered auth base logic

- Login page, post-auth-landing, and staff layout each had their own “same-origin in browser, backend URL in SSR” logic. No single helper increased the risk of one place using a hardcoded backend URL in the browser and losing the cookie.

### 4. Dual Next config – API route never ran (remaining 401 after login)

- **Historical:** The repo had two Next config files: `next.config.mjs` and `next.config.js`. When both existed, `next.config.js` was the one loaded by `next dev` (and by `dev:owner` on port 3104). Only `next.config.mjs` had been updated to remove the `/api/v1/*` rewrite from `beforeFiles`. `next.config.js` still had `beforeFiles: [{ source: "/api/v1/:path*", ... }]`.
- So at runtime, every `/api/v1/*` request (including login and auth/me) was rewritten to the backend before the filesystem was checked. The App Router API route never ran, so Set-Cookie forwarding had no effect. The browser often did not receive the session cookie; post-auth-landing then called auth/me without a cookie and got 401 Unauthorized.
- **Current (2026-03-21):** **`next.config.mjs` was removed.** All behavior is merged into **`next.config.js`** (including Turbopack nested-route flag and redirects). Do not add a parallel `.mjs` config again.

## Fix Summary

### 1. Forward Set-Cookie in API proxy route + rewrite order

**File:** `app/api/v1/[[...path]]/route.js`

- After calling the backend, copy all `Set-Cookie` headers from the backend response into the NextResponse (using `getSetCookie()` when available, else `get("set-cookie")`).
- Both JSON and non-JSON responses now forward these headers so cookie-based auth works.

**Files:** **`next.config.js`** (canonical; formerly duplicated in removed `next.config.mjs`)

- The `/api/v1/:path*` rewrite must **not** be in `beforeFiles`. So Next.js checks the filesystem first and the App Router API route `app/api/v1/[[...path]]/route.js` handles all `/api/v1/*` requests. That guarantees login and `/auth/me` go through the proxy route and Set-Cookie is always forwarded. The rewrite remains in `fallback` only.
- **Critical:** Apply the same change in **`next.config.js`** (empty `beforeFiles`, `fallback: [apiRewrite]`). Otherwise the API route never runs and the session is not established.

### 2. Shared auth base helper

**File:** `lib/authRedirect.ts`

- Added `getBrowserSafeApiBase()`: in the browser returns `""` (same-origin); on the server returns `NEXT_PUBLIC_API_BASE_URL` or `http://localhost:3000`.
- Added `getAuthMeBase()` as an alias for auth/me and login calls.

**Files updated to use it:**

- `app/login/page.jsx`: uses `getBrowserSafeApiBase()` for login POST.
- `app/staff/layout.jsx`: uses `getAuthMeBase()` for `/api/v1/auth/me`.
- `app/post-auth-landing/page.tsx`: uses `getBrowserSafeApiBase()` for `/api/v1/auth/me`.

### 3. Staff login page

**File:** `app/staff/login/page.jsx` (new)

- Renders a short “Redirecting to sign in…” and redirects to `/login?app=staff&returnTo=<safe-returnTo>`.
- `returnTo` is taken from query (`returnTo` or `next`) and validated with `sanitizeReturnTo`; default is current origin + `/staff`.

### 4. Minimal dev-only debug logs

**File:** `app/login/page.jsx`

- In development only: log at submit start (`[login] submit` with loginPath and app flags), on success redirect (`[login] success redirect` with targetPath), and on failure (`[login] failed`). Existing `[staff-login] redirect after success` kept for staff full-URL redirect.

## Flow After Fix

1. **User opens** `http://localhost:3104/login` (or `/login?app=staff&returnTo=...` or `/staff/login`).
2. **Staff entry:** `/staff/login` redirects to `/login?app=staff&returnTo=...`.
3. **Submit:** Form POSTs to same-origin `/api/v1/auth/login` or `/api/v1/auth/staff/login` (depending on `app` / `returnTo`). Request goes to Next.js (3104); either rewrite or API route sends it to the backend. Response (with Set-Cookie) is returned to the browser; API route now forwards Set-Cookie when it is used.
4. **Cookie:** Browser stores `access_token` for the current origin (or domain as set by backend).
5. **Redirect:** User is sent to `returnTo` (if allowed), or `/staff` (staff flow), or `/post-auth-landing` (generic).
6. **Post-auth-landing:** Calls same-origin `/api/v1/auth/me` (cookie sent), then redirects by `routing.default_redirect` / panels.
7. **Staff layout:** On `/staff/*`, layout calls same-origin `/api/v1/auth/me` (cookie sent); if OK and `panels.staff` (or owner/admin), user stays; otherwise redirect to `/staff/login` or fallback.

## Files Changed

| File | Change |
|------|--------|
| `app/api/v1/[[...path]]/route.js` | Forward all Set-Cookie headers from backend response to client. |
| `lib/authRedirect.ts` | Add `getBrowserSafeApiBase()` and `getAuthMeBase()`. |
| `app/login/page.jsx` | Use `getBrowserSafeApiBase()`; add minimal dev-only logs. |
| `app/staff/layout.jsx` | Use `getAuthMeBase()` from lib. |
| `app/post-auth-landing/page.tsx` | Use `getBrowserSafeApiBase()` from lib. |
| `app/staff/login/page.jsx` | **New.** Redirect to `/login?app=staff&returnTo=...`. |
| **`next.config.js`** | API rewrite only in `fallback`, not `beforeFiles`; includes merged redirects/Turbopack settings. **Do not reintroduce `next.config.mjs`.** |
| `app/post-auth-landing/page.tsx` | Dev-only log of auth/me status and URL; log when auth/me fails before redirect to /login. |

## Test Scenarios

- **A.** Open `http://localhost:3104/login`, log in with valid staff user → lands on correct panel (e.g. `/staff` or post-auth-landing then panel).
- **B.** Open `http://localhost:3104/staff/login`, log in with valid staff user → redirects to `/login?app=staff&returnTo=...`, then after login to `/staff` (or returnTo).
- **C.** Open `/login?app=staff&returnTo=http://localhost:3104/staff`, log in → lands on `http://localhost:3104/staff`.
- **D.** After login, refresh on staff page → remains logged in, no redirect to login.
- **E.** Logout, then log in again → works.
- **F.** Invalid password → error message, no redirect to dashboard.
- **G.** Valid user without staff access using staff login → backend can return 403; no dashboard access.
- **H.** Multi-panel user from shared login → post-auth-landing routes by backend `routing` / panels.
- **I.** Direct open of protected staff page after login → allowed.
- **J.** No redirect loop between `/login` and protected pages.

## Production / Dev

- **Cookie domain:** Backend uses `domain: process.env.COOKIE_DOMAIN || "localhost"`. In production, set `COOKIE_DOMAIN` to the app domain so the cookie is sent to the Next.js origin.
- **Env:** For production, set `NEXT_PUBLIC_API_BASE_URL` (and optionally `NEXT_PUBLIC_AUTH_BASE_URL`) as needed; browser auth calls still use same-origin when using the helpers above.

## Remaining Risks

- If in production only the **rewrite** is used and some Next.js version or deployment does not forward Set-Cookie on external rewrites, login could still fail on that path. The API route fix guarantees cookie forwarding when the route is used. If issues persist, consider routing auth endpoints through the API route only (e.g. exclude `/api/v1/auth/*` from the rewrite).
- Multiple tabs or ports (e.g. 3100 vs 3104): each origin has its own cookie; logging in on one port does not log in on the other (expected).

## Follow-up

1. Consider excluding `/api/v1/auth/*` from next.config rewrites so the API route always handles auth and Set-Cookie is always under our control.
2. E2E: add a smoke test for staff login → `/staff` or branch page → 200, no redirect to login.
3. Optionally remove or further gate the `[login]` / `[staff-login]` dev logs once stable.
