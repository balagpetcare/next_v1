# Production Build Verification — BPA Web

**Date:** 2026-06-06  
**Environment:** Windows 10, Node v22.22.0  
**Command:** `npm run build`  

---

## Build summary

| Metric | Value |
|--------|-------|
| Next.js version | 16.2.7 (Turbopack) |
| Compile time | ~104s |
| TypeScript check | ~79s (Next internal) |
| Static pages generated | **395 / 395** |
| Exit code | **0** |
| Output directory | `.next/` |

### Experiments enabled

- `turbopackClientSideNestedAsyncChunking: true`

### Build artifacts verified

| File | Present |
|------|---------|
| `.next/build-manifest.json` | Yes |
| `.next/routes-manifest.json` | Yes |
| `.next/app-path-routes-manifest.json` | Yes |
| `.next/BUILD_ID` | Yes (`sPxOqdVJEpF72vJLBWtDY`) |

No missing manifest errors. No module resolution failures. No Turbopack runtime errors during production build.

---

## Validation pipeline

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| 1 | `npm run typecheck` | 0 | `tsc --noEmit` |
| 2 | `npm run build` | 0 | Full production compile |
| 3 | `npm run validate:panels` | 0 | 8 panels + auth login routes |
| 4 | `npm run validate:build` | 0 | Aliases, jsvectormap 1.3.2, prod dep resolution |
| 5 | `npm run lint` | **1** | **Blocked** — see warnings below |

---

## Panel coverage (from manifest)

All required panels registered in production build:

- **Admin** — `/admin/*` (incl. `/admin/login`)
- **Owner** — `/owner/*` (incl. `/owner/login`)
- **Clinic** — `/clinic/*` (incl. `/clinic/login`)
- **Doctor** — `/doctor/*` (incl. `/doctor/login`)
- **Producer** — `/producer/*` (incl. `/producer/login`)
- **Country** — `/country/*` (incl. `/country/login`)
- **Mother** — `/mother`, `/` (public landing)
- **Shop** — `/shop/*` (incl. `/shop/login`)

Shared auth: `/auth/login`

---

## Warnings (non-blocking for build)

### npm audit

`npm audit` reports 4 vulnerabilities (2 low, 2 moderate). Not addressed in this recovery pass.

### npm deprecated packages (during `validate:build`)

- `lodash.isequal@4.5.0`
- `recharts@2.15.4` (2.x branch inactive)

### Peer dependency warnings

- `react-leaflet@4.x` expects React 18; project uses React 19 — runtime works, peers warn.

### Next.js build notice

During build, Next.js suggested adding `.next/types/**/*.ts` to `tsconfig.json`. Project policy (`docs/TYPESCRIPT_GENERATED_ARTIFACTS.md`) intentionally excludes `.next/**` from standalone `tsc`; **no action taken**.

### ESLint (blocking for deployment gate defined in audit mission)

```
✖ 2180 problems (1098 errors, 1082 warnings)
```

Lint must pass before the audit mission allows `git push origin main`.

---

## API / proxy verification

| Endpoint | Response | Interpretation |
|----------|----------|----------------|
| `http://localhost:3000/api/v1/auth/me` | 401 JSON | Backend alive; auth enforced |
| Next proxy `app/api/v1/[[...path]]/route.js` | Configured | Forwards to `localhost:3000` |

---

## Deployment readiness

| Criterion | Ready? |
|-----------|--------|
| `npm run build` succeeds | **Yes** |
| Production manifests generated | **Yes** |
| All panel routes in build | **Yes** |
| `npm ci --omit=dev` + build deps | **Yes** (via `validate:build`) |
| `npm run typecheck` | **Yes** |
| `npm run lint` | **No** |
| Runtime smoke (all 8 dev panels) | **Not run** (avoid Turbopack race) |

### Recommendation

**Production build is deployable** from a compile/manifest perspective.  
**Git push is deferred** until ESLint passes or team accepts a scoped lint policy.

Suggested VPS deploy sequence:

```bash
npm ci --omit=dev
npm run build
npm run start   # or process manager on port 3100
```

For multi-panel local dev after deploy testing:

```bash
npm run clean:workspace
npm run dev:admin   # one panel at a time when debugging Turbopack
```

---

## Build output excerpt

```
▲ Next.js 16.2.7 (Turbopack)
✓ Compiled successfully in 104s
  Finished TypeScript in 79s ...
✓ Generating static pages using 7 workers (395/395) in 2.5s
  Finalizing page optimization ...

Route (app) — 395 routes including all panel prefixes
ƒ Proxy (Middleware)
```

Full stdout captured locally in `build-output.txt` (not committed).

---

**Verification completed:** 2026-06-06  
**Push status:** Not pushed (lint gate failed)
