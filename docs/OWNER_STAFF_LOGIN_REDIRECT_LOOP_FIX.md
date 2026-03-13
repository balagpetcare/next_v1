# Owner/Staff Cross-Login Redirect Loop – Fix

## 1. Root cause of the loop

The loop happened because of **stale panel state** and **cross-panel redirects** without checking server truth:

1. **Stale `selectedPanel` cookie**  
   After logout, `selectedPanel` (and `intendedPanel`) were only cleared from **localStorage**, not from **cookies**. So a previous value (e.g. `"staff"`) could still be present.

2. **post-auth-landing trusted `selectedPanel` without checking `allowedPanels`**  
   In the “needsActivitySelection” and “default_redirect” branches, the app redirected to `PANEL_PATHS[selectedPanel]` (e.g. `/staff`) even when the user did **not** have that panel in `auth/me`’s `allowedPanels`. So an owner-only user could be sent to `/staff` because of a stale `selectedPanel=staff` cookie.

3. **Staff layout then sent them back to login**  
   On `/staff`, staff layout calls `auth/me`. If the session was invalid, not yet established, or the backend returned 401, the layout redirected to `/staff/login`.

4. **Staff login always redirects to shared `/login`**  
   `/staff/login` immediately does `router.replace(\`/login?app=staff&returnTo=...\`)`. So the user landed back on `/login` with `app=staff`.

5. **Cycle**  
   From `/login` they could hit post-auth-landing again (e.g. after another login attempt or a redirect), which again used the same stale `selectedPanel` and sent them to `/staff` → `/staff/login` → `/login`, repeating.

So the **exact loop chain** was:

- **Who redirects from `/login` to `/staff/login`?**  
  Nobody directly. The flow was: login → post-auth-landing → (wrong) redirect to `/staff` → staff layout → `/staff/login` → `/login`.

- **Who redirects from `/staff/login` back to `/login`?**  
  The staff login page itself: it always does `router.replace(\`/login?app=staff&returnTo=...\`)`.

- **Before or after auth/me?**  
  post-auth-landing runs **after** a successful auth/me and then redirects using **stale** `selectedPanel`; staff layout runs **after** a failed (or missing) auth/me and redirects to `/staff/login`.

- **Cookies/session**  
  Session could be valid for owner; the bug was redirecting to a panel (staff) the user wasn’t allowed to use, and/or stale cookies affecting that redirect.

- **Role/panel resolution**  
  It used **client state** (cookie `selectedPanel`) instead of **server truth** (`allowedPanels` from auth/me) for where to send the user.

---

## 2. Files changed

| File | Change |
|------|--------|
| `lib/authRedirect.ts` | Added `pathToPanelKey`, `isPathAllowedForPanels`, `resolveLandingPathFromMe`. Panel resolution and path validation now use `allowedPanels`. |
| `app/post-auth-landing/page.tsx` | Uses `resolveLandingPathFromMe` and only redirects to panels in `allowedPanels`; validates `selectedPanel` and `default_redirect`; clears invalid `selectedPanel` cookie; on auth/me failure clears staff-login loop key and redirects to `/login` with no `next`. |
| `lib/logoutState.ts` | Added `LOGOUT_PANEL_COOKIE_NAMES`, `clearPanelCookiesOnLogout()`; `clearLogoutState()` now also clears `selectedPanel` and `intendedPanel` **cookies**. |
| `app/staff/login/page.jsx` | Normalizes returnTo to staff-only (never pass `/owner`); loop guard: if we already redirected to `/login` in the last 6s, show “Too many redirects” + link instead of redirecting again. |
| `app/login/page.jsx` | Cross-panel guards: owner (generic) login does not use a target that is `/staff`; staff login does not use a target that is `/owner`. |
| `docs/OWNER_STAFF_LOGIN_REDIRECT_LOOP_FIX.md` | This document. |

---

## 3. Redirect rules before vs after

**Before**

- post-auth-landing used `selectedPanel` cookie even when not in `allowedPanels` → could send owner-only user to `/staff`.
- `default_redirect` was used as-is → could send to a panel the user couldn’t access.
- Logout cleared only localStorage for `selectedPanel`/`intendedPanel`; cookies stayed → stale panel after re-login.
- Staff login always redirected to `/login`; no guard against rapid redirects.
- Login page could use `returnTo`/`next` for any panel regardless of which login API was used (owner vs staff).

**After**

- post-auth-landing only redirects to a panel path if that panel is in `allowedPanels`; `selectedPanel` is used only when it’s in `allowedPanels`, otherwise cleared.
- `default_redirect` is passed through `resolveLandingPathFromMe`; if its panel isn’t allowed, fallback to first allowed panel or `/choose-activity`.
- Logout clears `selectedPanel` and `intendedPanel` **cookies** as well (via `clearPanelCookiesOnLogout` in `clearLogoutState`).
- Staff login: returnTo is forced to staff-only; if we already redirected to `/login` recently, show message + link instead of redirecting again.
- Login page: owner/generic login never sends user to `/staff`; staff login never sends user to `/owner`.

---

## 4. Wrong-panel login handling

- **Owner-only user on staff login**  
  They use `/login?app=staff` (or `/staff/login` → `/login?app=staff`). After successful staff login API, if the backend rejects (e.g. no staff access), they get an error. If they had used `/login?next=%2Fowner` (no `app`), they’d use owner API and go to post-auth-landing, which now sends them only to allowed panels (e.g. `/owner/dashboard`), never to `/staff`.

- **Staff-only user on owner login**  
  They use `/login?next=%2Fowner` (or `/owner/login` → `/login?next=%2Fowner`). They use owner API. Backend may or may not allow; if it does, post-auth-landing uses `allowedPanels` and will send them to an allowed panel (e.g. `/staff` if they have staff), not to `/owner` if they don’t have owner.

- **Single deterministic rule**  
  - **Owner-only:** Only owner paths allowed; never redirect to `/staff`.  
  - **Staff-only:** Only staff paths allowed from staff login; never redirect to `/owner` from staff flow.  
  - **Both owner + staff:** Server `default_redirect` and `allowedPanels` decide; `selectedPanel` is only trusted when in `allowedPanels`.  
  - **Neither:** post-auth-landing falls back to `/choose-activity` or first allowed panel from server.

- **Fallback**  
  If panel cannot be resolved safely, we use `/choose-activity` (or first allowed panel) instead of bouncing between login pages.

---

## 5. Logout and panel-selection state

- **clearLogoutState()** (used by owner and staff logout pages):
  - Clears localStorage keys (including `selectedPanel`, `intendedPanel`, branch keys, etc.).
  - Clears **all** sessionStorage.
  - Calls **clearPanelCookiesOnLogout()**, which clears the **cookies** `selectedPanel` and `intendedPanel` (`path=/`, `max-age=0`).
- So after logout, no stale panel cookie can cause a redirect to the wrong panel on next login.

---

## 6. Manual test steps

**Owner login**

1. Open `http://localhost:3104/login?next=%2Fowner` (or `/owner/login` which redirects to `/login?next=/owner`).
2. Sign in with an **owner** account.
3. Expect: redirect to post-auth-landing, then to `/owner/dashboard` (or allowed owner path). No redirect to `/staff/login` or `/staff`.

**Staff login**

1. Open `http://localhost:3104/staff/login` (or `/login?app=staff&returnTo=/staff`).
2. Sign in with a **staff** (or owner-with-staff) account.
3. Expect: redirect to `/staff` (or `/staff/workspace`). No redirect to `/login?next=%2Fowner` in a loop.

**Logout**

1. From owner or staff, go to `/owner/logout` or `/staff/logout`.
2. Expect: “Signed out. Redirecting…” then redirect to `/owner/login` or `/staff/login` respectively.
3. In DevTools → Application → Cookies, confirm `selectedPanel` and `intendedPanel` are gone (or not set). In Application → Local Storage, confirm no `selectedPanel`/`intendedPanel`.

**Second login (after logout)**

1. After logout, go again to `http://localhost:3104/login?next=%2Fowner`.
2. Sign in with the same (or another) owner account.
3. Expect: same as first owner login; reach owner dashboard. No loop, no “second login doesn’t work”.

**Wrong-panel login**

1. Open `http://localhost:3104/login?next=%2Fowner`, sign in with a **staff-only** account (no owner).
2. Expect: post-auth-landing redirects to an allowed panel (e.g. `/staff` or `/choose-activity`), not to `/owner`.
3. Open `http://localhost:3104/staff/login` (so you get `/login?app=staff&returnTo=/staff`), sign in with an **owner-only** account (no staff).
2. Expect: backend may reject staff login; or if it accepts, post-auth or staff layout should not loop. No infinite bounce between `/login` and `/staff/login`.

**Both-role account**

1. Use an account that has both owner and staff.
2. Logout, then open `http://localhost:3104/login?next=%2Fowner` and sign in.
3. Expect: post-auth-landing sends to owner (e.g. `/owner/dashboard`) based on server `default_redirect`/`allowedPanels`.
4. Logout, then open `http://localhost:3104/staff/login`, sign in.
5. Expect: redirect to `/staff` (or staff workspace). No loop.

**Loop guard (staff)**

1. Simulate rapid redirects: e.g. go to `/staff/login`, then within a few seconds land on `/staff/login` again (e.g. from a test that redirects back).
2. Expect: after one redirect to `/login`, the second hit to `/staff/login` within ~6s shows “Too many redirects. Please sign in using the link below.” with a “Sign in for Staff” link, instead of redirecting again.

---

## Defensive guards in code

- **Never redirect from `/login` to `/staff/login`**  
  We don’t; the only way to get to `/staff/login` is from staff layout (auth failure) or direct navigation.

- **Never redirect from `/staff/login` to `/login` repeatedly**  
  Staff login has a 6s loop guard: if we already redirected to `/login` recently, we show a message and link instead of redirecting again.

- **Never reuse a stale `next` across panel changes**  
  Login page drops cross-panel targets (owner flow → no `/staff`; staff flow → no `/owner`). Staff login forces returnTo to staff-only. post-auth-landing ignores `selectedPanel` when it’s not in `allowedPanels`.

- **Middleware and page redirects**  
  Proxy only sends unauthenticated users to login pages; it does not decide owner vs staff. Panel choice is driven by auth/me and allowedPanels in post-auth-landing and by app/returnTo on the login page, so middleware and page-level redirects no longer conflict.
