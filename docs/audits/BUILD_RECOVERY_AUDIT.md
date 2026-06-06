# Build Recovery Audit — BPA Web (`bpa_web`)

**Date:** 2026-06-06  
**Branch:** `main` (up to date with `origin/main` at audit start)  
**Node:** v22.22.0  
**Next.js (installed):** 16.2.7 (`package.json`: `"next": "^16.1.6"`)  
**React:** 19.2.7  

---

## Executive summary

Production build, TypeScript typecheck, panel route manifests, and API connectivity **pass**.  
**Push blocked:** `npm run lint` fails with **2,180** pre-existing violations (1,098 errors, 1,082 warnings) under `--max-warnings 0`.

Root cause of Turbopack corruption is **concurrent multi-panel dev** (`dev:all`) writing to overlapping cache trees under a shared project root, combined with partial cache deletion. Fixes applied stabilize Turbopack root, tsconfig hygiene, ESLint TypeScript parsing, and add clean/validation scripts.

---

## Phase 1 — Root cause analysis

### A. Turbopack corruption

| Symptom | Finding |
|--------|---------|
| Missing `build-manifest.json` | Occurs when `.next` is partially deleted while a `next dev` process is still running, or when `dev:all` races on shared `node_modules/.cache` |
| Missing `routes-manifest.json` | Same — production build regenerates both under `.next/` after clean rebuild |
| Missing `[turbopack]_runtime.js` | Dev-only artifact under `.next/<SITE_MODE>/dev/`; stale when mode-specific `distDir` (`.next/admin`, etc.) is corrupted |
| "Persisting failed / write batch active" | Classic concurrent Turbopack writers: 8× `next dev` via `dev:all` on ports 3100–3107 with `distDir: .next/${SITE_MODE}` |

**Architecture:** `next.config.js` sets `distDir: process.env.SITE_MODE ? `.next/${process.env.SITE_MODE}` : ".next"`. Production `next build` uses unified `.next`. Dev modes isolate output but share repo root and Turbopack cache.

**Mitigation applied:**
- `turbopack.root: __dirname` in `next.config.js` (explicit workspace root for Turbopack)
- `scripts/clean-workspace.mjs` removes `.next`, legacy `.next-*`, and `node_modules/.cache`
- Document: run `npm run clean:workspace` before `npm run build` after `dev:all` sessions

### B. Workspace configuration

| Area | Status |
|------|--------|
| `next.config.js` | Single canonical config (no split `next.config.mjs`) |
| `SITE_MODE` + ports | 3100 mother, 3101 shop, 3102 clinic, 3103 admin, 3104 owner (webpack), 3105 producer, 3106 country, 3107 doctor — per `docs/BPA_STANDARD.md` |
| Multi-panel | All panels share one App Router tree; routing is path-prefix based (`/admin`, `/owner`, …) |
| `tsconfig.json` | Restored per `docs/TYPESCRIPT_GENERATED_ARTIFACTS.md`: no `.next/**` in `include`; explicit `exclude` for `.next` and `.next-*` |

### C. Dependency integrity

| Package | Version | Notes |
|---------|---------|-------|
| `next` | 16.2.7 | Resolves from `^16.1.6` |
| `react` / `react-dom` | 19.2.7 | Peer warnings from `react-leaflet` (^18) — non-blocking |
| `jsvectormap` | **1.3.2** (pinned) | Prior caret resolved to 1.7.0 and broke map imports — already fixed on main |
| `typescript` | 5.7.2 | In `dependencies` for `npm ci --omit=dev` builds |
| Node | 22.x | Compatible with Next 16 |

`.npmrc`: `legacy-peer-deps=true`

### D. API integration

| Check | Result |
|-------|--------|
| Backend on `:3000` | **Reachable** — returns JSON (not connection refused) |
| `GET /api/v1/auth/me` | **401** `Unauthorized: token missing` — expected without session cookie |
| Proxy route | `app/api/v1/[[...path]]/route.js` forwards to `API_TARGET` (default `http://localhost:3000`) |
| Rewrites | `next.config.js` rewrites `/api/v1/*` to backend |
| Auth gate | `proxy.ts` (Next 16 middleware replacement) protects dashboard paths |

Note: No dedicated `/api/v1/health` route on backend; connectivity verified via auth endpoint.

---

## Phase 2 — Clean rebuild

Steps executed:

1. `node scripts/clean-workspace.mjs` — removed `.next`
2. `npm install --include=dev`
3. `npm run build` — success (395 routes)
4. Post-build manifests verified present:
   - `.next/build-manifest.json`
   - `.next/routes-manifest.json`
   - `.next/app-path-routes-manifest.json`

---

## Phase 3 — Fixes applied (this audit)

| File | Change |
|------|--------|
| `next.config.js` | Added `turbopack.root: __dirname` |
| `eslint.config.mjs` | Switched to `eslint-config-next/core-web-vitals` (fixes TypeScript parsing; was 3,890 parse errors) |
| `tsconfig.json` | Removed per-mode `.next/*/types` includes; strengthened `.next` exclude |
| `package.json` | Added `typecheck`, `clean:workspace`, `validate:build`, `validate:panels` scripts |
| `scripts/clean-workspace.mjs` | **NEW** — safe cache wipe for all SITE_MODE dirs |
| `scripts/validate-panel-routes.mjs` | **NEW** — validates panels from build manifest (UTF-8/UTF-16 safe) |

**Not changed:** Panel routing, proxy logic, auth flows — already correct on `main`.

---

## Phase 4 — Validation results

| Command | Exit | Result |
|---------|------|--------|
| `npm run typecheck` | **0** | Pass |
| `npm run build` | **0** | Pass — 395 routes, ~104s compile + ~79s TS |
| `npm run validate:panels` | **0** | All 8 panels + login routes + manifests OK |
| `npm run validate:build` | **0** | Path aliases, jsvectormap 1.3.2 maps, prod deps OK |
| `npm run lint` | **1** | **FAIL** — 2,180 problems (1,098 errors, 1,082 warnings) |

### Panel route validation (`validate:panels`)

| Panel | Status |
|-------|--------|
| Admin | OK |
| Owner | OK |
| Clinic | OK |
| Doctor | OK |
| Producer | OK |
| Country | OK |
| Mother | OK |
| Shop | OK |

Login routes verified: `/admin/login`, `/owner/login`, `/clinic/login`, `/doctor/login`, `/producer/login`, `/country/login`, `/shop/login`, `/auth/login`.

### Lint blocker detail

After ESLint config repair, **parse errors dropped from ~3,890 to ~1**. Remaining debt is rule violations across `src/larkon-admin`, `app`, and shared components — predominantly:

- `react-hooks/set-state-in-effect` (React 19 strict hooks plugin)
- `@next/next/no-img-element`
- Legacy `react/prop-types` disable directives in Larkon template code

Per `docs/I18N_PHASE3_SUMMARY.md`, lint was previously known to exit 1. Full lint cleanup is **out of scope** for this build-recovery audit but **blocks push** per mission criteria.

### Runtime panel boot

Full `dev:all` (8 concurrent dev servers) was **not** re-run in this audit to avoid reintroducing Turbopack races. Production build + manifest validation is the authoritative check for route registration. Recommend: after `clean:workspace`, start individual panels (`npm run dev:admin`, etc.) rather than `dev:all` when debugging Turbopack issues.

---

## Phase 6 — Commit / push decision

**NOT COMMITTED. NOT PUSHED.**

Reason: `npm run lint` failed (`--max-warnings 0`).

When lint debt is resolved or lint scope is agreed with the team, run:

```bash
npm run clean:workspace
npm run lint
npm run typecheck
npm run build
npm run validate:panels
npm run validate:build
git add .
git commit -m "fix: recover workspace build stability and production readiness"
git push origin main
```

---

## Remaining risks

1. **Lint debt** — CI or pre-push hooks requiring lint will fail until addressed.
2. **`dev:all`** — still risks Turbopack cache corruption; prefer single-panel dev or clean between sessions.
3. **`validate:production-build.mjs`** runs `npm ci --omit=dev` (destructive to devDependencies until `npm install --include=dev`).
4. **Next auto-edits `tsconfig.json`** during build (suggests adding `.next/types`); committed tsconfig intentionally omits these per project policy.

---

**Audit completed:** 2026-06-06
