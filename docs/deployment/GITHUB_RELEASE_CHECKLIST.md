# GitHub Release Checklist — bpa_web

Use this checklist before tagging a release or merging to the production branch. All gates must pass locally (or in CI) before push.

## Pre-release environment

- [ ] Node.js **v22.x** (matches CI / production runtime)
- [ ] Clean install: `npm ci` (or `npm install` for local dev)
- [ ] Copy `.env.example` → `.env.local` and set required values (never commit secrets)
- [ ] Backend API reachable at `API_BASE_URL` / `NEXT_PUBLIC_API_BASE_URL`

## Required validation gates

Run in order from repo root (`D:\BPA_Data\bpa_web`):

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Production deploy pipeline (lint + typecheck + build + panel validation):

```bash
npm run deploy:build
```

Optional extended pipeline (recommended before major releases):

```bash
npm run validate:build
```

| Gate | Command | Expected |
|------|---------|----------|
| Lint | `npm run lint` | Exit 0, zero warnings |
| TypeScript | `npx tsc --noEmit` | Exit 0 |
| Production build | `npm run build` | Exit 0, all panel routes compiled |
| Panel routes | `npm run validate:panels` | Exit 0 (included in `validate:build`) |

## Secrets and artifacts — must NOT be committed

Confirm with `git status` and `git check-ignore`:

| Path / pattern | Status |
|----------------|--------|
| `.env`, `.env.local`, `.env*.local` | Ignored — secrets |
| `node_modules/` | Ignored |
| `.next/`, `.next-*`, `/out/`, `/build` | Ignored — build output |
| `*.log`, `/logs/` | Ignored |
| Validation scratch (`build-*.txt`, `lint-*.json`, etc.) | Ignored |

Verify nothing sensitive is tracked:

```bash
git ls-files .env .env.local node_modules .next
# (should return nothing)
```

## Fixed ports (do not change)

| Service | Port |
|---------|------|
| API (backend-api) | 3000 |
| Next.js panels | 3100–3107 |

Production serves a **single** `.next` build; dev uses per-panel ports via `SITE_MODE`.

## Release steps

1. [ ] Pull latest from base branch and resolve conflicts
2. [ ] Run all validation gates (above)
3. [ ] Review `git diff` — no accidental `.env`, build artifacts, or temp logs
4. [ ] Update version in `package.json` if semver release
5. [ ] Commit with clear message; open PR if team process requires review
6. [ ] **After merge:** deploy from clean `npm ci && npm run build`
7. [ ] Smoke-test critical paths: login, owner/staff POS, admin, API proxy (`/api/v1/*`)

## Post-deploy smoke tests

- [ ] `/` and panel entry routes load (3100 mother in dev; prod URL as configured)
- [ ] Auth login/logout for at least one panel (owner, staff, admin)
- [ ] Image uploads / remote images (requires `API_BASE_URL` in `next.config.js` remotePatterns)
- [ ] No console errors on dashboard load

## Known non-blocking debt

Documented in `docs/audits/` — does not block release if gates pass:

- Legacy Larkon JS files outside strict `tsc` scope
- ESLint policy excludes `src/larkon-admin/**`, `src/larkon-ui/**`
- `react-leaflet` peer dependency on React 19 (legacy-peer-deps)
- npm audit items (Quill, etc.) — track separately

## Rollback

- Redeploy previous known-good artifact / commit
- Run `npm run clean:workspace` before rebuild if Turbopack/webpack cache issues appear

---

**Last verified:** 2026-06-06 — lint, tsc, and production build passing.
