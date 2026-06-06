# Local Development Stabilization Report

**Date:** 2026-06-07  
**Scope:** `bpa_web` only — no backend, VPS, or production API changes  
**Local setup:** `npm run dev:all` (ports 3100–3107)  
**API target:** Production via same-origin Next.js proxy → `https://api.bangladeshpetassociation.com`

---

## Summary

Local development now routes all panel auth and API traffic through the existing `/api/v1/*` Next.js proxy layer. Clinic CRUD pages no longer call dead `/api/clinic/*` handlers. Five panels gained dedicated logout routes. Producer login uses the producer-specific endpoint. Edge protection (`proxy.ts`) covers producer and doctor panels with correct `app=` login redirects for shop and clinic.

---

## Files Changed

### Stabilization (this task)

| File | Change |
|------|--------|
| `app/clinic/discounts/page.tsx` | `/api/clinic/*` → `/api/v1/clinic/*`; added `credentials: "include"` on all fetches |
| `app/clinic/billing-management/page.tsx` | Same path + credentials fix |
| `app/clinic/settlements/page.tsx` | Same path + credentials fix |
| `app/clinic/contracts/page.tsx` | Same path + credentials fix |
| `app/shop/logout/page.jsx` | **New** — logout → `/login?app=shop` |
| `app/clinic/logout/page.jsx` | **New** — logout → `/login?app=clinic` |
| `app/producer/logout/page.jsx` | **New** — logout → `/login?app=producer`; clears producer me cache |
| `app/country/logout/page.jsx` | **New** — logout → `/country/login` |
| `app/doctor/logout/page.jsx` | **New** — logout → `/login?app=doctor` |
| `lib/authHelpers.ts` | Public paths: `/shop/logout`, `/clinic/logout`, `/producer/logout`, `/country/logout`, `/doctor/logout`, `/doctor/login` |
| `proxy.ts` | Auth guard for `/producer/*`, `/doctor/*`; shop/clinic unauth redirect with `app=shop` / `app=clinic`; matcher extended |
| `app/login/page.jsx` | Producer flow: `POST /api/v1/producer/auth/login`; redirect to `/producer/dashboard`; `isProtectedPath` includes producer/doctor |

### Prior same-origin auth migration (same branch)

| File | Change |
|------|--------|
| `lib/authRedirect.ts` | `buildAuthUrl()` always same-origin `/login?app=…` |
| `src/bpa/components/AuthRedirectPage.tsx` | Uses same-origin login |
| `app/auth/login/page.tsx`, `app/owner/login/page.tsx`, `app/register/page.jsx` | Panel-aware login URLs |
| `src/lib/useMe.ts`, `src/bpa/lib/useMe.js`, `src/lib/apiFetch.js`, `src/bpa/apiClient.js` | Empty browser API base (proxy) |
| Owner/location/KYC files | Browser `API_BASE = ""` for same-origin |
| `.env.local` (gitignored) | `API_BASE_URL` → production API |

---

## Routes Fixed

### Clinic CRUD — proxy path correction

All clinic enterprise pages now hit the Next.js catch-all proxy instead of non-existent local `/api/clinic/*` routes.

| Page | Method | Fixed endpoint |
|------|--------|----------------|
| Discounts — policies | GET, POST, PUT | `/api/v1/clinic/discounts/policies` (+ `/:id`) |
| Discounts — cards | GET, POST, PUT | `/api/v1/clinic/discounts/cards` (+ `/:id`) |
| Discounts — suspend | POST | `/api/v1/clinic/discounts/cards/:id/suspend` |
| Billing — records | GET | `/api/v1/clinic/billing/records` |
| Billing — refunds | GET | `/api/v1/clinic/billing/refunds` |
| Billing — discount usage | GET | `/api/v1/clinic/billing/discounts` |
| Billing — process refund | POST | `/api/v1/clinic/billing/:id/refund` |
| Settlements — summary | GET | `/api/v1/clinic/settlements/summary?period=` |
| Settlements — records | GET | `/api/v1/clinic/settlements/records?period=` |
| Settlements — adjustments list | GET | `/api/v1/clinic/settlements/adjustments` |
| Settlements — process | POST | `/api/v1/clinic/settlements/:id/process` |
| Settlements — create adjustment | POST | `/api/v1/clinic/settlements/:id/adjustments` |
| Contracts | GET, POST, PUT | `/api/v1/clinic/contracts` (+ `/:id`) |

**Total:** 19 fetch call sites across 4 pages.

### Logout routes (new)

| Panel | Port | Logout URL | Post-logout redirect |
|-------|------|------------|----------------------|
| Shop | 3101 | `/shop/logout` | `/login?app=shop&returnTo=…` |
| Clinic | 3102 | `/clinic/logout` | `/login?app=clinic&returnTo=…` |
| Producer | 3105 | `/producer/logout` | `/login?app=producer&returnTo=…` |
| Country | 3106 | `/country/logout` | `/country/login` |
| Doctor | 3107 | `/doctor/logout` | `/login?app=doctor&returnTo=…` |

Logout sequence (all panels): `POST /api/v1/auth/logout` → optional panel-specific logout → `POST /api/logout` → `clearLogoutState()` → redirect.

### Edge proxy (`proxy.ts`)

| Route prefix | Unauthenticated redirect |
|--------------|----------------------------|
| `/shop/*` | `/login?app=shop&next=…` |
| `/clinic/*` | `/login?app=clinic&next=…` |
| `/producer/*` | `/login?app=producer&next=…` |
| `/doctor/*` | `/login?app=doctor&next=…` |

Matcher now includes `/producer/:path*` and `/doctor/:path*`.

---

## Login Flows Fixed

| Panel | Port | Entry | Login API | Notes |
|-------|------|-------|-----------|-------|
| Mother | 3100 | `/login` | `/api/v1/auth/login` | Default |
| Shop | 3101 | `/login?app=shop` | `/api/v1/auth/login` | Proxy preserves `app=shop` |
| Clinic | 3102 | `/login?app=clinic` | `/api/v1/auth/login` | Proxy preserves `app=clinic` |
| Admin | 3103 | `/admin/login` → `/login?app=admin` | `/api/v1/admin/auth/login` | Whitelist may block `/admin/auth/me` |
| Owner | 3104 | `/owner/login` | `/api/v1/auth/login` | `app=owner` on shared login |
| Producer | 3105 | `/login?app=producer` | **`/api/v1/producer/auth/login`** | Redirect → `/producer/dashboard` |
| Country | 3106 | `/country/login` | `/api/v1/auth/login` | Dedicated country login page |
| Doctor | 3107 | `/login?app=doctor` | `/api/v1/doctor/auth/login` | Uses `redirectPath` from API |

**Producer-specific change:** When `app=producer`, return URL contains `/producer`, or port is 3105, login posts to `/api/v1/producer/auth/login` instead of generic `/api/v1/auth/login`.

**Same-origin rule:** Browser never calls `https://api.bangladeshpetassociation.com` directly (avoids CORS). Server-side proxy in `app/api/v1/[[...path]]/route.js` forwards to production.

---

## CRUD Endpoints Fixed

### What was broken

- Pages called `/api/clinic/...` which has **no Next.js route handler** → local 404, never reached production.
- Fetch calls omitted `credentials: "include"` → session cookies not sent through proxy on some requests.

### What is fixed (frontend)

- All clinic enterprise fetches use `/api/v1/clinic/...` with `credentials: "include"`.
- Requests now flow: browser → same-origin proxy → production API.

### Production API shape (limitation — not changed in this task)

Production clinic routes are **branch-scoped** under `/api/v1/clinic/branches/:branchId/...` (see `backend-api/src/api/v1/modules/clinic/clinic.routes.ts`). The clinic panel pages use **flat** paths such as `/api/v1/clinic/contracts` without `branchId`. Those flat routes are **not registered** on the production API today.

**Expected behavior after this fix:**

| Scenario | Result |
|----------|--------|
| Before (wrong path) | Next.js 404 — proxy never invoked |
| After (correct proxy path) | Production responds — likely **404 or 403** until pages are wired to branch-scoped routes or backend adds panel-level aggregates |

Clinic operational CRUD under `/staff/branch/:branchId/clinic/...` (staff panel) uses correct branch-scoped APIs and is unaffected.

---

## Panel Verification Matrix

| Panel | Auth via proxy | Logout page | Edge guard | CRUD via proxy |
|-------|----------------|-------------|------------|----------------|
| Mother (3100) | Yes | Uses shared `/login` | N/A (public landing) | Limited UI |
| Shop (3101) | Yes | **Added** | Yes + `app=shop` | Dashboard mostly static |
| Clinic (3102) | Yes | **Added** | Yes + `app=clinic` | Enterprise pages proxied; API path mismatch remains |
| Admin (3103) | Yes | Existing | Yes | Full; whitelist on `/admin/auth/me` |
| Owner (3104) | Yes | Existing | Yes | Full owner APIs |
| Producer (3105) | Yes | **Added** | **Added** | Producer APIs + dedicated login |
| Country (3106) | Yes | **Added** | Yes | Dashboard mostly static |
| Doctor (3107) | Yes | **Added** | **Added** | Doctor APIs |

---

## Remaining Production Limitations

These are **environment or backend constraints**, not fixable in `bpa_web` alone per task rules:

1. **Admin IP/email whitelist** — `/api/v1/admin/auth/me` may return 403 for local dev accounts not on production whitelist.
2. **Clinic flat vs branch-scoped API** — Enterprise clinic pages (`/clinic/discounts`, `/billing-management`, `/settlements`, `/contracts`) need either branch context in the frontend or new aggregate routes on the API (backend change — out of scope).
3. **Live production data** — Authenticated local dev mutates real production DB; use test accounts only.
4. **Static dashboards** — Shop, country, and some admin landing views are placeholders without full CRUD.
5. **WebSockets / real-time** — Doctor socket and notifications should be validated separately; may need same-origin or env tuning.
6. **Country logout UX** — Redirects to `/country/login` rather than `/login?app=country` (consistent with existing country login page pattern).
7. **Nav logout links** — Logout pages exist; individual panel sidebars may still need links wired to `/shop/logout`, etc.
8. **CORS** — Irrelevant for proxied `/api/v1/*`; still blocks any accidental direct browser calls to production origin.

---

## Manual Test Checklist

Run from `bpa_web`:

```bash
npm run dev:all
```

For each panel (3100–3107):

1. Open protected route while logged out → correct login redirect with `app=` where applicable.
2. Log in with production credentials → cookie set on localhost port.
3. Call `/api/v1/<panel>/auth/me` or equivalent → 200 (or expected 403 for admin whitelist).
4. Exercise one CRUD or data load action.
5. Visit `/<panel>/logout` → session cleared → login page.

Clinic-specific:

- Open `http://localhost:3102/clinic/discounts` (etc.) → Network tab shows `/api/v1/clinic/...` (not `/api/clinic/...`) with cookies.
- Confirm response is from production (401/403/404/200), not Next.js 404.

---

## Related Docs

- `docs/audits/LOCAL_DEV_PRODUCTION_API_CONFIG.md` — `.env.local` and proxy env setup
- `docs/audits/SAME_ORIGIN_AUTH_MIGRATION_REPORT.md` — Auth redirect and API base migration

---

## Constraints Honored

| Rule | Status |
|------|--------|
| No backend changes | ✓ |
| No VPS changes | ✓ |
| No production API changes | ✓ |
| All API via `/api/v1/*` proxy | ✓ |
| Fixed ports 3100–3107 | ✓ |
