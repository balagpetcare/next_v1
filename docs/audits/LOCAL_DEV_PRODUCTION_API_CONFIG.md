# Local Development Against Production API — Configuration Report

**Date:** 2026-06-07  
**Scope:** `bpa_web` only (no backend or VPS changes)  
**Target API:** `https://api.bangladeshpetassociation.com`

---

## Summary

Local panels run via `npm run dev:all` on ports **3100–3107**. API traffic is routed to the production backend through:

1. **Environment variables** in `.env.local` (primary configuration)
2. **Next.js rewrites** (`next.config.js` → `fallback: /api/v1/*`)
3. **Route handler proxy** (`app/api/v1/[[...path]]/route.js`)
4. **Shared client helpers** that use same-origin `/api/v1` in the browser (`lib/api.ts`, `lib/constants.ts`, `getBrowserSafeApiBase()`)

---

## Files Changed

| File | Previous | New | Purpose |
|------|----------|-----|---------|
| `.env.local` | *(missing — no env file)* | `API_BASE_URL`, `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_AUTH_BASE_URL` = `https://api.bangladeshpetassociation.com` | Central local-dev config for all panels |
| `lib/useDoctorSocket.ts` | Browser socket used `window.location.origin` (localhost:3107) | Browser socket uses `NEXT_PUBLIC_API_BASE_URL` when set, else `window.location.origin` | Doctor panel real-time features must reach production API, not local Next |

---

## Environment Variables Applied

```env
API_BASE_URL=https://api.bangladeshpetassociation.com
NEXT_PUBLIC_API_BASE_URL=https://api.bangladeshpetassociation.com
NEXT_PUBLIC_AUTH_BASE_URL=https://api.bangladeshpetassociation.com
```

### Resolution chain (unchanged code paths)

| Layer | Env vars read | Fallback (when env unset) |
|-------|---------------|---------------------------|
| `next.config.js` rewrites | `API_BASE_URL` → `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:3000` |
| `app/api/v1/[[...path]]/route.js` | same | `http://localhost:3000` |
| `app/api/proxy/producer-print/**` | `API_BASE_URL` | `http://localhost:3000` |
| `lib/api.ts`, `lib/constants.ts` (browser) | same-origin `""` → local `/api/v1` proxy | N/A |
| `lib/api.ts`, `lib/constants.ts` (SSR) | `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:3000` |
| `lib/authRedirect.ts` | `NEXT_PUBLIC_AUTH_BASE_URL` | `http://localhost:3000` |
| `lib/useNotifications.ts` (Socket.IO) | `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:3000` |
| `lib/useDoctorSocket.ts` (Socket.IO) | `NEXT_PUBLIC_API_BASE_URL` | `window.location.origin` / `http://localhost:3000` |
| `scripts/deployment/panel-registry.cjs` (PM2 prod) | `API_BASE_URL` | `https://api.bangladeshpetassociation.com` |

---

## Panel Verification Matrix (`npm run dev:all`)

| Panel | Port | Dev script | SITE_MODE | API path |
|-------|------|------------|-----------|----------|
| Staff / Mother | 3100 | `dev:mother` | `mother` | Same-origin `/api/v1/*` → production |
| Shop | 3101 | `dev:shop` | `shop` | Same |
| Clinic | 3102 | `dev:clinic` | `clinic` | Same |
| Admin | 3103 | `dev:admin` | `admin` | Same (+ `AUTH_COOKIE_NAME` at runtime in prod only) |
| Owner | 3104 | `dev:owner` | `owner` | Same |
| Producer | 3105 | `dev:producer` | `producer` | Same |
| Country | 3106 | `dev:country` | `country` | Same |
| Doctor | 3107 | `dev:doctor` | `doctor` | Same + Socket.IO → production |

**Quick check after `npm run dev:all`:** DevTools → Network → any `/api/v1/...` request → Response headers or proxy logs should show backend at `api.bangladeshpetassociation.com` (not `localhost:3000`).

---

## Configuration Inventory (no code changes required)

### Primary env vars searched

- `NEXT_PUBLIC_API_BASE_URL` — 50+ references; SSR + direct client modules
- `NEXT_PUBLIC_AUTH_BASE_URL` — `lib/authRedirect.ts`
- `API_BASE_URL` — server proxy routes, `next.config.js`
- `API_URL` / `BASE_URL` — not used as standalone API config in `bpa_web`

### HTTP clients

- **No `axios.create()`** in the repo
- **`fetch()`** — widespread; most panel code uses `lib/api.ts` or same-origin `/api/v1`
- **Socket.IO** — `lib/useNotifications.ts`, `lib/useDoctorSocket.ts`

### Middleware / auth

- **`proxy.ts`** (Next.js 16 proxy, replaces middleware) — route guards and redirects only; **no API base URL**
- **`lib/authHelpers.ts`** — cookie/session checks for proxy
- **`lib/authRedirect.ts`** — central auth URL builder, returnTo validation
- **Auth providers** — Admin uses cookie auth; Larkon `SessionProvider` is a stub (not next-auth in production)

### Hardcoded localhost fallbacks

~55 source files default to `http://localhost:3000` when env is **unset**. With `.env.local` present, runtime/build reads production URL for all `NEXT_PUBLIC_*` and `API_BASE_URL` consumers.

---

## Risks: Production API from Local Development

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Live production data** | High | All reads/writes hit real DB; avoid destructive tests |
| **CORS on direct browser calls** | Medium | Modules that call `NEXT_PUBLIC_API_BASE_URL` directly in the browser (location pickers, `register/page.jsx` invite `apiGet`, `src/lib/apiFetch.js`) need production `CORS_ORIGINS` to include `http://localhost:3100`–`3107`. Same-origin `/api/v1` proxy avoids CORS for most flows |
| **Auth cookies** | Medium | Panel `/login` uses same-origin proxy; cookies scoped to `localhost:310x`. Production auth UI (`NEXT_PUBLIC_AUTH_BASE_URL`) sets cookies on API domain — may not carry to localhost after redirect |
| **Rate limits / abuse** | Medium | Shared production infra; throttle manual testing |
| **Secrets in network tab** | Low | Use non-production test accounts only |
| **WebSocket** | Low | Doctor/notifications connect to production; requires valid token and production socket endpoint |
| **File uploads** | Medium | Large uploads go through proxy to production storage |
| **No local API offline** | Low | Backend outage blocks all local UI testing |

---

## How to Run

```bash
cd bpa_web
npm run dev:all
```

Panels: `http://localhost:3100` (staff/mother) through `http://localhost:3107` (doctor).

To revert to local backend API, remove or comment out `.env.local` and restart dev servers.

---

## Not Modified (per requirements)

- `backend-api` — no changes
- VPS / PM2 / nginx — no changes
- Individual page-level localhost fallbacks — unchanged; overridden by `.env.local`
