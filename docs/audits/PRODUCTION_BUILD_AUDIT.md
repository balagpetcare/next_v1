# Production Build Audit — BPA Web

**Date:** 2026-06-06  
**Project:** `D:\BPA_Data\bpa_web`  
**Stack:** Next.js 16.2.7 · React 19.2.7 · Node v22.22.0 · TypeScript 5.7.2  
**Audit type:** Read-only (no code changes)

---

## Executive summary

| Gate | Command | Result | Notes |
|------|---------|--------|-------|
| Install | `npm install` | **PASS** | 638 packages |
| Lint | `npm run lint` | **PASS** | `--max-warnings 0`, ~4.4 min |
| Typecheck | `npm run typecheck` | **PASS** (after clean build) | **FAIL** on dirty tree — see Issue #1 |
| Production build | `npm run build` | **PASS** | 395 routes, exit 0, ~5 min total |
| Panel manifests | `npm run validate:panels` | **PASS** | All 8 panels + login routes |
| Prod dep simulation | `npm run validate:build` | **FAIL** | SWC binary locked post-build — Issue #5 |

**Overall:** Production **build succeeds** today. **Deployment readiness is conditional** on env configuration, image domains, tsconfig hygiene, and resolving tracked lint/security debt.

There is **no** `type-check` npm script; use `npm run typecheck` or `npx tsc --noEmit`.

---

## Validation run log

### 1. `npm install`
- Exit 0, dependencies up to date.
- `legacy-peer-deps=true` in `.npmrc` suppresses peer resolution failures.

### 2. `npm run lint`
- Exit 0.
- Config: `eslint.config.mjs` → `eslint-config-next/core-web-vitals` with production policy overrides.
- Legacy paths excluded: `src/larkon-admin/**`, `src/larkon-ui/**`, `_vendor_templates/**`.
- React 19 hooks strict rules and styling rules disabled (tracked debt — see `docs/audits/LINT_CLASSIFICATION_REPORT.md`).

### 3. `npm run typecheck`
**First run (before clean):** Exit 2 — corrupt/stale generated types:

```
.next/owner/dev/types/routes.d.ts(777,2): error TS1434: Unexpected keyword or identifier.
```

**After `node scripts/clean-workspace.mjs` + `npm run build`:** Exit 0.

### 4. `npm run build`
- Next.js 16.2.7 (Turbopack).
- Experiment: `turbopackClientSideNestedAsyncChunking: true`.
- Compiled ~2.4 min; internal TypeScript ~120 s.
- **395 / 395** static pages generated.
- Artifacts: `.next/build-manifest.json`, `.next/routes-manifest.json`, `.next/app-path-routes-manifest.json`.

### 5. `npm run validate:panels`
- All panels present: Admin, Owner, Clinic, Doctor, Producer, Country, Mother, Shop.
- Login routes: `/admin/login`, `/owner/login`, … `/auth/login`.

### 6. `npm run validate:build`
- Exit 1 during `npm ci --omit=dev` — `@next/swc-win32-x64-msvc` `.node` file in use (likely post-build lock / AV).

---

## Architecture snapshot

### Multi-panel (SITE_MODE)

| Panel | Dev port | `distDir` (dev) |
|-------|----------|-----------------|
| Mother | 3100 | `.next/mother` |
| Shop | 3101 | `.next/shop` |
| Clinic | 3102 | `.next/clinic` |
| Admin | 3103 | `.next/admin` |
| Owner | 3104 | `.next/owner` (webpack) |
| Producer | 3105 | `.next/producer` |
| Country | 3106 | `.next/country` |
| Doctor | 3107 | `.next/doctor` |

Production `next build` uses unified `.next` (no `SITE_MODE`). All panels share one App Router tree with path prefixes (`/admin`, `/owner`, …).

**Risk:** `dev:all` runs 8 concurrent `next dev` processes → Turbopack cache races, missing manifests, ENOTEMPTY on cleanup. Use single-panel dev or `clean:workspace` between sessions.

### Config files

| File | Role | Status |
|------|------|--------|
| `next.config.js` | Canonical Next config (redirects, rewrites, aliases, images) | Readable; `turbopack.root: __dirname` set |
| `tsconfig.json` | TS project + path aliases `@/*`, `@larkon/*`, `@larkon-ui/*` | **Issue #1** — include/exclude conflict |
| `eslint.config.mjs` | Flat ESLint, production lint policy | OK |
| `postcss.config.js` | tailwindcss + autoprefixer | OK |
| `tailwind.config.js` | Tailwind content paths | OK |
| `proxy.ts` | Auth gate (Next 16 middleware replacement) | OK |
| `.env.example` | Documented env vars | No committed `.env` (expected) |

### Source composition

| Extension | Count (excl. node_modules, .next) |
|-----------|-----------------------------------|
| `.js` / `.jsx` | ~795 |
| `.ts` / `.tsx` | ~1,926 |
| Layout files | 57 under `app/` |

**Note:** `tsconfig.json` has `allowJs: false` and includes only `**/*.ts` / `**/*.tsx`. Standalone `tsc` does **not** typecheck ~795 JS/JSX files. Next.js internal TS pass during `next build` covers the app pipeline.

### Path aliases

- Webpack + Turbopack: `@larkon` → `src/larkon-admin`, `@larkon-ui` → `src/larkon-ui`.
- Validated by `scripts/validate-path-aliases.mjs` (VectorMap, LkInput).

### Dynamic imports

Heavy use of `next/dynamic` with `{ ssr: false }` for charts (`react-apexcharts`), maps, Larkon form widgets, admin demo pages. Pattern is consistent; no build failures observed.

### API integration

| Layer | File | Backend target |
|-------|------|----------------|
| Route handler proxy | `app/api/v1/[[...path]]/route.js` | `API_BASE_URL` → `NEXT_PUBLIC_API_BASE_URL` → `http://localhost:3000` |
| Rewrite fallback | `next.config.js` `rewrites().fallback` | Same resolution + guard against ports 3100–3107 |
| Client fetch | `src/bpa/apiClient.js`, many panel pages | Same-origin `/api/v1/*` |

Misconfigured env pointing at a Next panel port (3100–3107) is **auto-corrected** to `:3000` in both proxy and config.

### Image configuration

```288:297:next.config.js
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/api/v1/files/**",
      },
    ],
  },
```

Production API hostnames are **not** listed — `next/image` will reject remote API images unless patterns are extended (Issue #7).

### Environment variables (from `.env.example`)

| Variable | Purpose | Required in prod |
|----------|---------|------------------|
| `NEXT_PUBLIC_API_BASE_URL` | API proxy target | **Yes** |
| `API_BASE_URL` | Server-only override | Optional |
| `NEXT_PUBLIC_AUTH_BASE_URL` | Auth flows | **Yes** |
| `AUTH_COOKIE_NAME` / `NEXT_PUBLIC_AUTH_COOKIE_NAME` | Session cookie | **Yes** |
| `NEXT_PUBLIC_SITE_URL` | SEO / canonical URLs | **Yes** |
| `NEXT_PUBLIC_DEFAULT_PANEL` | Panel routing hints | Recommended |
| Analytics / OAuth / Maps keys | Optional features | As needed |

No `.env` committed — VPS must supply values at deploy time.

---

## Issues found

### Issue #1 — `tsconfig.json` include/exclude conflict (HIGH)

**Symptoms:** `npm run typecheck` fails with parse errors in `.next/owner/dev/types/routes.d.ts` when stale dev caches exist.

**Root cause:** `include` lists per-mode `.next/*/types/**` and `.next/*/dev/types/**` while `exclude` lists `.next` and `.next/**`. TypeScript can still pick up **stale dev-mode** generated files from prior `dev:owner` / `dev:all` sessions. Contradicts project policy in `docs/TYPESCRIPT_GENERATED_ARTIFACTS.md`.

**Files:**
- `tsconfig.json` (lines 38–75)

**Fix plan:**
1. Remove all explicit `.next/**` entries from `include`; keep only `next-env.d.ts`, `**/*.ts`, `**/*.tsx`.
2. Keep `exclude` for `.next`, `.next/**`, and legacy `.next-*` dirs.
3. Document CI order: `clean:workspace` → `build` → `typecheck` (or typecheck only after fresh build).
4. Do **not** rely on standalone `tsc` for generated route types.

---

### Issue #2 — Standalone TypeScript skips JS/JSX sources (MEDIUM)

**Symptoms:** ~795 `.js`/`.jsx` files are outside `tsc` scope (`allowJs: false`).

**Root cause:** Migration-in-progress codebase; many staff/owner POS and legacy panels remain JSX.

**Files:** Widespread under `app/`, `src/`, `lib/`, `components/`.

**Fix plan:**
1. Short term: rely on `next build` internal TS + ESLint for JS files.
2. Medium term: migrate hot paths (POS, auth, inventory) to `.tsx`.
3. Optional: add `"allowJs": true` with incremental strictness (coordinate with `TYPESCRIPT_REMAINING_DEBT.md`).

---

### Issue #3 — ESLint policy masks tracked debt (MEDIUM)

**Symptoms:** Baseline ~2,180 violations; current lint passes with many rules set to `off`.

**Root cause:** React 19 `eslint-plugin-react-hooks` v7 strict rules + Larkon template + `<img>` usage.

**Files:**
- `eslint.config.mjs`
- See `docs/audits/LINT_CLASSIFICATION_REPORT.md`

**Fix plan:**
1. Keep current policy for CI green.
2. Add optional `lint:strict` script (future) re-enabling rules incrementally.
3. Fix critical rules only (`rules-of-hooks`, `jsx-no-undef`, `jsx-key`) as files are touched.

---

### Issue #4 — `dev:all` / multi-`distDir` Turbopack instability (MEDIUM)

**Symptoms:** Missing `build-manifest.json`, `[turbopack]_runtime.js`, ENOTEMPTY, D: drive I/O errors under load.

**Root cause:** Eight concurrent `next dev` processes sharing repo root and `node_modules/.cache` with separate `distDir`.

**Files:**
- `package.json` (`dev:all`, `dev:*` scripts)
- `next.config.js` (`distDir: .next/${SITE_MODE}`)
- `scripts/clean-workspace.mjs`

**Fix plan:**
1. Avoid `dev:all` for daily work; use single-panel dev.
2. Run `npm run clean:workspace` before production builds after multi-panel dev.
3. Document in onboarding / `docs/BPA_STANDARD.md`.

---

### Issue #5 — `validate:production-build.mjs` fails when SWC locked (LOW)

**Symptoms:** `npm run validate:build` → `npm ci --omit=dev` fails with OS rejection on `next-swc.win32-x64-msvc.node`.

**Root cause:** Script runs destructive `npm ci` while build artifacts or AV hold native binaries.

**Files:**
- `scripts/validate-production-build.mjs`

**Fix plan:**
1. Run `validate:build` on clean CI agent **before** `next build`, not after.
2. Or replace `npm ci` with non-destructive `npm ls` / resolve checks when run post-build.
3. Exclude `node_modules/@next/swc-*` from AV real-time scan on dev machines.

---

### Issue #6 — npm audit vulnerabilities (MEDIUM)

**Findings:** 4 vulnerabilities (2 low, 2 moderate). Notable:

- **quill** (via `react-quill-new`) — XSS in HTML export ([GHSA-v3m3-f69x-jf25](https://github.com/advisories/GHSA-v3m3-f69x-jf25)).
- Additional low/moderate in transitive deps (see `npm audit`).

**Files:**
- `package.json` → `react-quill-new@^3.8.3`

**Fix plan:**
1. Audit all `react-quill-new` usage; sanitize HTML or disable HTML export in admin editors.
2. Evaluate downgrade/patch per advisory; avoid blind `npm audit fix --force`.
3. Add CSP headers at reverse proxy for production.

---

### Issue #7 — Production image domains not configured (MEDIUM)

**Symptoms:** `next/image` only allows `http://localhost:3000/api/v1/files/**`.

**Root cause:** Dev-centric `remotePatterns` in `next.config.js`.

**Files:**
- `next.config.js` (`images.remotePatterns`)

**Fix plan:**
1. Add production API hostname(s) via env-driven config (e.g. read `NEXT_PUBLIC_API_BASE_URL` hostname at build time).
2. Include HTTPS pattern for production.
3. Verify KYC/upload flows using `next/image` on staging.

---

### Issue #8 — Peer dependency mismatch: `react-leaflet` (LOW)

**Symptoms:** `react-leaflet@4.x` expects React 18; project uses React 19.2.7.

**Root cause:** `legacy-peer-deps=true` in `.npmrc`.

**Files:**
- `package.json` → `react-leaflet`
- `.npmrc`

**Fix plan:**
1. Monitor map components (`MapLocationPicker`, staff/owner location pickers) in QA.
2. Upgrade to `react-leaflet@5` when stable with React 19, or pin React 18 LTS if issues appear.

---

### Issue #9 — Pinned vs floating versions (LOW)

| Package | Declared | Installed | Risk |
|---------|----------|-----------|------|
| `next` | `^16.1.6` | 16.2.7 | Minor drift within major |
| `jsvectormap` | `1.3.2` (exact) | 1.3.2 | **Correctly pinned** — caret previously broke map imports |
| `eslint-config-next` | `^16.1.1` | 16.2.7 | Aligned with Next |

**Fix plan:** Pin `next` to exact version in production lockfile review; keep `jsvectormap` exact.

---

### Issue #10 — Historical D: drive filesystem instability (INFO)

Prior sessions recorded `UNKNOWN` read/fsync errors on `next.config.js` and `node_modules` renames. **This audit completed successfully** after clean workspace — no recurrence during build. Monitor if ENOTEMPTY returns after `dev:all`.

**Fix plan:** Run elevated `chkdsk D: /F` if errors recur; prefer cloning to `C:` for CI if drive remains flaky.

---

## Missing / unused dependencies

### Build-critical deps (verified in `dependencies`, not devDependencies)

| Package | Purpose |
|---------|---------|
| `tailwindcss`, `postcss`, `autoprefixer` | CSS pipeline |
| `typescript` | `next build` TS pass |
| `sass` | Larkon SCSS |

Correct placement for `npm ci --omit=dev` production installs.

### Not audited exhaustively

Unused dependency detection (`depcheck`) was **not** run in this pass to avoid modifying lockfile state. Recommend periodic `npx depcheck` on CI.

### Known required imports validated

- `@larkon/components/VectorMap` — present under `src/larkon-admin/components/VectorMap/` (9 files).
- `jsvectormap/dist/maps/*.js` — validated at 1.3.2 by `scripts/validate-jsvectormap-maps.mjs`.

No broken import errors during production build.

---

## Routes & layouts

- **395 routes** in production build manifest.
- **57 layout files** under `app/` — panel-specific `(larkon)` route groups wrap WowDash/Larkon shells.
- **Proxy middleware** active (`ƒ Proxy (Middleware)` in build output).
- Extensive **redirects/rewrites** in `next.config.js` for Turbopack nested-route stability (staff clinic, inventory, warehouse GRN, doctors, supply requests).

---

## Production deployment checklist

| Item | Status |
|------|--------|
| `npm run build` succeeds | ✅ |
| Env vars documented (`.env.example`) | ✅ |
| Env vars set on server | ⚠️ Manual |
| API proxy targets backend `:3000` not panel ports | ✅ (guarded in code) |
| Image remote patterns for prod API | ❌ Issue #7 |
| `npm run lint` | ✅ (relaxed policy) |
| `npm run typecheck` after clean build | ✅ |
| Security audit clean | ⚠️ Issue #6 |
| Single-process `next start -p 3100` or process manager | Document deploy |
| Post-deploy panel smoke (8 prefixes) | Recommend |

---

## Recommended fix priority

| Priority | Issue | Effort |
|----------|-------|--------|
| P0 | #1 tsconfig `.next` includes | Small — config-only |
| P1 | #7 production image domains | Small — env-driven config |
| P1 | #6 quill XSS exposure review | Medium — usage audit + CSP |
| P2 | #4 dev:all / cache documentation | Small — docs + discipline |
| P2 | #5 validate:build script ordering | Small — script/CI change |
| P3 | #2 JSX → TS migration | Large — ongoing |
| P3 | #3 lint debt re-enablement | Large — incremental |

---

## Related audit documents

- `docs/audits/BUILD_RECOVERY_AUDIT.md`
- `docs/audits/LINT_CLASSIFICATION_REPORT.md`
- `docs/audits/PRODUCTION_BUILD_VERIFICATION.md`
- `docs/TYPESCRIPT_GENERATED_ARTIFACTS.md`
- `docs/BPA_STANDARD.md` (ports 3100–3107)

---

**Audit completed:** 2026-06-06  
**Code modified:** None (report only)
